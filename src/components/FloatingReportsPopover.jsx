import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors } from '../common/components/ThemeProvider';
import { useAdministrator, useRestriction } from '../common/util/permissions';
import { Card } from './ui/card';
import { Typography, IconButton, Tabs, Tab, Box, Table, TableBody, TableCell, TableHead, TableRow, FormControl, InputLabel, Select, MenuItem, Button, TextField, CircularProgress, Portal } from '@mui/material';
import { ChevronLeft as CloseIcon } from 'lucide-react';
import { useCatch } from '../reactHelper';
import { formatTime, formatSpeed, formatDistance, formatVolume, formatNumericHours } from '../common/util/formatter';
import { prefixString, unprefixString } from '../common/util/stringUtils';
import fetchOrThrow from '../common/util/fetchOrThrow';
import SelectField from '../common/components/SelectField';
import { useAttributePreference } from '../common/util/preferences';
import { useTranslationKeys } from '../common/components/LocalizationProvider';
import AddressValue from '../common/components/AddressValue';
import dayjs from 'dayjs';
import StarIcon from '@mui/icons-material/Star';
import TimelineIcon from '@mui/icons-material/Timeline';
import PauseCircleFilledIcon from '@mui/icons-material/PauseCircleFilled';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import DownloadIcon from '@mui/icons-material/Download';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RouteIcon from '@mui/icons-material/Route';
import NotesIcon from '@mui/icons-material/Notes';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import BarChartIcon from '@mui/icons-material/BarChart';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import LocationSearchingIcon from '@mui/icons-material/LocationSearching';
import Link from '@mui/material/Link';

const FloatingReportsPopover = ({ 
  desktop, 
  isMenuExpanded,
  isDeviceListVisible,
  isVisible,
  onClose
}) => {
  const t = useTranslation();
  const colors = useThemeColors();
  const admin = useAdministrator();
  const readonly = useRestriction('readonly');
  
  const [activeTab, setActiveTab] = useState(0);
  
  // Combined report state
  const [combinedItems, setCombinedItems] = useState([]);
  const [combinedLoading, setCombinedLoading] = useState(false);
  const [deviceIds, setDeviceIds] = useState([]);
  const [groupIds, setGroupIds] = useState([]);
  const [period, setPeriod] = useState('today');
  const [customFrom, setCustomFrom] = useState(dayjs().subtract(1, 'hour').locale('en').format('YYYY-MM-DDTHH:mm'));
  const [customTo, setCustomTo] = useState(dayjs().locale('en').format('YYYY-MM-DDTHH:mm'));

  // Events report state
  const [eventsItems, setEventsItems] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventTypes, setEventTypes] = useState(['allEvents']);
  const [alarmTypes, setAlarmTypes] = useState([]);
  const [allEventTypes, setAllEventTypes] = useState([['allEvents', 'eventAll']]);
  const [eventsColumns, setEventsColumns] = useState(['eventTime', 'type', 'attributes']);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventPosition, setEventPosition] = useState(null);

  // Trips report state
  const [tripsItems, setTripsItems] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [tripsColumns, setTripsColumns] = useState(['startTime', 'endTime', 'distance', 'averageSpeed']);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [tripRoute, setTripRoute] = useState(null);

  // Stops report state
  const [stopsItems, setStopsItems] = useState([]);
  const [stopsLoading, setStopsLoading] = useState(false);
  const [stopsColumns, setStopsColumns] = useState(['startTime', 'endTime', 'startOdometer', 'address']);
  const [selectedStop, setSelectedStop] = useState(null);

  const devices = useSelector((state) => state.devices.items);
  const groups = useSelector((state) => state.groups.items);
  const geofences = useSelector((state) => state.geofences.items);
  const speedUnit = useAttributePreference('speedUnit');
  const distanceUnit = useAttributePreference('distanceUnit');
  const volumeUnit = useAttributePreference('volumeUnit');

  // Events columns configuration
  const eventsColumnsArray = [
    ['eventTime', 'positionFixTime'],
    ['type', 'sharedType'],
    ['geofenceId', 'sharedGeofence'],
    ['maintenanceId', 'sharedMaintenance'],
    ['attributes', 'commandData'],
  ];
  const eventsColumnsMap = new Map(eventsColumnsArray);

  // Alarms for events
  const alarms = useTranslationKeys((it) => it.startsWith('alarm')).map((it) => ({
    key: unprefixString('alarm', it),
    name: t(it),
  }));

  // Trips columns configuration
  const tripsColumnsArray = [
    ['startTime', 'reportStartTime'],
    ['startOdometer', 'reportStartOdometer'],
    ['startAddress', 'reportStartAddress'],
    ['endTime', 'reportEndTime'],
    ['endOdometer', 'reportEndOdometer'],
    ['endAddress', 'reportEndAddress'],
    ['distance', 'sharedDistance'],
    ['averageSpeed', 'reportAverageSpeed'],
    ['maxSpeed', 'reportMaximumSpeed'],
    ['duration', 'reportDuration'],
    ['spentFuel', 'reportSpentFuel'],
    ['driverName', 'sharedDriver'],
  ];
  const tripsColumnsMap = new Map(tripsColumnsArray);

  // Stops columns configuration
  const stopsColumnsArray = [
    ['startTime', 'reportStartTime'],
    ['startOdometer', 'positionOdometer'],
    ['address', 'positionAddress'],
    ['endTime', 'reportEndTime'],
    ['duration', 'reportDuration'],
    ['engineHours', 'reportEngineHours'],
    ['spentFuel', 'reportSpentFuel'],
  ];
  const stopsColumnsMap = new Map(stopsColumnsArray);

  // Define all report tabs with their permissions
  const reportTabs = [
    {
      key: 'combined',
      title: t('reportCombined'),
      icon: <StarIcon />,
      show: true
    },
    {
      key: 'events',
      title: t('reportEvents'),
      icon: <NotificationsActiveIcon />,
      show: true
    },
    {
      key: 'trips',
      title: t('reportTrips'),
      icon: <PlayCircleFilledIcon />,
      show: true
    },
    {
      key: 'stops',
      title: t('reportStops'),
      icon: <PauseCircleFilledIcon />,
      show: true
    },
    {
      key: 'summary',
      title: t('reportSummary'),
      icon: <FormatListBulletedIcon />,
      show: true
    },
    {
      key: 'chart',
      title: t('reportChart'),
      icon: <TrendingUpIcon />,
      show: true
    },
    {
      key: 'positions',
      title: t('reportPositions'),
      icon: <TimelineIcon />,
      show: true
    },
    {
      key: 'logs',
      title: t('sharedLogs'),
      icon: <NotesIcon />,
      show: true
    },
    {
      key: 'scheduled',
      title: t('reportScheduled'),
      icon: <EventRepeatIcon />,
      show: !readonly
    },
    {
      key: 'statistics',
      title: t('statisticsTitle'),
      icon: <BarChartIcon />,
      show: admin
    },
    {
      key: 'audit',
      title: t('reportAudit'),
      icon: <VerifiedUserIcon />,
      show: admin
    }
  ];

  // Filter tabs based on permissions
  const visibleTabs = reportTabs.filter(tab => tab.show);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Combined report functionality
  const onShowCombined = useCatch(async ({ deviceIds, groupIds, from, to }) => {
    const query = new URLSearchParams({ from, to });
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    groupIds.forEach((groupId) => query.append('groupId', groupId));
    setCombinedLoading(true);
    try {
      const response = await fetchOrThrow(`/api/reports/combined?${query.toString()}`);
      setCombinedItems(await response.json());
    } finally {
      setCombinedLoading(false);
    }
  });

  const showCombinedReport = () => {
    let selectedFrom;
    let selectedTo;
    switch (period) {
      case 'today':
        selectedFrom = dayjs().startOf('day');
        selectedTo = dayjs().endOf('day');
        break;
      case 'yesterday':
        selectedFrom = dayjs().subtract(1, 'day').startOf('day');
        selectedTo = dayjs().subtract(1, 'day').endOf('day');
        break;
      case 'thisWeek':
        selectedFrom = dayjs().startOf('week');
        selectedTo = dayjs().endOf('week');
        break;
      case 'previousWeek':
        selectedFrom = dayjs().subtract(1, 'week').startOf('week');
        selectedTo = dayjs().subtract(1, 'week').endOf('week');
        break;
      case 'thisMonth':
        selectedFrom = dayjs().startOf('month');
        selectedTo = dayjs().endOf('month');
        break;
      case 'previousMonth':
        selectedFrom = dayjs().subtract(1, 'month').startOf('month');
        selectedTo = dayjs().subtract(1, 'month').endOf('month');
        break;
      default:
        selectedFrom = dayjs(customFrom, 'YYYY-MM-DDTHH:mm');
        selectedTo = dayjs(customTo, 'YYYY-MM-DDTHH:mm');
        break;
    }

    onShowCombined({ 
      deviceIds, 
      groupIds, 
      from: selectedFrom.toISOString(), 
      to: selectedTo.toISOString() 
    });
  };

  const isCombinedDisabled = () => {
    return !deviceIds.length && !groupIds.length || combinedLoading;
  };

  // Events report functionality
  const onShowEvents = useCatch(async ({ deviceIds, groupIds, from, to }) => {
    const query = new URLSearchParams({ from, to });
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    groupIds.forEach((groupId) => query.append('groupId', groupId));
    eventTypes.forEach((it) => query.append('type', it));
    if (eventTypes[0] !== 'allEvents' && eventTypes.includes('alarm')) {
      alarmTypes.forEach((it) => query.append('alarm', it));
    }
    setEventsLoading(true);
    try {
      const response = await fetchOrThrow(`/api/reports/events?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      setEventsItems(await response.json());
    } finally {
      setEventsLoading(false);
    }
  });

  const showEventsReport = () => {
    let selectedFrom;
    let selectedTo;
    switch (period) {
      case 'today':
        selectedFrom = dayjs().startOf('day');
        selectedTo = dayjs().endOf('day');
        break;
      case 'yesterday':
        selectedFrom = dayjs().subtract(1, 'day').startOf('day');
        selectedTo = dayjs().subtract(1, 'day').endOf('day');
        break;
      case 'thisWeek':
        selectedFrom = dayjs().startOf('week');
        selectedTo = dayjs().endOf('week');
        break;
      case 'previousWeek':
        selectedFrom = dayjs().subtract(1, 'week').startOf('week');
        selectedTo = dayjs().subtract(1, 'week').endOf('week');
        break;
      case 'thisMonth':
        selectedFrom = dayjs().startOf('month');
        selectedTo = dayjs().endOf('month');
        break;
      case 'previousMonth':
        selectedFrom = dayjs().subtract(1, 'month').startOf('month');
        selectedTo = dayjs().subtract(1, 'month').endOf('month');
        break;
      default:
        selectedFrom = dayjs(customFrom, 'YYYY-MM-DDTHH:mm');
        selectedTo = dayjs(customTo, 'YYYY-MM-DDTHH:mm');
        break;
    }

    onShowEvents({ 
      deviceIds, 
      groupIds, 
      from: selectedFrom.toISOString(), 
      to: selectedTo.toISOString() 
    });
  };

  const isEventsDisabled = () => {
    return !deviceIds.length && !groupIds.length || eventsLoading;
  };

  // Load event types
  useEffect(() => {
    const loadEventTypes = async () => {
      try {
        const response = await fetchOrThrow('/api/notifications/types');
        const types = await response.json();
        setAllEventTypes([...allEventTypes, ...types.map((it) => [it.type, prefixString('event', it.type)])]);
      } catch (error) {
        console.error('Failed to load event types:', error);
      }
    };
    loadEventTypes();
  }, []);

  // Load position for selected event
  useEffect(() => {
    const loadEventPosition = async () => {
      if (selectedEvent) {
        try {
          const response = await fetchOrThrow(`/api/positions?id=${selectedEvent.positionId}`);
          const positions = await response.json();
          if (positions.length > 0) {
            setEventPosition(positions[0]);
          }
        } catch (error) {
          console.error('Failed to load event position:', error);
        }
      } else {
        setEventPosition(null);
      }
    };
    loadEventPosition();
  }, [selectedEvent]);

  const formatEventValue = (item, key) => {
    const value = item[key];
    switch (key) {
      case 'deviceId':
        return devices[value]?.name;
      case 'eventTime':
        return formatTime(value, 'seconds');
      case 'type':
        return t(prefixString('event', value));
      case 'geofenceId':
        if (value > 0) {
          const geofence = geofences[value];
          return geofence && geofence.name;
        }
        return null;
      case 'maintenanceId':
        return value > 0 ? value : null;
      case 'attributes':
        switch (item.type) {
          case 'alarm':
            return t(prefixString('alarm', item.attributes.alarm));
          case 'deviceOverspeed':
            return formatSpeed(item.attributes.speed, speedUnit, t);
          case 'driverChanged':
            return item.attributes.driverUniqueId;
          case 'media':
            return (<Link href={`/api/media/${devices[item.deviceId]?.uniqueId}/${item.attributes.file}`} target="_blank">{item.attributes.file}</Link>);
          case 'commandResult':
            return item.attributes.result;
          default:
            return '';
        }
      default:
        return value;
    }
  };

  // Trips report functionality
  const onShowTrips = useCatch(async ({ deviceIds, groupIds, from, to }) => {
    const query = new URLSearchParams({ from, to });
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    groupIds.forEach((groupId) => query.append('groupId', groupId));
    setTripsLoading(true);
    try {
      const response = await fetchOrThrow(`/api/reports/trips?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      setTripsItems(await response.json());
    } finally {
      setTripsLoading(false);
    }
  });

  const showTripsReport = () => {
    let selectedFrom;
    let selectedTo;
    switch (period) {
      case 'today':
        selectedFrom = dayjs().startOf('day');
        selectedTo = dayjs().endOf('day');
        break;
      case 'yesterday':
        selectedFrom = dayjs().subtract(1, 'day').startOf('day');
        selectedTo = dayjs().subtract(1, 'day').endOf('day');
        break;
      case 'thisWeek':
        selectedFrom = dayjs().startOf('week');
        selectedTo = dayjs().endOf('week');
        break;
      case 'previousWeek':
        selectedFrom = dayjs().subtract(1, 'week').startOf('week');
        selectedTo = dayjs().subtract(1, 'week').endOf('week');
        break;
      case 'thisMonth':
        selectedFrom = dayjs().startOf('month');
        selectedTo = dayjs().endOf('month');
        break;
      case 'previousMonth':
        selectedFrom = dayjs().subtract(1, 'month').startOf('month');
        selectedTo = dayjs().subtract(1, 'month').endOf('month');
        break;
      default:
        selectedFrom = dayjs(customFrom, 'YYYY-MM-DDTHH:mm');
        selectedTo = dayjs(customTo, 'YYYY-MM-DDTHH:mm');
        break;
    }

    onShowTrips({ 
      deviceIds, 
      groupIds, 
      from: selectedFrom.toISOString(), 
      to: selectedTo.toISOString() 
    });
  };

  const isTripsDisabled = () => {
    return !deviceIds.length && !groupIds.length || tripsLoading;
  };

  const onExportTrips = useCatch(async ({ deviceIds, groupIds, from, to }) => {
    const query = new URLSearchParams({ from, to });
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    groupIds.forEach((groupId) => query.append('groupId', groupId));
    window.location.assign(`/api/reports/trips/xlsx?${query.toString()}`);
  });

  const exportTripsReport = () => {
    let selectedFrom;
    let selectedTo;
    switch (period) {
      case 'today':
        selectedFrom = dayjs().startOf('day');
        selectedTo = dayjs().endOf('day');
        break;
      case 'yesterday':
        selectedFrom = dayjs().subtract(1, 'day').startOf('day');
        selectedTo = dayjs().subtract(1, 'day').endOf('day');
        break;
      case 'thisWeek':
        selectedFrom = dayjs().startOf('week');
        selectedTo = dayjs().endOf('week');
        break;
      case 'previousWeek':
        selectedFrom = dayjs().subtract(1, 'week').startOf('week');
        selectedTo = dayjs().subtract(1, 'week').endOf('week');
        break;
      case 'thisMonth':
        selectedFrom = dayjs().startOf('month');
        selectedTo = dayjs().endOf('month');
        break;
      case 'previousMonth':
        selectedFrom = dayjs().subtract(1, 'month').startOf('month');
        selectedTo = dayjs().subtract(1, 'month').endOf('month');
        break;
      default:
        selectedFrom = dayjs(customFrom, 'YYYY-MM-DDTHH:mm');
        selectedTo = dayjs(customTo, 'YYYY-MM-DDTHH:mm');
        break;
    }

    onExportTrips({ 
      deviceIds, 
      groupIds, 
      from: selectedFrom.toISOString(), 
      to: selectedTo.toISOString() 
    });
  };

  // Load route for selected trip
  useEffect(() => {
    const loadTripRoute = async () => {
      if (selectedTrip) {
        try {
          const query = new URLSearchParams({
            deviceId: selectedTrip.deviceId,
            from: selectedTrip.startTime,
            to: selectedTrip.endTime,
          });
          const response = await fetchOrThrow(`/api/reports/route?${query.toString()}`, {
            headers: { Accept: 'application/json' },
          });
          setTripRoute(await response.json());
        } catch (error) {
          console.error('Failed to load trip route:', error);
        }
      } else {
        setTripRoute(null);
      }
    };
    loadTripRoute();
  }, [selectedTrip]);

  const formatTripValue = (item, key) => {
    const value = item[key];
    switch (key) {
      case 'deviceId':
        return devices[value]?.name;
      case 'startTime':
      case 'endTime':
        return formatTime(value, 'minutes');
      case 'startOdometer':
      case 'endOdometer':
      case 'distance':
        return formatDistance(value, distanceUnit, t);
      case 'averageSpeed':
      case 'maxSpeed':
        return value > 0 ? formatSpeed(value, speedUnit, t) : null;
      case 'duration':
        return formatNumericHours(value, t);
      case 'spentFuel':
        return value > 0 ? formatVolume(value, volumeUnit, t) : null;
      case 'startAddress':
        return (<AddressValue latitude={item.startLat} longitude={item.startLon} originalAddress={value} />);
      case 'endAddress':
        return (<AddressValue latitude={item.endLat} longitude={item.endLon} originalAddress={value} />);
      default:
        return value;
    }
  };

  // Stops report functionality
  const onShowStops = useCatch(async ({ deviceIds, groupIds, from, to }) => {
    const query = new URLSearchParams({ from, to });
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    groupIds.forEach((groupId) => query.append('groupId', groupId));
    setStopsLoading(true);
    try {
      const response = await fetchOrThrow(`/api/reports/stops?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      setStopsItems(await response.json());
    } finally {
      setStopsLoading(false);
    }
  });

  const showStopsReport = () => {
    let selectedFrom;
    let selectedTo;
    switch (period) {
      case 'today':
        selectedFrom = dayjs().startOf('day');
        selectedTo = dayjs().endOf('day');
        break;
      case 'yesterday':
        selectedFrom = dayjs().subtract(1, 'day').startOf('day');
        selectedTo = dayjs().subtract(1, 'day').endOf('day');
        break;
      case 'thisWeek':
        selectedFrom = dayjs().startOf('week');
        selectedTo = dayjs().endOf('week');
        break;
      case 'previousWeek':
        selectedFrom = dayjs().subtract(1, 'week').startOf('week');
        selectedTo = dayjs().subtract(1, 'week').endOf('week');
        break;
      case 'thisMonth':
        selectedFrom = dayjs().startOf('month');
        selectedTo = dayjs().endOf('month');
        break;
      case 'previousMonth':
        selectedFrom = dayjs().subtract(1, 'month').startOf('month');
        selectedTo = dayjs().subtract(1, 'month').endOf('month');
        break;
      default:
        selectedFrom = dayjs(customFrom, 'YYYY-MM-DDTHH:mm');
        selectedTo = dayjs(customTo, 'YYYY-MM-DDTHH:mm');
        break;
    }

    onShowStops({ 
      deviceIds, 
      groupIds, 
      from: selectedFrom.toISOString(), 
      to: selectedTo.toISOString() 
    });
  };

  const isStopsDisabled = () => {
    return !deviceIds.length && !groupIds.length || stopsLoading;
  };

  const onExportStops = useCatch(async ({ deviceIds, groupIds, from, to }) => {
    const query = new URLSearchParams({ from, to });
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    groupIds.forEach((groupId) => query.append('groupId', groupId));
    window.location.assign(`/api/reports/stops/xlsx?${query.toString()}`);
  });

  const exportStopsReport = () => {
    let selectedFrom;
    let selectedTo;
    switch (period) {
      case 'today':
        selectedFrom = dayjs().startOf('day');
        selectedTo = dayjs().endOf('day');
        break;
      case 'yesterday':
        selectedFrom = dayjs().subtract(1, 'day').startOf('day');
        selectedTo = dayjs().subtract(1, 'day').endOf('day');
        break;
      case 'thisWeek':
        selectedFrom = dayjs().startOf('week');
        selectedTo = dayjs().endOf('week');
        break;
      case 'previousWeek':
        selectedFrom = dayjs().subtract(1, 'week').startOf('week');
        selectedTo = dayjs().subtract(1, 'week').endOf('week');
        break;
      case 'thisMonth':
        selectedFrom = dayjs().startOf('month');
        selectedTo = dayjs().endOf('month');
        break;
      case 'previousMonth':
        selectedFrom = dayjs().subtract(1, 'month').startOf('month');
        selectedTo = dayjs().subtract(1, 'month').endOf('month');
        break;
      default:
        selectedFrom = dayjs(customFrom, 'YYYY-MM-DDTHH:mm');
        selectedTo = dayjs(customTo, 'YYYY-MM-DDTHH:mm');
        break;
    }

    onExportStops({ 
      deviceIds, 
      groupIds, 
      from: selectedFrom.toISOString(), 
      to: selectedTo.toISOString() 
    });
  };

  const formatStopValue = (item, key) => {
    const value = item[key];
    switch (key) {
      case 'deviceId':
        return devices[value]?.name;
      case 'startTime':
      case 'endTime':
        return formatTime(value, 'minutes');
      case 'startOdometer':
        return formatDistance(value, distanceUnit, t);
      case 'duration':
        return formatNumericHours(value, t);
      case 'engineHours':
        return value > 0 ? formatNumericHours(value, t) : null;
      case 'spentFuel':
        return value > 0 ? formatVolume(value, volumeUnit, t) : null;
      case 'address':
        return (<AddressValue latitude={item.latitude} longitude={item.longitude} originalAddress={value} />);
      default:
        return value;
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="reports-popover"
          initial={{ x: !desktop ? 0 : -400, y: !desktop ? 100 : 0, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          exit={{ x: !desktop ? 0 : -400, y: !desktop ? 100 : 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            position: 'fixed',
            top: !desktop ? 'auto' : '8px',
            bottom: !desktop ? '0px' : 'auto',
            left: !desktop ? '0px' : (isMenuExpanded ? '200px' : '63px'),
            width: !desktop ? '100vw' : `calc(100vw - ${isMenuExpanded ? '200px' : '63px'} - 10px)`,
            height: !desktop ? '50vh' : 'calc(100vh - 16px)',
            zIndex: 10001,
            pointerEvents: 'auto',
            transition: 'left 0.3s ease'
          }}
        >
          <div style={{
            height: '100%',
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: !desktop ? '0px' : '0px 16px 16px 0px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          }}>
            {/* Header */}
            <div style={{
              padding: '20px',
              borderBottom: `1px solid ${colors.border}`,
              backgroundColor: colors.surface,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: '12px'
            }}>
              <IconButton
                onClick={onClose}
                size="small"
                style={{ color: colors.textSecondary }}
              >
                <CloseIcon size={20} />
              </IconButton>
              <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                {t('reportTitle')}
              </Typography>
            </div>

            {/* Tabs */}
            <Box sx={{ 
              borderBottom: `1px solid ${colors.border}`,
              marginBottom: '16px',
            }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="on"
                sx={{
                  '& .MuiTabs-flexContainer': {
                    justifyContent: 'center',
                  },
                  '& .MuiTab-root': {
                    color: '#666666',
                    fontSize: '12px',
                    fontWeight: '500',
                    textTransform: 'none',
                    minHeight: '40px',
                    padding: '8px 16px',
                    '&.Mui-selected': {
                      color: '#1976d2',
                      fontWeight: '600',
                      backgroundColor: 'transparent',
                    },
                    '&:hover': {
                      color: '#1976d2',
                      backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    },
                    '&.Mui-selected:hover': {
                      color: '#1976d2',
                      backgroundColor: 'rgba(25, 118, 210, 0.15)',
                    },
                    '& .MuiTab-iconWrapper': {
                      marginRight: '8px',
                      fontSize: '20px',
                    }
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#1976d2',
                    height: '2px',
                  },
                  '& .MuiTabs-scrollButtons': {
                    color: '#1976d2',
                    width: '40px',
                    '&.Mui-disabled': {
                      opacity: 0.3,
                    },
                  },
                  '& .MuiTabs-scrollButtonsDesktop': {
                    display: 'flex',
                  }
                }}
              >
                {visibleTabs.map((tab, index) => (
                  <Tab
                    key={tab.key}
                    label={tab.title}
                    icon={tab.icon}
                    iconPosition="start"
                  />
                ))}
              </Tabs>
            </Box>

            {/* Content */}
            <div style={{ 
              padding: '20px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {visibleTabs[activeTab]?.key === 'combined' ? (
                <>
                  {/* Combined Report Form */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: desktop ? 'row' : 'column',
                    flexWrap: desktop ? 'wrap' : 'nowrap',
                    gap: '16px', 
                    marginBottom: '20px',
                    flexShrink: 0,
                    alignItems: desktop ? 'flex-end' : 'stretch'
                  }}>
                    {/* Device Selection */}
                    <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                      <SelectField
                        label={t('deviceTitle')}
                        data={Object.values(devices).sort((a, b) => a.name.localeCompare(b.name))}
                        value={deviceIds}
                        onChange={(e) => setDeviceIds(e.target.value)}
                        multiple
                        fullWidth
                        zIndex={10002}
                        MenuProps={{
                          disablePortal: false,
                          style: { zIndex: 10002 }
                        }}
                      />
                    </div>
                    
                    {/* Group Selection */}
                    <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                      <SelectField
                        label={t('settingsGroups')}
                        data={Object.values(groups).sort((a, b) => a.name.localeCompare(b.name))}
                        value={groupIds}
                        onChange={(e) => setGroupIds(e.target.value)}
                        multiple
                        fullWidth
                        zIndex={10002}
                        MenuProps={{
                          disablePortal: false,
                          style: { zIndex: 10002 }
                        }}
                      />
                    </div>
                    
                    {/* Period Selection */}
                    <div style={{ flex: desktop ? '1 1 150px' : '1 1 auto', minWidth: 0 }}>
                      <FormControl fullWidth>
                        <InputLabel>{t('reportPeriod')}</InputLabel>
                        <Select 
                          label={t('reportPeriod')} 
                          value={period} 
                          onChange={(e) => setPeriod(e.target.value)}
                          MenuProps={{
                            disablePortal: false,
                            style: { zIndex: 10002 }
                          }}
                        >
                          <MenuItem value="today">{t('reportToday')}</MenuItem>
                          <MenuItem value="yesterday">{t('reportYesterday')}</MenuItem>
                          <MenuItem value="thisWeek">{t('reportThisWeek')}</MenuItem>
                          <MenuItem value="previousWeek">{t('reportPreviousWeek')}</MenuItem>
                          <MenuItem value="thisMonth">{t('reportThisMonth')}</MenuItem>
                          <MenuItem value="previousMonth">{t('reportPreviousMonth')}</MenuItem>
                          <MenuItem value="custom">{t('reportCustom')}</MenuItem>
                        </Select>
                      </FormControl>
                    </div>
                    
                    {/* Custom Date Range */}
                    {period === 'custom' && (
                      <>
                        <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                          <TextField
                            label={t('reportFrom')}
                            type="datetime-local"
                            value={customFrom}
                            onChange={(e) => setCustomFrom(e.target.value)}
                            fullWidth
                          />
                        </div>
                        <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                          <TextField
                            label={t('reportTo')}
                            type="datetime-local"
                            value={customTo}
                            onChange={(e) => setCustomTo(e.target.value)}
                            fullWidth
                          />
                        </div>
                      </>
                    )}
                    
                    {/* Show Button */}
                    <div style={{ flex: desktop ? '0 0 auto' : '1 1 auto', minWidth: 0 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="secondary"
                        disabled={isCombinedDisabled()}
                        onClick={showCombinedReport}
                        startIcon={combinedLoading ? <CircularProgress size={20} /> : null}
                        style={{ minWidth: desktop ? '120px' : 'auto' }}
                      >
                        <Typography variant="button" noWrap>
                          {combinedLoading ? t('sharedLoading') : t('reportShow')}
                        </Typography>
                      </Button>
                    </div>
                  </div>
                  
                  {/* Combined Report Table */}
                  {combinedItems.length > 0 && (
                    <div style={{ 
                      flex: 1, 
                      overflow: 'auto',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px'
                    }}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>{t('sharedDevice')}</TableCell>
                            <TableCell>{t('positionFixTime')}</TableCell>
                            <TableCell>{t('sharedType')}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {!combinedLoading ? combinedItems.flatMap((item) => item.events.map((event, index) => (
                            <TableRow key={event.id}>
                              <TableCell>{index ? '' : devices[item.deviceId]?.name}</TableCell>
                              <TableCell>{formatTime(event.eventTime, 'seconds')}</TableCell>
                              <TableCell>{t(prefixString('event', event.type))}</TableCell>
                            </TableRow>
                          ))) : (
                            <TableRow>
                              <TableCell colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>
                                <CircularProgress />
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              ) : visibleTabs[activeTab]?.key === 'events' ? (
                <>
                  {/* Events Report Form */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: desktop ? 'row' : 'column',
                    flexWrap: desktop ? 'wrap' : 'nowrap',
                    gap: '16px', 
                    marginBottom: '20px',
                    flexShrink: 0,
                    alignItems: desktop ? 'flex-end' : 'stretch'
                  }}>
                    {/* Device Selection */}
                    <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                      <SelectField
                        label={t('deviceTitle')}
                        data={Object.values(devices).sort((a, b) => a.name.localeCompare(b.name))}
                        value={deviceIds}
                        onChange={(e) => setDeviceIds(e.target.value)}
                        multiple
                        fullWidth
                        zIndex={10002}
                        MenuProps={{
                          disablePortal: false,
                          style: { zIndex: 10002 }
                        }}
                      />
                    </div>
                    
                    {/* Group Selection */}
                    <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                      <SelectField
                        label={t('settingsGroups')}
                        data={Object.values(groups).sort((a, b) => a.name.localeCompare(b.name))}
                        value={groupIds}
                        onChange={(e) => setGroupIds(e.target.value)}
                        multiple
                        fullWidth
                        zIndex={10002}
                        MenuProps={{
                          disablePortal: false,
                          style: { zIndex: 10002 }
                        }}
                      />
                    </div>
                    
                    {/* Event Types Selection */}
                    <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                      <FormControl fullWidth>
                        <InputLabel>{t('reportEventTypes')}</InputLabel>
                        <Select
                          label={t('reportEventTypes')}
                          multiple
                          value={eventTypes}
                          onChange={(e, child) => {
                            let values = e.target.value;
                            const clicked = child.props.value;
                            if (values.includes('allEvents') && values.length > 1) {
                              values = [clicked];
                            }
                            setEventTypes(values);
                          }}
                          MenuProps={{
                            disablePortal: false,
                            style: { zIndex: 10002 }
                          }}
                        >
                          {allEventTypes.map(([key, string]) => (
                            <MenuItem key={key} value={key}>{t(string)}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                    
                    {/* Alarm Types Selection */}
                    {eventTypes[0] !== 'allEvents' && eventTypes.includes('alarm') && (
                      <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                        <SelectField
                          multiple
                          value={alarmTypes}
                          onChange={(e) => setAlarmTypes(e.target.value)}
                          data={alarms}
                          keyGetter={(it) => it.key}
                          titleGetter={(it) => it.name}
                          label={t('sharedAlarms')}
                          fullWidth
                          zIndex={10002}
                          MenuProps={{
                            disablePortal: false,
                            style: { zIndex: 10002 }
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Period Selection */}
                    <div style={{ flex: desktop ? '1 1 150px' : '1 1 auto', minWidth: 0 }}>
                      <FormControl fullWidth>
                        <InputLabel>{t('reportPeriod')}</InputLabel>
                        <Select 
                          label={t('reportPeriod')} 
                          value={period} 
                          onChange={(e) => setPeriod(e.target.value)}
                          MenuProps={{
                            disablePortal: false,
                            style: { zIndex: 10002 }
                          }}
                        >
                          <MenuItem value="today">{t('reportToday')}</MenuItem>
                          <MenuItem value="yesterday">{t('reportYesterday')}</MenuItem>
                          <MenuItem value="thisWeek">{t('reportThisWeek')}</MenuItem>
                          <MenuItem value="previousWeek">{t('reportPreviousWeek')}</MenuItem>
                          <MenuItem value="thisMonth">{t('reportThisMonth')}</MenuItem>
                          <MenuItem value="previousMonth">{t('reportPreviousMonth')}</MenuItem>
                          <MenuItem value="custom">{t('reportCustom')}</MenuItem>
                        </Select>
                      </FormControl>
                    </div>
                    
                    {/* Custom Date Range */}
                    {period === 'custom' && (
                      <>
                        <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                          <TextField
                            label={t('reportFrom')}
                            type="datetime-local"
                            value={customFrom}
                            onChange={(e) => setCustomFrom(e.target.value)}
                            fullWidth
                          />
                        </div>
                        <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                          <TextField
                            label={t('reportTo')}
                            type="datetime-local"
                            value={customTo}
                            onChange={(e) => setCustomTo(e.target.value)}
                            fullWidth
                          />
                        </div>
                      </>
                    )}
                    
                    {/* Show Button */}
                    <div style={{ flex: desktop ? '0 0 auto' : '1 1 auto', minWidth: 0 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="secondary"
                        disabled={isEventsDisabled()}
                        onClick={showEventsReport}
                        startIcon={eventsLoading ? <CircularProgress size={20} /> : null}
                        style={{ minWidth: desktop ? '120px' : 'auto' }}
                      >
                        <Typography variant="button" noWrap>
                          {eventsLoading ? t('sharedLoading') : t('reportShow')}
                        </Typography>
                      </Button>
                    </div>
                  </div>
                  
                  {/* Events Report Table */}
                  {eventsItems.length > 0 && (
                    <div style={{ 
                      flex: 1, 
                      overflow: 'auto',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px'
                    }}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell style={{ width: '1%', paddingLeft: '8px' }}></TableCell>
                            <TableCell>{t('sharedDevice')}</TableCell>
                            {eventsColumns.map((key) => (
                              <TableCell key={key}>{t(eventsColumnsMap.get(key))}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {!eventsLoading ? eventsItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell style={{ padding: '4px' }}>
                                {(item.positionId && (selectedEvent === item ? (
                                  <IconButton size="small" onClick={() => setSelectedEvent(null)}>
                                    <GpsFixedIcon fontSize="small" />
                                  </IconButton>
                                ) : (
                                  <IconButton size="small" onClick={() => setSelectedEvent(item)}>
                                    <LocationSearchingIcon fontSize="small" />
                                  </IconButton>
                                ))) || ''}
                              </TableCell>
                              <TableCell>{devices[item.deviceId]?.name}</TableCell>
                              {eventsColumns.map((key) => (
                                <TableCell key={key}>
                                  {formatEventValue(item, key)}
                                </TableCell>
                              ))}
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={eventsColumns.length + 2} style={{ textAlign: 'center', padding: '20px' }}>
                                <CircularProgress />
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              ) : visibleTabs[activeTab]?.key === 'trips' ? (
                <>
                  {/* Trips Report Form */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: desktop ? 'row' : 'column',
                    flexWrap: desktop ? 'wrap' : 'nowrap',
                    gap: '16px', 
                    marginBottom: '20px',
                    flexShrink: 0,
                    alignItems: desktop ? 'flex-end' : 'stretch'
                  }}>
                    {/* Device Selection */}
                    <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                      <SelectField
                        label={t('deviceTitle')}
                        data={Object.values(devices).sort((a, b) => a.name.localeCompare(b.name))}
                        value={deviceIds}
                        onChange={(e) => setDeviceIds(e.target.value)}
                        multiple
                        fullWidth
                        zIndex={10002}
                        MenuProps={{
                          disablePortal: false,
                          style: { zIndex: 10002 }
                        }}
                      />
                    </div>
                    
                    {/* Group Selection */}
                    <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                      <SelectField
                        label={t('settingsGroups')}
                        data={Object.values(groups).sort((a, b) => a.name.localeCompare(b.name))}
                        value={groupIds}
                        onChange={(e) => setGroupIds(e.target.value)}
                        multiple
                        fullWidth
                        zIndex={10002}
                        MenuProps={{
                          disablePortal: false,
                          style: { zIndex: 10002 }
                        }}
                      />
                    </div>
                    
                    {/* Period Selection */}
                    <div style={{ flex: desktop ? '1 1 150px' : '1 1 auto', minWidth: 0 }}>
                      <FormControl fullWidth>
                        <InputLabel>{t('reportPeriod')}</InputLabel>
                        <Select 
                          label={t('reportPeriod')} 
                          value={period} 
                          onChange={(e) => setPeriod(e.target.value)}
                          MenuProps={{
                            disablePortal: false,
                            style: { zIndex: 10002 }
                          }}
                        >
                          <MenuItem value="today">{t('reportToday')}</MenuItem>
                          <MenuItem value="yesterday">{t('reportYesterday')}</MenuItem>
                          <MenuItem value="thisWeek">{t('reportThisWeek')}</MenuItem>
                          <MenuItem value="previousWeek">{t('reportPreviousWeek')}</MenuItem>
                          <MenuItem value="thisMonth">{t('reportThisMonth')}</MenuItem>
                          <MenuItem value="previousMonth">{t('reportPreviousMonth')}</MenuItem>
                          <MenuItem value="custom">{t('reportCustom')}</MenuItem>
                        </Select>
                      </FormControl>
                    </div>
                    
                    {/* Custom Date Range */}
                    {period === 'custom' && (
                      <>
                        <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                          <TextField
                            label={t('reportFrom')}
                            type="datetime-local"
                            value={customFrom}
                            onChange={(e) => setCustomFrom(e.target.value)}
                            fullWidth
                          />
                        </div>
                        <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                          <TextField
                            label={t('reportTo')}
                            type="datetime-local"
                            value={customTo}
                            onChange={(e) => setCustomTo(e.target.value)}
                            fullWidth
                          />
                        </div>
                      </>
                    )}
                    
                    {/* Column Selection */}
                    <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                      <FormControl fullWidth>
                        <InputLabel>{t('sharedColumns')}</InputLabel>
                        <Select
                          label={t('sharedColumns')}
                          value={tripsColumns}
                          onChange={(e) => setTripsColumns(e.target.value)}
                          multiple
                          disabled={tripsLoading}
                          MenuProps={{
                            disablePortal: false,
                            style: { zIndex: 10002 }
                          }}
                        >
                          {tripsColumnsArray.map(([key, string]) => (
                            <MenuItem key={key} value={key}>{t(string)}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                    
                    {/* Show Button */}
                    <div style={{ flex: desktop ? '0 0 auto' : '1 1 auto', minWidth: 0 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="secondary"
                        disabled={isTripsDisabled()}
                        onClick={showTripsReport}
                        startIcon={tripsLoading ? <CircularProgress size={20} /> : null}
                        style={{ 
                          minWidth: desktop ? '120px' : 'auto',
                          color: colors.text,
                          borderColor: colors.border
                        }}
                      >
                        <Typography variant="button" noWrap style={{ color: colors.text }}>
                          {tripsLoading ? t('sharedLoading') : t('reportShow')}
                        </Typography>
                      </Button>
                    </div>
                    
                    {/* Export Button */}
                    <div style={{ flex: desktop ? '0 0 auto' : '1 1 auto', minWidth: 0 }}>
                      <Button
                        variant="outlined"
                        color="primary"
                        disabled={isTripsDisabled() || tripsItems.length === 0}
                        onClick={exportTripsReport}
                        style={{ 
                          minWidth: '40px',
                          height: '40px',
                          padding: '0',
                          color: colors.text,
                          borderColor: colors.border,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <DownloadIcon />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Trips Report Table */}
                  {tripsItems.length > 0 && (
                    <div style={{ 
                      flex: 1, 
                      overflow: 'auto',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px'
                    }}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell style={{ width: '1%', paddingLeft: '8px' }}></TableCell>
                            <TableCell>{t('sharedDevice')}</TableCell>
                            {tripsColumns.map((key) => (
                              <TableCell key={key}>{t(tripsColumnsMap.get(key))}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {!tripsLoading ? tripsItems.map((item) => (
                            <TableRow key={item.startPositionId}>
                              <TableCell style={{ padding: '4px' }}>
                                {selectedTrip === item ? (
                                  <IconButton size="small" onClick={() => setSelectedTrip(null)}>
                                    <GpsFixedIcon fontSize="small" />
                                  </IconButton>
                                ) : (
                                  <IconButton size="small" onClick={() => setSelectedTrip(item)}>
                                    <LocationSearchingIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </TableCell>
                              <TableCell>{devices[item.deviceId]?.name}</TableCell>
                              {tripsColumns.map((key) => (
                                <TableCell key={key}>
                                  {formatTripValue(item, key)}
                                </TableCell>
                              ))}
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={tripsColumns.length + 2} style={{ textAlign: 'center', padding: '20px' }}>
                                <CircularProgress />
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              ) : visibleTabs[activeTab]?.key === 'stops' ? (
                <>
                  {/* Stops Report Form */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: desktop ? 'row' : 'column',
                    flexWrap: desktop ? 'wrap' : 'nowrap',
                    gap: '16px', 
                    marginBottom: '20px',
                    flexShrink: 0,
                    alignItems: desktop ? 'flex-end' : 'stretch'
                  }}>
                    {/* Device Selection */}
                    <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                      <SelectField
                        label={t('deviceTitle')}
                        data={Object.values(devices).sort((a, b) => a.name.localeCompare(b.name))}
                        value={deviceIds}
                        onChange={(e) => setDeviceIds(e.target.value)}
                        multiple
                        fullWidth
                        zIndex={10002}
                        MenuProps={{
                          disablePortal: false,
                          style: { zIndex: 10002 }
                        }}
                      />
                    </div>
                    
                    {/* Group Selection */}
                    <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                      <SelectField
                        label={t('settingsGroups')}
                        data={Object.values(groups).sort((a, b) => a.name.localeCompare(b.name))}
                        value={groupIds}
                        onChange={(e) => setGroupIds(e.target.value)}
                        multiple
                        fullWidth
                        zIndex={10002}
                        MenuProps={{
                          disablePortal: false,
                          style: { zIndex: 10002 }
                        }}
                      />
                    </div>
                    
                    {/* Period Selection */}
                    <div style={{ flex: desktop ? '1 1 150px' : '1 1 auto', minWidth: 0 }}>
                      <FormControl fullWidth>
                        <InputLabel>{t('reportPeriod')}</InputLabel>
                        <Select 
                          label={t('reportPeriod')} 
                          value={period} 
                          onChange={(e) => setPeriod(e.target.value)}
                          MenuProps={{
                            disablePortal: false,
                            style: { zIndex: 10002 }
                          }}
                        >
                          <MenuItem value="today">{t('reportToday')}</MenuItem>
                          <MenuItem value="yesterday">{t('reportYesterday')}</MenuItem>
                          <MenuItem value="thisWeek">{t('reportThisWeek')}</MenuItem>
                          <MenuItem value="previousWeek">{t('reportPreviousWeek')}</MenuItem>
                          <MenuItem value="thisMonth">{t('reportThisMonth')}</MenuItem>
                          <MenuItem value="previousMonth">{t('reportPreviousMonth')}</MenuItem>
                          <MenuItem value="custom">{t('reportCustom')}</MenuItem>
                        </Select>
                      </FormControl>
                    </div>
                    
                    {/* Custom Date Range */}
                    {period === 'custom' && (
                      <>
                        <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                          <TextField
                            label={t('reportFrom')}
                            type="datetime-local"
                            value={customFrom}
                            onChange={(e) => setCustomFrom(e.target.value)}
                            fullWidth
                          />
                        </div>
                        <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                          <TextField
                            label={t('reportTo')}
                            type="datetime-local"
                            value={customTo}
                            onChange={(e) => setCustomTo(e.target.value)}
                            fullWidth
                          />
                        </div>
                      </>
                    )}
                    
                    {/* Column Selection */}
                    <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                      <FormControl fullWidth>
                        <InputLabel>{t('sharedColumns')}</InputLabel>
                        <Select
                          label={t('sharedColumns')}
                          value={stopsColumns}
                          onChange={(e) => setStopsColumns(e.target.value)}
                          multiple
                          disabled={stopsLoading}
                          MenuProps={{
                            disablePortal: false,
                            style: { zIndex: 10002 }
                          }}
                        >
                          {stopsColumnsArray.map(([key, string]) => (
                            <MenuItem key={key} value={key}>{t(string)}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                    
                    {/* Show Button */}
                    <div style={{ flex: desktop ? '0 0 auto' : '1 1 auto', minWidth: 0 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="secondary"
                        disabled={isStopsDisabled()}
                        onClick={showStopsReport}
                        startIcon={stopsLoading ? <CircularProgress size={20} /> : null}
                        style={{ 
                          minWidth: desktop ? '120px' : 'auto',
                          color: colors.text,
                          borderColor: colors.border
                        }}
                      >
                        <Typography variant="button" noWrap style={{ color: colors.text }}>
                          {stopsLoading ? t('sharedLoading') : t('reportShow')}
                        </Typography>
                      </Button>
                    </div>
                    
                    {/* Export Button */}
                    <div style={{ flex: desktop ? '0 0 auto' : '1 1 auto', minWidth: 0 }}>
                      <Button
                        variant="outlined"
                        color="primary"
                        disabled={isStopsDisabled() || stopsItems.length === 0}
                        onClick={exportStopsReport}
                        style={{ 
                          minWidth: '40px',
                          height: '40px',
                          padding: '0',
                          color: colors.text,
                          borderColor: colors.border,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <DownloadIcon />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Stops Report Table */}
                  {stopsItems.length > 0 && (
                    <div style={{ 
                      flex: 1, 
                      overflow: 'auto',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px'
                    }}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell style={{ width: '1%', paddingLeft: '8px' }}></TableCell>
                            <TableCell>{t('sharedDevice')}</TableCell>
                            {stopsColumns.map((key) => (
                              <TableCell key={key}>{t(stopsColumnsMap.get(key))}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {!stopsLoading ? stopsItems.map((item) => (
                            <TableRow key={item.positionId}>
                              <TableCell style={{ padding: '4px' }}>
                                {selectedStop === item ? (
                                  <IconButton size="small" onClick={() => setSelectedStop(null)}>
                                    <GpsFixedIcon fontSize="small" />
                                  </IconButton>
                                ) : (
                                  <IconButton size="small" onClick={() => setSelectedStop(item)}>
                                    <LocationSearchingIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </TableCell>
                              <TableCell>{devices[item.deviceId]?.name}</TableCell>
                              {stopsColumns.map((key) => (
                                <TableCell key={key}>
                                  {formatStopValue(item, key)}
                                </TableCell>
                              ))}
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={stopsColumns.length + 2} style={{ textAlign: 'center', padding: '20px' }}>
                                <CircularProgress />
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%'
                }}>
                  <Typography variant="body1" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                    {visibleTabs[activeTab] ? visibleTabs[activeTab].title : t('sharedComingSoon')}
                  </Typography>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingReportsPopover;
