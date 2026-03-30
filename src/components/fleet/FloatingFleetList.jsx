import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { fleetActions, fetchFleetMap } from '../../store';
import { useThemeColors, useTheme as useAppTheme } from '../../common/components/ThemeProvider';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Search, Menu, MapPin, Gauge } from 'lucide-react';
import DeviceStatusIcons from '../../settings/components/DeviceStatusIcons';
import { 
  formatSpeed, 
  formatCoordinate,
  reverseGeocode
} from '../../common/util/formatter';
import { mapIconKey, mapIcons } from '../../map/core/preloadImages';
import { vehicleTypeToIcon } from '../../common/util/vehicleTypeIcon';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

/** Fleet card colors: dark cards on dark panel, light cards on light panel (readable address/meta). */
const getFleetCardPalette = (isDark, colors) => {
  if (isDark) {
    return {
      cardBg: '#1f2937',
      cardBgHover: '#2d3748',
      cardBorder: colors.border ?? '#374151',
      cardBorderHover: '#4b5563',
      title: '#f9fafb',
      subtitle: '#9ca3af',
      meta: '#9ca3af',
      speed: '#e5e7eb',
      address: '#d1d5db',
      pinIcon: '#9ca3af',
      gaugeIcon: '#9ca3af',
      avatarBg: '#374151',
      shadow: '0 2px 4px rgba(0,0,0,0.2)',
      iconFilter: 'brightness(0) invert(1)',
    };
  }
  return {
    cardBg: colors.secondary ?? '#f3f4f6',
    cardBgHover: colors.hover ?? '#e5e7eb',
    cardBorder: colors.border ?? '#e5e7eb',
    cardBorderHover: colors.border ?? '#d1d5db',
    title: colors.text ?? '#1f2937',
    subtitle: colors.textSecondary ?? '#6b7280',
    meta: colors.textSecondary ?? '#6b7280',
    speed: colors.text ?? '#374151',
    address: '#4b5563',
    pinIcon: '#6b7280',
    gaugeIcon: colors.textSecondary ?? '#6b7280',
    avatarBg: colors.secondary ?? '#e5e7eb',
    shadow: '0 1px 3px rgba(0,0,0,0.08)',
    iconFilter: 'brightness(0) saturate(100%) opacity(0.55)',
  };
};

// Shared cache for reverse geocoding (avoids duplicate requests across list items)
const fleetAddressCache = new Map();

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
    if (position.address && position.address.trim() !== '') {
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
    reverseGeocode(position.latitude, position.longitude)
      .then((addr) => {
        if (mountedRef.current) {
          if (addr) fleetAddressCache.set(key, addr);
          setAddress(addr);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          setAddress(null);
          setLoading(false);
        }
      });
  }, [position?.latitude, position?.longitude]);

  return [address, loading];
};

// --- Sub-componente Visual (Item da Lista) ---
const FleetRowItem = ({ item, style, onClick, devices, positions, t }) => {
  const colors = useThemeColors() || {};
  const { theme: appTheme } = useAppTheme();
  const isDark = appTheme === 'dark';
  const p = getFleetCardPalette(isDark, colors);

  // Encontra o rastreador com atualização mais recente
  const bestDeviceData = useMemo(() => {
    const ids = item.deviceIds || (item.devices?.map((d) => d.id)) || (item.device_id ? [item.device_id] : []);
    if (ids.length === 0) return null;

    const candidates = ids.map(id => ({
      device: devices[id],
      position: positions[id]
    })).filter(c => c.device);

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      const timeA = a.position?.fixTime ? new Date(a.position.fixTime).getTime() : 0;
      const timeB = b.position?.fixTime ? new Date(b.position.fixTime).getTime() : 0;
      return timeB - timeA;
    });

    return candidates[0];
  }, [item, devices, positions]);

  const device = bestDeviceData?.device;
  const position = bestDeviceData?.position;
  const [resolvedAddress, isResolvingAddress] = useResolvedAddress(position);

  // Fallback se não tiver device
  if (!device) {
    const iconKey = vehicleTypeToIcon(item.vehicle_type);
    const hasPhoto = item.foto_veiculo?.trim();
    return (
      <div style={style}>
        <div 
          onClick={onClick}
          className="fleet-card-hover"
          style={{
            display: 'flex', alignItems: 'center', padding: '12px',
            backgroundColor: p.cardBg,
            borderRadius: '12px', border: `1px solid ${p.cardBorder}`,
            cursor: 'pointer', boxSizing: 'border-box',
            boxShadow: p.shadow, transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = p.cardBorderHover;
            e.currentTarget.style.backgroundColor = p.cardBgHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = p.cardBorder;
            e.currentTarget.style.backgroundColor = p.cardBg;
          }}
        >
          <div style={{ marginRight: '12px', opacity: 0.85 }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: p.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {hasPhoto ? (
                <img src={`/api/vehicles/image/${item.foto_veiculo.replace(/^\/?uploads\//, '')}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <img src={mapIcons[mapIconKey(iconKey)]} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain', filter: p.iconFilter }} />
              )}
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', color: p.title }}>{item.nickname || item.plate}</div>
            {(item.nickname ? item.plate : item.model) && (
              <div style={{ fontSize: '11px', color: p.subtitle }}>{item.nickname ? item.plate : item.model}</div>
            )}
            <div style={{ fontSize: '12px', color: p.meta }}>Sem rastreador</div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#10B981';
      case 'offline': return '#EF4444';
      case 'unknown': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const statusColor = getStatusColor(device.status);

  return (
    <div style={style}>
      <div 
        onClick={onClick}
        className="fleet-card-hover"
        style={{
          display: 'flex', flexDirection: 'column', padding: '12px',
          backgroundColor: p.cardBg,
          borderRadius: '12px', border: `1px solid ${p.cardBorder}`,
          cursor: 'pointer', minHeight: 0, boxSizing: 'border-box',
          gap: '8px', transition: 'all 0.2s ease',
          boxShadow: p.shadow,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = p.cardBorderHover;
          e.currentTarget.style.backgroundColor = p.cardBgHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = p.cardBorder;
          e.currentTarget.style.backgroundColor = p.cardBg;
        }}
      >
        {/* Topo: ícone + nome (largura total para o título não truncar por causa dos ícones) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div style={{ 
            width: '42px', height: '42px', borderRadius: '50%', 
            backgroundColor: p.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, overflow: 'hidden'
          }}>
            {item.foto_veiculo?.trim() ? (
              <img 
                src={`/api/vehicles/image/${item.foto_veiculo.replace(/^\/?uploads\//, '')}`} 
                alt="" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <img 
                src={mapIcons[mapIconKey(vehicleTypeToIcon(item.vehicle_type) || device?.category || 'default')]} 
                alt="" 
                style={{ width: '24px', height: '24px', objectFit: 'contain', filter: p.iconFilter }} 
              />
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: p.title, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.nickname || item.plate}
            </div>
            {(item.nickname ? item.plate : item.model) && (
              <div style={{ fontSize: '11px', color: p.subtitle, fontWeight: 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.nickname ? item.plate : item.model}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusColor }}></div>
              <span style={{ fontSize: '11px', color: p.meta }}>
                 {position ? dayjs(position.fixTime).fromNow(true) : 'Sem dados'}
              </span>
            </div>
          </div>
        </div>

        {/* Velocidade, endereço e ícones de telemetria (ícones abaixo do endereço) */}
        {position && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Gauge size={14} color={p.gaugeIcon} />
                <span style={{ fontSize: '12px', color: p.speed }}>
                   {formatSpeed(position.speed, 'kmh', t)}
                </span>
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

// --- Componente Principal ---

const FloatingFleetList = ({
  desktop,
  isMenuExpanded,
  isVisible,
  onDrawerOpen,
}) => {
  const dispatch = useDispatch();
  const t = useTranslation();
  const colors = useThemeColors() || {};

  const { items, loading } = useSelector((state) => state.fleet);
  const devices = useSelector((state) => state.devices.items);
  const positions = useSelector((state) => state.session.positions);
  const selectedPlate = useSelector((state) => state.fleet.selectedPlate);

  const surface = colors.surface ?? '#111827';
  const borderColor = colors.border ?? '#374151';
  const secondary = colors.secondary ?? '#1f2937';
  const text = colors.text ?? '#fff';
  const textSecondary = colors.textSecondary ?? '#9ca3af';

  const [keyword, setKeyword] = useState('');
  const parentRef = useRef(null);

  useEffect(() => {
    if (isVisible) {
      dispatch(fetchFleetMap());
    }
  }, [isVisible, dispatch]);

  const filteredFleetItems = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];
    let result = safeItems;
    if (keyword && keyword.trim() !== '') {
      const searchTerm = keyword.toLowerCase().trim();
      result = result.filter((item) => {
        const basicMatch = (
          item.plate?.toLowerCase().includes(searchTerm) ||
          item.nickname?.toLowerCase().includes(searchTerm) ||
          item.make?.toLowerCase().includes(searchTerm) ||
          item.model?.toLowerCase().includes(searchTerm) ||
          item.client_name?.toLowerCase().includes(searchTerm)
        );
        let deviceMatch = false;
        const deviceIds = item.deviceIds || (item.devices?.map((d) => d.id)) || (item.device_id ? [item.device_id] : []);
        if (deviceIds.length > 0) {
           deviceMatch = deviceIds.some(id => {
              const dev = devices[id];
              return dev && (dev.name.toLowerCase().includes(searchTerm) || dev.uniqueId.includes(searchTerm));
           });
        }
        return basicMatch || deviceMatch;
      });
    }
    // Sort by last communication (most recent first)
    result = [...result].sort((a, b) => {
      const getBestFixTime = (item) => {
        const ids = item.deviceIds || (item.devices?.map((d) => d.id)) || (item.device_id != null ? [item.device_id] : []);
        let best = 0;
        ids.forEach((id) => {
          const pos = positions[id];
          const t = pos?.fixTime ? new Date(pos.fixTime).getTime() : 0;
          if (t > best) best = t;
        });
        return best;
      };
      return getBestFixTime(b) - getBestFixTime(a);
    });
    return result;
  }, [items, keyword, devices, positions]);

  // measureElement: altura real por card (evita sobreposição quando estimateSize < conteúdo)
  const virtualizer = useVirtualizer({
    count: filteredFleetItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 220,
    overscan: 8,
    measureElement:
      typeof window !== 'undefined'
        ? (el) => el.getBoundingClientRect().height
        : undefined,
  });
  const virtualizerItems = virtualizer.getVirtualItems();

  const handleSelectPlate = useCallback((plate) => {
    dispatch(fleetActions.setSelectedPlate(plate));
  }, [dispatch]);

  // Lógica de "Gaveta": Só mostra se não tiver placa selecionada
  const shouldShow = isVisible && !selectedPlate;

  return (
    <AnimatePresence mode="wait">
      {shouldShow && (
        <motion.div
          key="floating-fleet-list"
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -400, opacity: 0 }}
          transition={{ duration: 0.1, ease: "easeOut" }}
          style={{
            position: 'fixed',
            top: !desktop ? '0px' : '8px',
            height: !desktop ? '100vh' : 'calc(100vh - 16px)',
            left: !desktop ? '0px' : (isMenuExpanded ? '208px' : '63px'),
            width: !desktop ? '100vw' : '310px',
            zIndex: 9999,
            pointerEvents: 'auto',
            transition: 'left 0.15s ease',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Card style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: surface,
            borderRadius: '0px',
            boxShadow: 'none',
            border: `1px solid ${borderColor}`,
            borderLeft: 'none',
            overflow: 'hidden',
          }}>
            {/* Header (Busca + Contador) - integrado ao menu */}
            <div style={{
              padding: '16px 16px 8px 16px',
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
              backgroundColor: surface,
              borderBottom: `1px solid ${borderColor}`,
              zIndex: 2,
            }}>
              {!desktop && onDrawerOpen && (
                <button onClick={onDrawerOpen} style={{ background: 'none', border: 'none', color: text }}>
                  <Menu size={20} />
                </button>
              )}
              <div style={{ position: 'relative', flex: 1 }}>
                <Search style={{
                  position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                  width: '16px', height: '16px', color: textSecondary,
                }} />
                <Input
                  placeholder="Buscar frota..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  style={{
                    paddingLeft: '36px',
                    paddingRight: '40px',
                    height: '40px',
                    backgroundColor: secondary,
                    border: `1px solid ${borderColor}`,
                    color: text,
                    borderRadius: '8px',
                  }}
                />
                <div style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  fontSize: '10px', color: textSecondary, backgroundColor: borderColor, padding: '2px 6px', borderRadius: '4px',
                }}>
                  {filteredFleetItems.length}
                </div>
              </div>
            </div>
            
            {/* Lista */}
            <div 
              ref={parentRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px 0',
                position: 'relative'
              }}
            >
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizerItems.map((virtualItem) => {
                  const fleetItem = filteredFleetItems[virtualItem.index];
                  return (
                    <div
                      key={fleetItem.id ?? `fleet-row-${virtualItem.index}`}
                      ref={virtualizer.measureElement}
                      data-index={virtualItem.index}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                    >
                      <FleetRowItem
                        item={fleetItem}
                        style={{ padding: '4px 12px 12px' }}
                        onClick={() => handleSelectPlate(fleetItem.plate)}
                        devices={devices}
                        positions={positions}
                        t={t}
                      />
                    </div>
                  );
                })}
              </div>

              {!loading && filteredFleetItems.length === 0 && (
                 <div style={{ padding: '40px 20px', textAlign: 'center', color: textSecondary }}>
                    <Search size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                    <p>Nenhum veículo encontrado</p>
                 </div>
              )}
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingFleetList;