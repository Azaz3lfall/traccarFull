import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';

import {
  altitudeFromMeters,
  altitudeUnitString,
  distanceFromMeters,
  distanceUnitString,
  speedFromKnots,
  speedUnitString,
  volumeFromLiters,
  volumeUnitString,
} from './converter';
import { prefixString } from './stringUtils';

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

export const formatBoolean = (value, t) => (value ? t('sharedYes') : t('sharedNo'));

export const formatNumber = (value, precision = 1) => {
  if (typeof value !== 'number') return '0';
  return Number(value.toFixed(precision));
};

export const formatPercentage = (value) => {
  if (typeof value !== 'number') return '0%';
  return `${value}%`;
};

export const formatTemperature = (value) => {
  if (typeof value !== 'number') return '0°C';
  return `${value.toFixed(1)}°C`;
};

export const formatVoltage = (value, t) => {
  if (typeof value !== 'number') return `0 ${t('sharedVoltAbbreviation')}`;
  return `${value.toFixed(2)} ${t('sharedVoltAbbreviation')}`;
};

export const formatConsumption = (value, t) => {
  if (typeof value !== 'number') return `0 ${t('sharedLiterPerHourAbbreviation')}`;
  return `${value.toFixed(2)} ${t('sharedLiterPerHourAbbreviation')}`;
};

export const formatTime = (value, format, timezone) => {
  if (value) {
    const d = dayjs(value).toDate();
    const dateConfig = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const minuteConfig = { hour: '2-digit', minute: '2-digit' };
    const secondConfig = { ...minuteConfig, second: '2-digit' };
    const configuredTimezone = timezone || window.__traccarTimezone;
    const timeConfig = configuredTimezone ? { timeZone: configuredTimezone } : {};
    switch (format) {
      case 'date':
        return d.toLocaleDateString(undefined, { ...dateConfig, ...timeConfig });
      case 'time':
        return d.toLocaleTimeString(undefined, { ...secondConfig, ...timeConfig });
      case 'minutes':
        return d.toLocaleString(undefined, { ...dateConfig, ...minuteConfig, ...timeConfig });
      default:
        return d.toLocaleString(undefined, { ...dateConfig, ...secondConfig, ...timeConfig });
    }
  }
  return '';
};

export const formatStatus = (value, t) => t(prefixString('deviceStatus', value));

export const formatAlarm = (value, t) => {
  if (value) {
    return value.split(',')
      .map((alarm) => t(prefixString('alarm', alarm)))
      .join(', ');
  }
  return '';
};

export const formatCourse = (value) => {
  const courseValues = ['\u2191', '\u2197', '\u2192', '\u2198', '\u2193', '\u2199', '\u2190', '\u2196'];
  let normalizedValue = (value + 45 / 2) % 360;
  if (normalizedValue < 0) {
    normalizedValue += 360;
  }
  return courseValues[Math.floor(normalizedValue / 45)];
};

export const formatDistance = (value, unit, t) => {
  if (typeof value !== 'number') return `0 ${distanceUnitString(unit, t)}`;
  return `${distanceFromMeters(value, unit).toFixed(2)} ${distanceUnitString(unit, t)}`;
};

export const formatAltitude = (value, unit, t) => {
  if (typeof value !== 'number') return `0 ${altitudeUnitString(unit, t)}`;
  return `${altitudeFromMeters(value, unit).toFixed(2)} ${altitudeUnitString(unit, t)}`;
};

export const formatSpeed = (value, unit, t) => {
  if (typeof value !== 'number') return `0 ${speedUnitString(unit, t)}`;
  return `${speedFromKnots(value, unit).toFixed(2)} ${speedUnitString(unit, t)}`;
};

export const formatVolume = (value, unit, t) => {
  if (typeof value !== 'number') return `0 ${volumeUnitString(unit, t)}`;
  return `${volumeFromLiters(value, unit).toFixed(2)} ${volumeUnitString(unit, t)}`;
};

export const formatNumericHours = (value, t) => {
  if (typeof value !== 'number') return `0 ${t('sharedHourAbbreviation')} 0 ${t('sharedMinuteAbbreviation')}`;
  const hours = Math.floor(value / 3600000);
  const minutes = Math.floor((value % 3600000) / 60000);
  return `${hours} ${t('sharedHourAbbreviation')} ${minutes} ${t('sharedMinuteAbbreviation')}`;
};

// Reverse geocoding using custom Nominatim server
export const reverseGeocode = async (latitude, longitude) => {
  if (!latitude || !longitude) {
    return null;
  }
  
  // Try proxy first (avoids CORS and Mixed Content issues)
  // Note: Server uses reverse.php endpoint
  const proxyUrl = `/nominatim-proxy/reverse.php?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
  
  // Check if we're on HTTPS - if so, only use proxy to avoid Mixed Content
  const isHTTPS = window.location.protocol === 'https:';
  
  // URLs to try - proxy first always, direct only if HTTP
  const urlsToTry = [
    { url: proxyUrl, isProxy: true }
  ];
  
  // Only add direct URL if not HTTPS (to avoid Mixed Content error)
  if (!isHTTPS) {
    const directUrl = `http://50.30.32.171:8080/reverse.php?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
    urlsToTry.push({ url: directUrl, isProxy: false });
  }
  
  for (const { url, isProxy } of urlsToTry) {
    try {
      const fetchOptions = {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'omit',
      };
      
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        continue;
      }
      
      const data = await response.json();
      
      // Build address from address components (more control over what to show)
      // This filters out unnecessary administrative regions
      if (data && data.address) {
        const addr = data.address;
        const parts = [];
        
        // POI/Tourism (like "Pousada Guaribas", "Restaurante X", etc.)
        if (addr.tourism) {
          parts.push(addr.tourism);
        } else if (addr.amenity) {
          parts.push(addr.amenity);
        } else if (addr.shop) {
          parts.push(addr.shop);
        }
        
        // Road/Street name
        if (addr.road) {
          parts.push(addr.road);
        }
        
        // House number
        if (addr.house_number) {
          parts.push(addr.house_number);
        }
        
        // Neighborhood/Suburb
        if (addr.neighbourhood || addr.suburb) {
          parts.push(addr.neighbourhood || addr.suburb);
        }
        
        // City/Town/Village (prioritize city, then town, then village)
        if (addr.city) {
          parts.push(addr.city);
        } else if (addr.town) {
          parts.push(addr.town);
        } else if (addr.village) {
          parts.push(addr.village);
        }
        
        // State (only if exists and is not empty)
        // Skip municipality, state_district, and region as they're administrative
        if (addr.state && addr.state.trim() !== '') {
          parts.push(addr.state);
        }
        
        // Postal code (if available)
        if (addr.postcode) {
          parts.push(addr.postcode);
        }
        
        // Country (only if exists)
        if (addr.country && addr.country.trim() !== '') {
          parts.push(addr.country);
        }
        
        const builtAddress = parts.length > 0 ? parts.join(', ') : null;
        if (builtAddress) {
          return builtAddress;
        }
      }
      
      // Fallback: use display_name but clean it up
      if (data && data.display_name) {
        // Remove unwanted administrative regions from display_name
        let cleanedAddress = data.display_name;
        
        // Remove "Região Geográfica Imediata de..." patterns
        cleanedAddress = cleanedAddress.replace(/Região Geográfica Imediata de[^,]*,?\s*/gi, '');
        
        // Remove "Região Geográfica Intermediária de..." patterns
        cleanedAddress = cleanedAddress.replace(/Região Geográfica Intermediária de[^,]*,?\s*/gi, '');
        
        // Remove "Região Nordeste" or similar regional names (but keep if it's the only region info)
        cleanedAddress = cleanedAddress.replace(/Região (Nordeste|Sul|Sudeste|Norte|Centro-Oeste),?\s*/gi, '');
        
        // Clean up multiple commas and spaces
        cleanedAddress = cleanedAddress.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
        
        // Remove trailing comma if exists
        cleanedAddress = cleanedAddress.replace(/,\s*$/, '');
        
        return cleanedAddress;
      }
      
    } catch (error) {
      // Continue to try next URL if this one failed
      continue;
    }
  }
  
  return null;
};

export const formatCoordinate = (key, value, unit) => {
  let hemisphere;
  let degrees;
  let minutes;
  let seconds;

  if (key === 'latitude') {
    hemisphere = value >= 0 ? 'N' : 'S';
  } else {
    hemisphere = value >= 0 ? 'E' : 'W';
  }

  switch (unit) {
    case 'ddm':
      value = Math.abs(value);
      degrees = Math.floor(value);
      minutes = (value - degrees) * 60;
      return `${degrees}° ${typeof minutes === 'number' ? minutes.toFixed(6) : '0.000000'}' ${hemisphere}`;
    case 'dms':
      value = Math.abs(value);
      degrees = Math.floor(value);
      minutes = Math.floor((value - degrees) * 60);
      seconds = Math.round((value - degrees - minutes / 60) * 3600);
      return `${degrees}° ${minutes}' ${seconds}" ${hemisphere}`;
    default:
      return `${typeof value === 'number' ? value.toFixed(6) : '0.000000'}°`;
  }
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'online':
      return 'success';
    case 'offline':
      return 'error';
    case 'unknown':
    default:
      return 'neutral';
  }
};

export const getBatteryStatus = (batteryLevel) => {
  if (batteryLevel >= 70) {
    return 'success';
  }
  if (batteryLevel > 30) {
    return 'warning';
  }
  return 'error';
};

export const formatNotificationTitle = (t, notification, includeId) => {
  if (notification.description) {
    return notification.description;
  }
  let title = t(prefixString('event', notification.type));
  if (notification.type === 'alarm') {
    const alarmString = notification.attributes.alarms;
    if (alarmString) {
      const alarms = alarmString.split(',');
      if (alarms.length > 1) {
        title += ` (${alarms.length})`;
      } else {
        title += ` ${formatAlarm(alarms[0], t)}`;
      }
    }
  }
  if (includeId) {
    title += ` [${notification.id}]`;
  }
  return title;
};
