import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:flutter_map/flutter_map.dart' as flutter_map;
import 'package:latlong2/latlong.dart' as latlong;
import 'package:intl/intl.dart';

import '../../core/api.dart';
import '../../core/encoding_utils.dart';
import '../../core/icon_utils.dart';
import '../../core/map_utils.dart';
import '../../core/theme/app_colors.dart';
import '../../core/geocoding.dart';
import '../../core/date_utils.dart';

// ─── Period Enum ───────────────────────────────────────────────────────────
enum _Period { last1h, today, yesterday, custom }

// ─── HistoryPage ───────────────────────────────────────────────────────────
class HistoryPage extends StatefulWidget {
  final Map<dynamic, dynamic> device;

  const HistoryPage({super.key, required this.device});

  @override
  State<HistoryPage> createState() => _HistoryPageState();
}

class _HistoryPageState extends State<HistoryPage> {
  // Map controllers
  final Completer<GoogleMapController> _mapController = Completer();
  final flutter_map.MapController _flutterMapController = flutter_map.MapController();
  bool _useFlutterMap = false;
  bool _isMapDisposed = false;
  Timer? _googleMapTimeout;

  // Period
  _Period _selectedPeriod = _Period.today;
  late DateTime _from;
  late DateTime _to;

  // Data
  bool _isLoading = true;
  List<Map<String, dynamic>> _positions = [];
  List<Map<String, dynamic>> _stops = [];
  final Map<int, String> _stopAddresses = {};

  // Selected information for floating info card
  Map<String, dynamic>? _selectedPoint;
  String? _selectedPointAddress;
  int? _selectedStopIndex;

  // Map elements
  Set<Marker> _markers = {};
  Set<Polyline> _polylines = {};
  BitmapDescriptor? _stopIcon;
  BitmapDescriptor? _arrowIcon;
  BitmapDescriptor? _vehicleIcon;
  MapType _mapType = MapType.normal;
  bool _showMapTypeSelector = false;

  // DraggableScrollableController for stop panel
  final DraggableScrollableController _panelController = DraggableScrollableController();

  @override
  void initState() {
    super.initState();
    _applyPeriod(_Period.today);
    _loadIcons();
    _fetchHistory();

    _googleMapTimeout = Timer(const Duration(seconds: 3), () {
      if (mounted && !_useFlutterMap) {
        setState(() => _useFlutterMap = true);
      }
    });
  }

  @override
  void dispose() {
    _googleMapTimeout?.cancel();
    _panelController.dispose();
    _isMapDisposed = true;
    super.dispose();
  }

  // ─── Period helpers ────────────────────────────────────────────────────
  void _applyPeriod(_Period period) {
    final now = DateTime.now();
    switch (period) {
      case _Period.last1h:
        _from = now.subtract(const Duration(hours: 1));
        _to = now;
        break;
      case _Period.today:
        _from = DateTime(now.year, now.month, now.day);
        _to = now;
        break;
      case _Period.yesterday:
        final yesterday = now.subtract(const Duration(days: 1));
        _from = DateTime(yesterday.year, yesterday.month, yesterday.day);
        _to = DateTime(yesterday.year, yesterday.month, yesterday.day, 23, 59, 59);
        break;
      case _Period.custom:
        break; // date range picker will set _from/_to
    }
    setState(() => _selectedPeriod = period);
  }

  Future<void> _pickCustomRange() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now(),
      initialDateRange: DateTimeRange(start: _from, end: _to),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: ColorScheme.light(primary: AppColors.primaryColor),
        ),
        child: child!,
      ),
    );
    if (picked != null && mounted) {
      setState(() {
        _selectedPeriod = _Period.custom;
        _from = picked.start;
        _to = DateTime(picked.end.year, picked.end.month, picked.end.day, 23, 59, 59);
      });
      _fetchHistory();
    }
  }

  // ─── Icons ─────────────────────────────────────────────────────────────
  Future<void> _loadIcons() async {
    try {
      final ByteData data = await rootBundle.load('assets/images/route-stop.png');
      final codec = await ui.instantiateImageCodec(data.buffer.asUint8List(), targetWidth: 60);
      final frame = await codec.getNextFrame();
      final byteData = await frame.image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData != null) {
        _stopIcon = BitmapDescriptor.fromBytes(byteData.buffer.asUint8List());
      }
    } catch (_) {
      _stopIcon = BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed);
    }

    // Direction arrow
    _arrowIcon = await _buildArrowIcon();

    // Vehicle icon (same as device_map_page)
    await _loadVehicleIcon();

    if (mounted) setState(() {});
  }

  Future<void> _loadVehicleIcon() async {
    try {
      final category = widget.device['category']?.toString();
      final status = widget.device['status']?.toString() ?? 'unknown';
      final iconPath = MapUtils.getMarkerIconPath(category, status);
      final isTag = getCategoryIconName(category) == 'tag';
      final int targetWidth = isTag ? 200 : 100;
      final ByteData data = await rootBundle.load(iconPath);
      final codec = await ui.instantiateImageCodec(data.buffer.asUint8List(), targetWidth: targetWidth);
      final frame = await codec.getNextFrame();
      final byteData = await frame.image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData != null) {
        _vehicleIcon = BitmapDescriptor.fromBytes(byteData.buffer.asUint8List());
      }
    } catch (_) {
      _vehicleIcon = BitmapDescriptor.defaultMarker;
    }
  }

  Future<BitmapDescriptor> _buildArrowIcon() async {
    const size = 24.0;
    final pictureRecorder = ui.PictureRecorder();
    final canvas = Canvas(pictureRecorder);
    final paint = Paint()
      ..color = const Color(0xFFFF7043)
      ..style = PaintingStyle.fill;
    final path = Path()
      ..moveTo(size / 2, 0)
      ..lineTo(size, size)
      ..lineTo(size / 2, size * 0.7)
      ..lineTo(0, size)
      ..close();
    canvas.drawPath(path, paint);
    final img = await pictureRecorder.endRecording().toImage(size.toInt(), size.toInt());
    final bytes = await img.toByteData(format: ui.ImageByteFormat.png);
    return BitmapDescriptor.fromBytes(bytes!.buffer.asUint8List());
  }

  // ─── Fetch history ─────────────────────────────────────────────────────
  Future<void> _fetchHistory() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _positions = [];
      _stops = [];
      _markers = {};
      _polylines = {};
      _selectedPoint = null;
      _selectedStopIndex = null;
    });

    final to = _to.isAfter(DateTime.now()) ? DateTime.now() : _to;
    final fmt = DateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
    final fromStr = fmt.format(_from.toUtc());
    final toStr = fmt.format(to.toUtc());
    final int deviceId = widget.device['id'];

    try {
      final response = await Api().get('/positions?deviceId=$deviceId&from=$fromStr&to=$toStr');
      if (response.statusCode == 200) {
        final data = (jsonDecode(response.body) as List).cast<Map<String, dynamic>>();
        setState(() {
          _positions = data;
          _isLoading = false;
        });
        _buildPolylineAndArrows();
        _computeStops();
      } else {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ─── Polyline & direction arrows ───────────────────────────────────────
  void _buildPolylineAndArrows() {
    if (_positions.isEmpty) return;

    final routePoints = _positions
        .map((p) => LatLng((p['latitude'] as num).toDouble(), (p['longitude'] as num).toDouble()))
        .toList();

    final polyline = Polyline(
      polylineId: const PolylineId('history_route'),
      points: routePoints,
      width: 6,
      color: const Color(0xFF00E5FF), // vibrant cyan
      patterns: [],
    );

    final arrows = _buildArrowMarkers();
    final vehicleMarker = _buildVehicleMarker();

    setState(() {
      _polylines = {polyline};
      _markers = {..._markers, ...arrows, if (vehicleMarker != null) vehicleMarker};
    });
    // Fit bounds after data is ready (whether map was already ready or not)
    Future.delayed(const Duration(milliseconds: 300), _fitBounds);
  }

  /// Coloca o ícone do veículo (igual ao mapa principal) no último ponto da rota.
  Marker? _buildVehicleMarker() {
    if (_vehicleIcon == null || _positions.isEmpty) return null;
    final last = _positions.last;
    final lat = (last['latitude'] as num).toDouble();
    final lon = (last['longitude'] as num).toDouble();
    final course = (last['course'] as num? ?? 0).toDouble();
    return Marker(
      markerId: const MarkerId('vehicle_last'),
      position: LatLng(lat, lon),
      icon: _vehicleIcon!,
      rotation: course,
      anchor: const Offset(0.5, 0.5),
      flat: true,
      zIndex: 20,
      onTap: () => _selectPoint(last),
    );
  }

  /// Calcula o bearing (azimute) entre dois pontos geográficos em graus (0° = Norte).
  double _bearingBetween(double lat1, double lon1, double lat2, double lon2) {
    final dLon = (lon2 - lon1) * math.pi / 180;
    final y = math.sin(dLon) * math.cos(lat2 * math.pi / 180);
    final x = math.cos(lat1 * math.pi / 180) * math.sin(lat2 * math.pi / 180) -
        math.sin(lat1 * math.pi / 180) * math.cos(lat2 * math.pi / 180) * math.cos(dLon);
    return (math.atan2(y, x) * 180 / math.pi + 360) % 360;
  }

  Set<Marker> _buildArrowMarkers() {
    if (_arrowIcon == null || _positions.length < 2) return {};
    final arrows = <Marker>{};
    final interval = (_positions.length / 60).clamp(1, 8).toInt();

    for (int i = interval; i < _positions.length - 1; i += interval) {
      final p = _positions[i];
      final next = _positions[i + 1];
      final lat = (p['latitude'] as num).toDouble();
      final lon = (p['longitude'] as num).toDouble();
      final nextLat = (next['latitude'] as num).toDouble();
      final nextLon = (next['longitude'] as num).toDouble();

      // Calcula a direção real entre o ponto atual e o próximo,
      // independente do campo 'course' vindo da API.
      final bearing = _bearingBetween(lat, lon, nextLat, nextLon);

      arrows.add(Marker(
        markerId: MarkerId('arrow_$i'),
        position: LatLng(lat, lon),
        icon: _arrowIcon!,
        rotation: bearing,
        anchor: const Offset(0.5, 0.5),
        flat: true,
        zIndex: 1,
        onTap: () => _selectPoint(_positions[i]),
      ));
    }
    return arrows;
  }

  // ─── Stop computation (same algorithm as ReplayPage) ───────────────────
  void _computeStops() {
    const double stopSpeedThreshold = 2.0;
    const Duration minStopDuration = Duration(minutes: 2);

    final stops = <Map<String, dynamic>>[];
    int startIdx = -1;
    DateTime? startTime;

    DateTime? parseTime(Map p) {
      try {
        final t = (p['deviceTime'] ?? p['fixTime'] ?? p['serverTime']) as String?;
        return t != null ? DateTime.parse(t) : null;
      } catch (_) {
        return null;
      }
    }

    double kmhOf(Map p) {
      try {
        return ((p['speed'] ?? 0) as num).toDouble() * 1.853;
      } catch (_) {
        return 0.0;
      }
    }

    for (int i = 0; i < _positions.length; i++) {
      final p = _positions[i];
      final kmh = kmhOf(p);
      final t = parseTime(p);

      if (kmh <= stopSpeedThreshold) {
        if (startIdx == -1) {
          startIdx = i;
          startTime = t;
        }
      } else {
        if (startIdx != -1 && startTime != null && t != null) {
          final duration = t.difference(startTime!);
          if (duration >= minStopDuration) {
            final midIdx = (startIdx + i - 1) ~/ 2;
            final mp = _positions[midIdx];
            stops.add({
              'lat': (mp['latitude'] as num).toDouble(),
              'lng': (mp['longitude'] as num).toDouble(),
              'startTime': startTime,
              'endTime': t,
              'duration': duration,
              'startIndex': startIdx,
              'endIndex': i,
              'positionData': mp,
            });
          }
        }
        startIdx = -1;
        startTime = null;
      }
    }

    setState(() => _stops = stops);
    _buildStopMarkers();
  }

  void _buildStopMarkers() {
    if (_stopIcon == null) return;
    final stopMarkers = <Marker>{};
    for (int i = 0; i < _stops.length; i++) {
      final stop = _stops[i];
      stopMarkers.add(Marker(
        markerId: MarkerId('stop_$i'),
        position: LatLng(stop['lat'] as double, stop['lng'] as double),
        icon: _stopIcon!,
        zIndex: 10,
        onTap: () => _selectStop(i),
      ));
    }
    setState(() {
      _markers = {..._markers.where((m) => !m.markerId.value.startsWith('stop_')), ...stopMarkers};
    });
  }

  // ─── Selection ─────────────────────────────────────────────────────────
  void _selectPoint(Map<String, dynamic> position) {
    setState(() {
      _selectedPoint = position;
      _selectedStopIndex = null;
      _selectedPointAddress = null;
    });
    final lat = (position['latitude'] as num).toDouble();
    final lon = (position['longitude'] as num).toDouble();
    _loadAddress(lat, lon);
    _animateCamera(LatLng(lat, lon));
  }

  void _selectStop(int index) {
    final stop = _stops[index];
    setState(() {
      _selectedStopIndex = index;
      _selectedPoint = stop['positionData'] as Map<String, dynamic>?;
      _selectedPointAddress = _stopAddresses[index];
    });
    final lat = stop['lat'] as double;
    final lon = stop['lng'] as double;
    if (_selectedPointAddress == null) {
      _loadAddressForStop(index, lat, lon);
    }
    _animateCamera(LatLng(lat, lon));
  }

  Future<void> _loadAddress(double lat, double lon) async {
    try {
      final addr = await Geocoding.reverseGeocode(lat, lon);
      if (mounted) setState(() => _selectedPointAddress = addr);
    } catch (_) {}
  }

  Future<void> _loadAddressForStop(int index, double lat, double lon) async {
    try {
      final addr = await Geocoding.reverseGeocode(lat, lon);
      if (mounted) {
        _stopAddresses[index] = addr;
        setState(() => _selectedPointAddress = addr);
      }
    } catch (_) {}
  }

  Future<void> _animateCamera(LatLng target) async {
    if (!_mapController.isCompleted || _isMapDisposed) return;
    try {
      final c = await _mapController.future;
      c.animateCamera(CameraUpdate.newLatLng(target));
    } catch (_) {}
  }

  // ─── Helpers ───────────────────────────────────────────────────────────
  String _formatDuration(Duration d) {
    if (d.inHours > 0) return '${d.inHours}h ${d.inMinutes % 60}m';
    if (d.inMinutes > 0) return '${d.inMinutes}m';
    return '${d.inSeconds}s';
  }

  String _formatTime(dynamic t) {
    return AppDateUtils.formatDateTime(t);
  }

  String _convertSpeed(dynamic speed) {
    if (speed == null) return '0 km/h';
    return '${((speed as num).toDouble() * 1.852).toStringAsFixed(0)} km/h';
  }

  LatLng get _initialCenter {
    if (_positions.isNotEmpty) {
      final p = _positions.first;
      return LatLng((p['latitude'] as num).toDouble(), (p['longitude'] as num).toDouble());
    }
    return const LatLng(-14.235, -51.925);
  }

  // ─── BUILD ─────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final deviceName = EncodingUtils.fixEncoding(widget.device['name'] ?? 'Dispositivo');

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: AppColors.primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text(deviceName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: _buildPeriodBar(),
        ),
      ),
      body: Stack(
        children: [
          // ── Map ──────────────────────────────────────────────────────
          _buildMap(),

          // ── Loading Overlay ──────────────────────────────────────────
          if (_isLoading)
            Container(
              color: Colors.black54,
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: Color(0xFF00E5FF)),
                    SizedBox(height: 16),
                    Text('Carregando histórico...', style: TextStyle(color: Colors.white)),
                  ],
                ),
              ),
            ),

          // ── Empty State ───────────────────────────────────────────────
          if (!_isLoading && _positions.isEmpty)
            Center(
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.route, size: 64, color: Colors.grey),
                    SizedBox(height: 12),
                    Text('Nenhuma posição encontrada', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    SizedBox(height: 4),
                    Text('Tente outro período de busca', style: TextStyle(color: Colors.grey)),
                  ],
                ),
              ),
            ),

          // ── Floating Info Card ────────────────────────────────────────
          if (_selectedPoint != null || _selectedStopIndex != null)
            _buildInfoCard(),

          // ── Stop List Panel ───────────────────────────────────────────
          if (!_isLoading && _stops.isNotEmpty)
            _buildStopPanel(),

          // ── Stats Bar (top) ───────────────────────────────────────────
          if (!_isLoading && _positions.isNotEmpty)
            _buildStatsBar(),

          // ── Map Controls (right side) ─────────────────────────────────
          if (!_isLoading && _positions.isNotEmpty)
            _buildMapControls(),
        ],
      ),
    );
  }

  // ─── Period Bar ────────────────────────────────────────────────────────
  Widget _buildPeriodBar() {
    return Container(
      color: AppColors.primaryColor,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        children: [
          _periodChip(_Period.last1h, '1h'),
          const SizedBox(width: 6),
          _periodChip(_Period.today, 'Hoje'),
          const SizedBox(width: 6),
          _periodChip(_Period.yesterday, 'Ontem'),
          const SizedBox(width: 6),
          _periodChip(_Period.custom, _selectedPeriod == _Period.custom
              ? '${DateFormat('dd/MM').format(_from)} - ${DateFormat('dd/MM').format(_to)}'
              : 'Personalizado'),
        ],
      ),
    );
  }

  Widget _periodChip(_Period period, String label) {
    final isActive = _selectedPeriod == period;
    return GestureDetector(
      onTap: () {
        if (period == _Period.custom) {
          _pickCustomRange();
        } else {
          _applyPeriod(period);
          _fetchHistory();
        }
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isActive ? Colors.white : Colors.white.withAlpha(50),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isActive ? Colors.white : Colors.white.withAlpha(100)),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: isActive ? AppColors.primaryColor : Colors.white,
          ),
        ),
      ),
    );
  }

  // ─── Stats Bar ─────────────────────────────────────────────────────────
  Widget _buildStatsBar() {
    final totalPoints = _positions.length;
    final stopCount = _stops.length;
    final totalDist = _calculateTotalDistanceKm();
    return Positioned(
      top: 8,
      left: 8,
      right: 8,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.black.withAlpha(180),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _statItem(Icons.place, '$totalPoints pts'),
            _statItem(Icons.stop_circle_outlined, '$stopCount paradas'),
            _statItem(Icons.route, '${totalDist.toStringAsFixed(1)} km'),
          ],
        ),
      ),
    );
  }

  Widget _statItem(IconData icon, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: const Color(0xFF00E5FF), size: 16),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
      ],
    );
  }

  double _calculateTotalDistanceKm() {
    if (_positions.length < 2) return 0;
    double total = 0;
    for (int i = 1; i < _positions.length; i++) {
      final a = _positions[i - 1];
      final b = _positions[i];
      final lat1 = (a['latitude'] as num).toDouble();
      final lon1 = (a['longitude'] as num).toDouble();
      final lat2 = (b['latitude'] as num).toDouble();
      final lon2 = (b['longitude'] as num).toDouble();
      total += _haversineKm(lat1, lon1, lat2, lon2);
    }
    return total;
  }

  double _haversineKm(double lat1, double lon1, double lat2, double lon2) {
    const R = 6371.0;
    final dLat = (lat2 - lat1) * math.pi / 180;
    final dLon = (lon2 - lon1) * math.pi / 180;
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(lat1 * math.pi / 180) * math.cos(lat2 * math.pi / 180) *
        math.sin(dLon / 2) * math.sin(dLon / 2);
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
  }

  // ─── Map ───────────────────────────────────────────────────────────────
  Widget _buildMap() {
    if (_useFlutterMap) return _buildFlutterMap();

    final center = _positions.isNotEmpty ? _initialCenter : const LatLng(-14.235, -51.925);

    return GoogleMap(
      mapType: _mapType,
      initialCameraPosition: CameraPosition(target: center, zoom: 14),
      markers: _markers,
      polylines: _polylines,
      onMapCreated: (c) {
        _googleMapTimeout?.cancel();
        _isMapDisposed = false;
        if (!_mapController.isCompleted) _mapController.complete(c);
        // Fit bounds - data may or may not be ready yet
        Future.delayed(const Duration(milliseconds: 600), _fitBounds);
      },
      onTap: (_) => setState(() {
        _selectedPoint = null;
        _selectedStopIndex = null;
      }),
      zoomControlsEnabled: false,
      myLocationButtonEnabled: false,
      compassEnabled: true,
    );
  }

  Widget _buildFlutterMap() {
    final points = _positions
        .map((p) => latlong.LatLng((p['latitude'] as num).toDouble(), (p['longitude'] as num).toDouble()))
        .toList();

    final center = points.isNotEmpty ? points.first : const latlong.LatLng(-14.235, -51.925);

    return flutter_map.FlutterMap(
      mapController: _flutterMapController,
      options: flutter_map.MapOptions(
        initialCenter: center,
        initialZoom: 14,
        onTap: (_, __) => setState(() {
          _selectedPoint = null;
          _selectedStopIndex = null;
        }),
      ),
      children: [
        flutter_map.TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.example.kn_005',
        ),
        if (points.length >= 2)
          flutter_map.PolylineLayer(
            polylines: [
              flutter_map.Polyline(
                points: points,
                strokeWidth: 6,
                color: const Color(0xFF00E5FF),
              ),
            ],
          ),
        flutter_map.MarkerLayer(
          markers: _stops.asMap().entries.map((entry) {
            final i = entry.key;
            final stop = entry.value;
            return flutter_map.Marker(
              point: latlong.LatLng(stop['lat'] as double, stop['lng'] as double),
              width: 36,
              height: 36,
              child: GestureDetector(
                onTap: () => _selectStop(i),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.red,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                    boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 4)],
                  ),
                  child: const Center(
                    child: Text('STOP', style: TextStyle(color: Colors.white, fontSize: 7, fontWeight: FontWeight.bold)),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Future<void> _fitBounds() async {
    if (_positions.isEmpty || _isMapDisposed || !_mapController.isCompleted) return;
    try {
      double? minLat, maxLat, minLon, maxLon;
      for (final p in _positions) {
        final lat = (p['latitude'] as num).toDouble();
        final lon = (p['longitude'] as num).toDouble();
        if (minLat == null) {
          minLat = maxLat = lat;
          minLon = maxLon = lon;
        } else {
          if (lat < minLat) minLat = lat;
          if (lat > maxLat!) maxLat = lat;
          if (lon < minLon!) minLon = lon;
          if (lon > maxLon!) maxLon = lon;
        }
      }
      if (minLat == null) return;
      final controller = await _mapController.future;
      controller.animateCamera(CameraUpdate.newLatLngBounds(
        LatLngBounds(
          southwest: LatLng(minLat, minLon!),
          northeast: LatLng(maxLat!, maxLon!),
        ),
        80,
      ));
    } catch (_) {}
  }

  // ─── Floating Info Card ────────────────────────────────────────────────
  Widget _buildInfoCard() {
    final point = _selectedPoint;
    final isStop = _selectedStopIndex != null;
    final stop = isStop ? _stops[_selectedStopIndex!] : null;
    final attrs = (point?['attributes'] ?? {}) as Map<dynamic, dynamic>;
    final speed = _convertSpeed(point?['speed']);
    final ignition = attrs['ignition'] == true ? 'Ligada' : 'Desligada';
    final blocked = attrs['blocked'] == true ? 'Bloqueado' : 'Desbloqueado';

    String timeLabel = '';
    if (isStop && stop != null) {
      final sf = DateFormat('HH:mm:ss');
      timeLabel = '${sf.format((stop['startTime'] as DateTime).toLocal())} → ${sf.format((stop['endTime'] as DateTime).toLocal())} (${_formatDuration(stop['duration'] as Duration)})';
    } else if (point != null) {
      timeLabel = _formatTime(point['deviceTime'] ?? point['fixTime']);
    }

    return Positioned(
      left: 12,
      right: 12,
      bottom: _stops.isNotEmpty ? 200 : 30,
      child: Material(
        color: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 12, offset: Offset(0, 4))],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header row
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    isStop ? Icons.stop_circle : Icons.location_on,
                    color: isStop ? Colors.red : AppColors.primaryColor,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _selectedPointAddress ?? 'Carregando endereço...',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                      maxLines: 2,
                    ),
                  ),
                  GestureDetector(
                    onTap: () => setState(() {
                      _selectedPoint = null;
                      _selectedStopIndex = null;
                    }),
                    child: const Icon(Icons.close, size: 20, color: Colors.grey),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              // Info chips row
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  _infoChip(Icons.access_time, timeLabel),
                  _infoChip(Icons.speed, speed),
                  _infoChip(Icons.key, ignition),
                  _infoChip(Icons.lock_open, blocked),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _infoChip(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: Colors.grey.shade700),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade800, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  // ─── Stop Panel ────────────────────────────────────────────────────────
  Widget _buildStopPanel() {
    return DraggableScrollableSheet(
      controller: _panelController,
      initialChildSize: 0.22,
      minChildSize: 0.1,
      maxChildSize: 0.55,
      snap: true,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 12, offset: Offset(0, -4))],
          ),
          child: Column(
            children: [
              // Handle
              Container(
                margin: const EdgeInsets.symmetric(vertical: 10),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: Row(
                  children: [
                    const Icon(Icons.stop_circle, color: Colors.red, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      '${_stops.length} Parada${_stops.length != 1 ? 's' : ''}',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const Spacer(),
                    Text(
                      '${_positions.length} posições',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              // List
              Expanded(
                child: ListView.builder(
                  controller: scrollController,
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  itemCount: _stops.length,
                  itemBuilder: (ctx, i) {
                    // Reversed: most recent first
                    final idx = _stops.length - 1 - i;
                    return _buildStopListItem(idx);
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStopListItem(int index) {
    final stop = _stops[index];
    final isSelected = _selectedStopIndex == index;
    final startFmt = DateFormat('HH:mm').format((stop['startTime'] as DateTime).toLocal());
    final endFmt = DateFormat('HH:mm').format((stop['endTime'] as DateTime).toLocal());
    final dur = _formatDuration(stop['duration'] as Duration);
    final address = _stopAddresses[index];

    return GestureDetector(
      onTap: () => _selectStop(index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primaryColor.withAlpha(20) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppColors.primaryColor : Colors.grey.shade200,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            // Number badge
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primaryColor : Colors.red,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  '${index + 1}',
                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    address ?? 'Carregando...',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Icon(Icons.access_time, size: 11, color: Colors.grey.shade600),
                      const SizedBox(width: 3),
                      Text('$startFmt → $endFmt', style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                    ],
                  ),
                ],
              ),
            ),
            // Duration badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.orange.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.orange.shade300),
              ),
              child: Text(
                dur,
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.orange.shade800),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Map Controls (right side floating buttons) ───────────────────────
  Widget _buildMapControls() {
    return Positioned(
      right: 12,
      top: 180,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _mapControlButton(icon: Icons.summarize_outlined, tooltip: 'Resumo', onTap: _showSummarySheet),
          const SizedBox(height: 8),
          _mapControlButton(icon: Icons.fit_screen, tooltip: 'Ver percurso completo', onTap: _fitBounds),
          const SizedBox(height: 8),
          _buildMapTypeWidget(),
        ],
      ),
    );
  }

  Widget _mapControlButton({required IconData icon, required String tooltip, required VoidCallback onTap}) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: AppColors.primaryColor,
        elevation: 4,
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: Container(width: 44, height: 44, alignment: Alignment.center,
            child: Icon(icon, color: Colors.white, size: 22)),
        ),
      ),
    );
  }

  Widget _buildMapTypeWidget() {
    if (_showMapTypeSelector) {
      return AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
        decoration: BoxDecoration(
          color: AppColors.primaryColor,
          borderRadius: BorderRadius.circular(22),
          boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 6, offset: Offset(0, 2))],
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          _mapTypeChipV(Icons.chevron_right, null),
          _mapTypeChipV(Icons.map, MapType.normal),
          _mapTypeChipV(Icons.satellite_alt, MapType.satellite),
          _mapTypeChipV(Icons.satellite, MapType.hybrid),
        ]),
      );
    }
    return _mapControlButton(icon: Icons.layers, tooltip: 'Trocar tipo de mapa',
      onTap: () => setState(() => _showMapTypeSelector = true));
  }

  Widget _mapTypeChipV(IconData icon, MapType? type) {
    final isSelected = type != null && _mapType == type;
    return InkWell(
      onTap: () => setState(() { _showMapTypeSelector = false; if (type != null) _mapType = type; }),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: 44, height: 44,
        decoration: BoxDecoration(
          color: isSelected ? Colors.white.withAlpha(80) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
        ),
        alignment: Alignment.center,
        child: Icon(icon, color: Colors.white, size: 22),
      ),
    );
  }

  // ─── Summary Sheet ────────────────────────────────────────────────────
  void _showSummarySheet() {
    final totalDist = _calculateTotalDistanceKm();
    final maxSpeed = _positions.isEmpty ? 0.0
        : _positions.map((p) => ((p['speed'] ?? 0) as num).toDouble() * 1.852).reduce(math.max);
    final totalStops = _stops.length;
    final totalStopTime = _stops.fold<Duration>(Duration.zero,
        (acc, s) => acc + (s['duration'] as Duration));
    final startTime = _positions.isNotEmpty
        ? _formatTime(_positions.first['deviceTime'] ?? _positions.first['fixTime']) : '--';
    final endTime = _positions.isNotEmpty
        ? _formatTime(_positions.last['deviceTime'] ?? _positions.last['fixTime']) : '--';

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Icon(Icons.summarize_outlined, color: AppColors.primaryColor),
              const SizedBox(width: 8),
              const Text('Resumo do Percurso', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const Spacer(),
              const CloseButton(),
            ]),
            const Divider(height: 24),
            _summaryRow(Icons.access_time, 'Início', startTime),
            _summaryRow(Icons.flag, 'Fim', endTime),
            _summaryRow(Icons.route, 'Distância total', '${totalDist.toStringAsFixed(2)} km'),
            _summaryRow(Icons.speed, 'Vel. máxima', '${maxSpeed.toStringAsFixed(0)} km/h'),
            _summaryRow(Icons.stop_circle_outlined, 'Paradas', '$totalStops parada${totalStops != 1 ? 's' : ''}'),
            _summaryRow(Icons.hourglass_bottom, 'Tempo parado', _formatDuration(totalStopTime)),
            _summaryRow(Icons.pin_drop, 'Posições', '${_positions.length} pontos'),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _summaryRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(children: [
        Icon(icon, size: 18, color: AppColors.primaryColor),
        const SizedBox(width: 10),
        Text(label, style: TextStyle(fontSize: 13, color: Colors.grey.shade700)),
        const Spacer(),
        Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
      ]),
    );
  }
}
