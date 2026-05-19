import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { fleetActions, fetchFleetMap } from '../../store';
import { useThemeColors, useTheme as useAppTheme } from '../../common/components/ThemeProvider';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Search, Menu, MapPin, Gauge, Loader2 } from 'lucide-react';
import DeviceStatusIcons from '../../settings/components/DeviceStatusIcons';
import {
  formatSpeed,
  formatCoordinate,
  reverseGeocode,
} from '../../common/util/formatter';
import { mapIconKey, mapIcons } from '../../map/core/preloadImages';
import { vehicleTypeToIcon } from '../../common/util/vehicleTypeIcon';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// ─── LRU address cache (max 300 entries) ───────────────────────────────────
const MAX_ADDRESS_CACHE = 300;
const fleetAddressCache = new Map();
const pruneAddressCache = () => {
  if (fleetAddressCache.size > MAX_ADDRESS_CACHE) {
    const oldest = fleetAddressCache.keys().next().value;
    fleetAddressCache.delete(oldest);
  }
};

// ─── Geocode request queue (max 1 in-flight, 120ms between requests) ───────
let geocodeQueue = [];
let geocodeRunning = false;

const enqueueGeocode = (lat, lon, callback) => {
  const key = `${lat}_${lon}`;
  if (fleetAddressCache.has(key)) {
    callback(fleetAddressCache.get(key));
    return;
  }
  // Deduplicate: if already queued for same coords, just attach callback
  const existing = geocodeQueue.find((q) => q.key === key);
  if (existing) {
    existing.callbacks.push(callback);
    return;
  }
  geocodeQueue.push({ key, lat, lon, callbacks: [callback] });
  if (!geocodeRunning) drainGeocodeQueue();
};

const drainGeocodeQueue = () => {
  if (geocodeQueue.length === 0) {
    geocodeRunning = false;
    return;
  }
  geocodeRunning = true;
  const { key, lat, lon, callbacks } = geocodeQueue.shift();
  reverseGeocode(lat, lon)
    .then((addr) => {
      if (addr) {
        fleetAddressCache.set(key, addr);
        pruneAddressCache();
      }
      callbacks.forEach((cb) => cb(addr || null));
    })
    .catch(() => callbacks.forEach((cb) => cb(null)))
    .finally(() => setTimeout(drainGeocodeQueue, 120));
};

// ─── Hook: resolve address via queue ───────────────────────────────────────
const useResolvedAddress = (position) => {
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!position?.latitude || !position?.longitude) {
      setAddress(null);
      setLoading(false);
      return;
    }
    if (position.address?.trim()) {
      setAddress(null);
      setLoading(false);
      return;
    }
    const key = `${position.latitude}_${position.longitude}`;
    if (fleetAddressCache.has(key)) {
      setAddress(fleetAddressCache.get(key));
      setLoading(false);
      return;
    }
    setLoading(true);
    enqueueGeocode(position.latitude, position.longitude, (addr) => {
      if (mountedRef.current) {
        setAddress(addr);
        setLoading(false);
      }
    });
  }, [position?.latitude, position?.longitude]);

  return [address, loading];
};

// ─── Helpers ───────────────────────────────────────────────────────────────
const getCommunicationTimestamp = (device, position) => {
  const candidate = device?.lastUpdate || position?.serverTime || position?.deviceTime || position?.fixTime;
  if (!candidate) return null;
  const parsed = dayjs(candidate);
  return parsed.isValid() ? parsed : null;
};

const getFleetCardPalette = (isDark, colors) => {
  if (isDark) {
    return {
      cardBg: '#1f2937', cardBgHover: '#2d3748',
      cardBorder: colors.border ?? '#374151', cardBorderHover: '#4b5563',
      cardBorderSelected: '#3b82f6', cardBgSelected: '#1e3a5f',
      title: '#f9fafb', subtitle: '#9ca3af', meta: '#9ca3af',
      speed: '#e5e7eb', address: '#d1d5db',
      pinIcon: '#9ca3af', gaugeIcon: '#9ca3af',
      avatarBg: '#374151', shadow: '0 2px 4px rgba(0,0,0,0.2)',
      iconFilter: 'brightness(0) invert(1)',
    };
  }
  return {
    cardBg: colors.secondary ?? '#f3f4f6', cardBgHover: colors.hover ?? '#e5e7eb',
    cardBorder: colors.border ?? '#e5e7eb', cardBorderHover: colors.border ?? '#d1d5db',
    cardBorderSelected: '#3b82f6', cardBgSelected: '#eff6ff',
    title: colors.text ?? '#1f2937', subtitle: colors.textSecondary ?? '#6b7280',
    meta: colors.textSecondary ?? '#6b7280', speed: colors.text ?? '#374151',
    address: '#4b5563', pinIcon: '#6b7280', gaugeIcon: colors.textSecondary ?? '#6b7280',
    avatarBg: colors.secondary ?? '#e5e7eb', shadow: '0 1px 3px rgba(0,0,0,0.08)',
    iconFilter: 'brightness(0) saturate(100%) opacity(0.55)',
  };
};

const getStatusColor = (status) => {
  switch (status) {
    case 'online': return '#10B981';
    case 'offline': return '#EF4444';
    case 'unknown': return '#F59E0B';
    default: return '#6B7280';
  }
};

// ─── FleetRowItem ──────────────────────────────────────────────────────────
const FleetRowItem = ({ item, style, onClick, devices, positions, t, isSelected }) => {
  const colors = useThemeColors() || {};
  const { theme: appTheme } = useAppTheme();
  const isDark = appTheme === 'dark';
  const p = getFleetCardPalette(isDark, colors);

  const bestDeviceData = useMemo(() => {
    const ids = item.deviceIds || (item.devices?.map((d) => d.id)) || (item.device_id ? [item.device_id] : []);
    if (ids.length === 0) return null;
    const candidates = ids.map((id) => ({ device: devices[id], position: positions[id] })).filter((c) => c.device);
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => {
      const tA = getCommunicationTimestamp(a.device, a.position)?.valueOf() || 0;
      const tB = getCommunicationTimestamp(b.device, b.position)?.valueOf() || 0;
      return tB - tA;
    });
    return candidates[0];
  }, [item, devices, positions]);

  const device = bestDeviceData?.device;
  const position = bestDeviceData?.position;
  const [resolvedAddress, isResolvingAddress] = useResolvedAddress(position);

  const cardStyle = {
    display: 'flex', flexDirection: 'column', padding: '12px',
    backgroundColor: isSelected ? p.cardBgSelected : p.cardBg,
    borderRadius: '12px',
    border: `1px solid ${isSelected ? p.cardBorderSelected : p.cardBorder}`,
    cursor: 'pointer', minHeight: 0, boxSizing: 'border-box',
    gap: '8px', transition: 'all 0.15s ease',
    boxShadow: isSelected ? `0 0 0 2px ${p.cardBorderSelected}33` : p.shadow,
  };

  // No device fallback
  if (!device) {
    const iconKey = vehicleTypeToIcon(item.vehicle_type);
    const hasPhoto = item.foto_veiculo?.trim();
    return (
      <div style={style}>
        <div
          onClick={onClick}
          style={{ ...cardStyle, flexDirection: 'row', alignItems: 'center' }}
          onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = p.cardBorderHover; e.currentTarget.style.backgroundColor = p.cardBgHover; } }}
          onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = p.cardBorder; e.currentTarget.style.backgroundColor = p.cardBg; } }}
        >
          <div style={{ marginRight: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: p.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {hasPhoto
                ? <img src={`/api/vehicles/image/${item.foto_veiculo.replace(/^\/?uploads\//, '')}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <img src={mapIcons[mapIconKey(iconKey)]} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain', filter: p.iconFilter }} />}
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', color: p.title }}>{item.nickname || item.plate}</div>
            {(item.nickname ? item.plate : item.model) && <div style={{ fontSize: '11px', color: p.subtitle }}>{item.nickname ? item.plate : item.model}</div>}
            <div style={{ fontSize: '12px', color: p.meta }}>Sem rastreador</div>
          </div>
        </div>
      </div>
    );
  }

  const statusColor = getStatusColor(device.status);

  return (
    <div style={style}>
      <div
        onClick={onClick}
        style={cardStyle}
        onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = p.cardBorderHover; e.currentTarget.style.backgroundColor = p.cardBgHover; } }}
        onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = isSelected ? p.cardBorderSelected : p.cardBorder; e.currentTarget.style.backgroundColor = isSelected ? p.cardBgSelected : p.cardBg; } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: p.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            {item.foto_veiculo?.trim()
              ? <img src={`/api/vehicles/image/${item.foto_veiculo.replace(/^\/?uploads\//, '')}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <img src={mapIcons[mapIconKey(vehicleTypeToIcon(item.vehicle_type) || device?.category || 'default')]} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain', filter: p.iconFilter }} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: p.title, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.nickname || item.plate}
            </div>
            {(item.nickname ? item.plate : item.model) && (
              <div style={{ fontSize: '11px', color: p.subtitle, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.nickname ? item.plate : item.model}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusColor, flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: p.meta }}>
                {(() => { const ct = getCommunicationTimestamp(device, position); return ct ? ct.fromNow(true) : 'Sem dados'; })()}
              </span>
            </div>
          </div>
        </div>

        {position && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Gauge size={14} color={p.gaugeIcon} />
              <span style={{ fontSize: '12px', color: p.speed }}>{formatSpeed(position.speed, 'kmh', t)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={14} color={p.pinIcon} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: p.address, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {position.address?.trim() || resolvedAddress || (isResolvingAddress ? t('sharedLoading') : `${formatCoordinate('latitude', position.latitude)} ${formatCoordinate('longitude', position.longitude)}`)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', paddingLeft: '2px', flexShrink: 0, minHeight: '22px' }}>
              <DeviceStatusIcons position={position} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Status filter pills ───────────────────────────────────────────────────
const STATUS_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'online', label: 'Online', color: '#10B981' },
  { key: 'offline', label: 'Offline', color: '#EF4444' },
  { key: 'unknown', label: 'Indefinido', color: '#F59E0B' },
];

// ─── FloatingFleetList ─────────────────────────────────────────────────────
const FloatingFleetList = ({ desktop, isMenuExpanded, isVisible, onDrawerOpen }) => {
  const dispatch = useDispatch();
  const t = useTranslation();
  const colors = useThemeColors() || {};

  const { items, fleetMapLoading: loading } = useSelector((state) => state.fleet);
  const devices = useSelector((state) => state.devices.items);
  const positions = useSelector((state) => state.session.positions);
  const selectedPlate = useSelector((state) => state.fleet.selectedPlate);

  const surface = colors.surface ?? '#111827';
  const borderColor = colors.border ?? '#374151';
  const secondary = colors.secondary ?? '#1f2937';
  const text = colors.text ?? '#fff';
  const textSecondary = colors.textSecondary ?? '#9ca3af';

  // ── Search with debounce ──
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const debounceTimerRef = useRef(null);

  const handleKeywordChange = useCallback((e) => {
    const val = e.target.value;
    setKeyword(val);
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => setDebouncedKeyword(val), 280);
  }, []);

  useEffect(() => () => clearTimeout(debounceTimerRef.current), []);

  // ── Status filter ──
  const [statusFilter, setStatusFilter] = useState('all');
  const [mobileFleetExpanded, setMobileFleetExpanded] = useState(false);

  const onMobileFleetPanEnd = useCallback((_, info) => {
    const { velocity, offset } = info;
    if (velocity.y > 280 || offset.y > 60) {
      setMobileFleetExpanded(false);
    } else if (velocity.y < -280 || offset.y < -60) {
      setMobileFleetExpanded(true);
    }
  }, []);

  // ── Fetch on open ──
  const parentRef = useRef(null);

  useEffect(() => {
    if (isVisible) dispatch(fetchFleetMap());
  }, [isVisible, dispatch]);

  // ── Step 1: filter (by keyword + status) — does NOT depend on positions ──
  const filteredItems = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];
    const search = debouncedKeyword.toLowerCase().trim();

    return safeItems.filter((item) => {
      // Status filter
      if (statusFilter !== 'all') {
        const ids = item.deviceIds || (item.devices?.map((d) => d.id)) || (item.device_id ? [item.device_id] : []);
        const hasStatus = ids.some((id) => devices[id]?.status === statusFilter);
        // Vehicles without devices shown only in 'all'
        if (!hasStatus) return false;
      }

      if (!search) return true;

      const basicMatch = (
        item.plate?.toLowerCase().includes(search)
        || item.nickname?.toLowerCase().includes(search)
        || item.make?.toLowerCase().includes(search)
        || item.model?.toLowerCase().includes(search)
        || item.client_name?.toLowerCase().includes(search)
      );
      if (basicMatch) return true;

      const ids = item.deviceIds || (item.devices?.map((d) => d.id)) || (item.device_id ? [item.device_id] : []);
      return ids.some((id) => {
        const dev = devices[id];
        return dev && (dev.name.toLowerCase().includes(search) || dev.uniqueId.includes(search));
      });
    });
  }, [items, debouncedKeyword, statusFilter, devices]);

  // ── Step 2: sort by last communication — depends on positions ──
  // Stabilised: only re-sorts when the ORDER would actually change (avoids
  // thrashing on every 5-s position poll when nothing moved in the ranking).
  const sortedItems = useMemo(() => {
    const getBestTime = (item) => {
      const ids = item.deviceIds || (item.devices?.map((d) => d.id)) || (item.device_id != null ? [item.device_id] : []);
      let best = 0;
      ids.forEach((id) => {
        const t = getCommunicationTimestamp(devices[id], positions[id])?.valueOf() || 0;
        if (t > best) best = t;
      });
      return best;
    };
    return [...filteredItems].sort((a, b) => getBestTime(b) - getBestTime(a));
  }, [filteredItems, devices, positions]);

  // ── Virtualizer with dynamic estimate ──
  const estimateSize = useCallback((index) => {
    const item = sortedItems[index];
    if (!item) return 130;
    const ids = item.deviceIds || (item.devices?.map((d) => d.id)) || (item.device_id ? [item.device_id] : []);
    const hasPosition = ids.some((id) => positions[id]);
    // With position: speed + address + status icons → taller
    return hasPosition ? 155 : 80;
  }, [sortedItems, positions]);

  const virtualizer = useVirtualizer({
    count: sortedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 8,
    measureElement: typeof window !== 'undefined' ? (el) => el.getBoundingClientRect().height : undefined,
  });
  const virtualizerItems = virtualizer.getVirtualItems();

  const handleSelectPlate = useCallback((plate) => {
    dispatch(fleetActions.setSelectedPlate(plate));
  }, [dispatch]);

  const shouldShow = isVisible && !selectedPlate;

  // Count per status for pill badges
  const statusCounts = useMemo(() => {
    const counts = { all: 0, online: 0, offline: 0, unknown: 0 };
    const safeItems = Array.isArray(items) ? items : [];
    safeItems.forEach((item) => {
      counts.all++;
      const ids = item.deviceIds || (item.devices?.map((d) => d.id)) || (item.device_id ? [item.device_id] : []);
      if (ids.length === 0) return;
      // Use the best device status
      const statuses = ids.map((id) => devices[id]?.status).filter(Boolean);
      if (statuses.includes('online')) counts.online++;
      else if (statuses.includes('unknown')) counts.unknown++;
      else if (statuses.includes('offline')) counts.offline++;
    });
    return counts;
  }, [items, devices]);

  return (
    <AnimatePresence mode="wait">
      {shouldShow && (
        <motion.div
          key="floating-fleet-list"
          initial={{ x: !desktop ? 0 : -400, y: !desktop ? 400 : 0, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          exit={{ x: !desktop ? 0 : -400, y: !desktop ? 400 : 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: !desktop ? 'auto' : '8px',
            bottom: !desktop ? '0px' : 'auto',
            height: !desktop ? 'auto' : 'calc(100vh - 16px)',
            left: !desktop ? '0px' : (isMenuExpanded ? '208px' : '63px'),
            width: !desktop ? '100vw' : '310px',
            zIndex: 9999,
            pointerEvents: 'auto',
            transition: 'left 0.15s ease',
            display: !desktop ? 'flex' : undefined,
            flexDirection: !desktop ? 'column' : undefined,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {!desktop && (
            <motion.div
              onPanEnd={onMobileFleetPanEnd}
              style={{ padding: '10px 0 4px', cursor: 'grab', touchAction: 'none', flexShrink: 0 }}
              onClick={() => setMobileFleetExpanded((v) => !v)}
            >
              <div style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: borderColor, margin: '0 auto' }} />
            </motion.div>
          )}
          <motion.div
            animate={{
              height: !desktop ? (mobileFleetExpanded ? 'calc(92dvh - env(safe-area-inset-top, 0px))' : '56dvh') : '100%',
            }}
            transition={!desktop ? { type: 'spring', damping: 32, stiffness: 380 } : { duration: 0 }}
            style={{ flex: !desktop ? undefined : 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
          <Card style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            backgroundColor: surface, borderRadius: !desktop ? '16px 16px 0 0' : '0px', boxShadow: !desktop ? '0 -10px 40px rgba(0,0,0,0.14)' : 'none',
            border: `1px solid ${borderColor}`, borderLeft: !desktop ? `1px solid ${borderColor}` : 'none', overflow: 'hidden',
          }}>
            {/* ── Header ── */}
            <div style={{
              padding: '12px 16px 8px 16px', display: 'flex', flexDirection: 'column',
              gap: '8px', backgroundColor: surface, borderBottom: `1px solid ${borderColor}`, zIndex: 2,
            }}>
              {/* Search row */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {!desktop && onDrawerOpen && (
                  <button onClick={onDrawerOpen} style={{ background: 'none', border: 'none', color: text, cursor: 'pointer', padding: 0 }}>
                    <Menu size={20} />
                  </button>
                )}
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: textSecondary }} />
                  <Input
                    placeholder="Buscar frota..."
                    value={keyword}
                    onChange={handleKeywordChange}
                    style={{ paddingLeft: '36px', paddingRight: '44px', height: '38px', backgroundColor: secondary, border: `1px solid ${borderColor}`, color: text, borderRadius: '8px' }}
                  />
                  {/* Counter or spinner */}
                  <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {loading
                      ? <Loader2 size={14} color={textSecondary} style={{ animation: 'spin 1s linear infinite' }} />
                      : <span style={{ fontSize: '10px', color: textSecondary, backgroundColor: borderColor, padding: '2px 6px', borderRadius: '4px' }}>{sortedItems.length}</span>}
                  </div>
                </div>
              </div>

              {/* Status filter pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {STATUS_FILTERS.map(({ key, label, color }) => {
                  const active = statusFilter === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setStatusFilter(key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500',
                        cursor: 'pointer', transition: 'all 0.15s',
                        border: `1px solid ${active ? (color || colors.primary || '#3b82f6') : borderColor}`,
                        backgroundColor: active ? `${color || colors.primary || '#3b82f6'}22` : 'transparent',
                        color: active ? (color || colors.primary || '#3b82f6') : textSecondary,
                      }}
                    >
                      {color && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color, display: 'inline-block', flexShrink: 0 }} />}
                      {label}
                      <span style={{ opacity: 0.7, marginLeft: '2px' }}>
                        {statusCounts[key] ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── List ── */}
            <div
              ref={parentRef}
              style={{ flex: 1, overflowY: 'auto', padding: '12px 0', position: 'relative' }}
            >
              <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                {virtualizerItems.map((virtualItem) => {
                  const fleetItem = sortedItems[virtualItem.index];
                  return (
                    <div
                      key={fleetItem.id ?? `fleet-row-${virtualItem.index}`}
                      ref={virtualizer.measureElement}
                      data-index={virtualItem.index}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualItem.start}px)` }}
                    >
                      <FleetRowItem
                        item={fleetItem}
                        style={{ padding: '4px 12px 12px' }}
                        onClick={() => handleSelectPlate(fleetItem.plate)}
                        devices={devices}
                        positions={positions}
                        t={t}
                        isSelected={fleetItem.plate === selectedPlate}
                      />
                    </div>
                  );
                })}
              </div>

              {!loading && sortedItems.length === 0 && (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: textSecondary }}>
                  <Search size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                  <p>Nenhum veículo encontrado</p>
                </div>
              )}
            </div>
          </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingFleetList;
