import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors, useTheme } from '../common/components/ThemeProvider';
import { useAdministrator, useRestriction } from '../common/util/permissions';
import { sessionActions } from '../store';
import { Card } from './ui/card';
import { Typography, IconButton, Tabs, Tab, Box, Table, TableBody, TableCell, TableHead, TableRow, FormControl, InputLabel, Select, MenuItem, Button, TextField, CircularProgress, Portal, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, Chip } from '@mui/material';
import { ChevronLeft as CloseIcon } from 'lucide-react';
import { useCatch, useEffectAsync } from '../reactHelper';
import { formatTime, formatSpeed, formatDistance, formatVolume, formatNumericHours } from '../common/util/formatter';
import { prefixString, unprefixString } from '../common/util/stringUtils';
import fetchOrThrow from '../common/util/fetchOrThrow';
import SelectField from '../common/components/SelectField';
import { useAttributePreference } from '../common/util/preferences';
import { useTranslationKeys } from '../common/components/LocalizationProvider';
import AddressValue from '../common/components/AddressValue';
import PositionValue from '../common/components/PositionValue';
import usePositionAttributes from '../common/attributes/usePositionAttributes';
import {
  altitudeFromMeters, distanceFromMeters, speedFromKnots, speedToKnots, volumeFromLiters,
} from '../common/util/converter';
import {
  Brush, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import dayjs from 'dayjs';
import StarIcon from '@mui/icons-material/Star';
import TimelineIcon from '@mui/icons-material/Timeline';
import PauseCircleFilledIcon from '@mui/icons-material/PauseCircleFilled';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DeleteIcon from '@mui/icons-material/Delete';
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
  const { theme } = useTheme();
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

  // Summary report state
  const [summaryItems, setSummaryItems] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryColumns, setSummaryColumns] = useState(['startTime', 'distance', 'averageSpeed']);
  const [daily, setDaily] = useState(false);

  // Chart report state
  const [chartItems, setChartItems] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartTypes, setChartTypes] = useState(['speed']);
  const [selectedChartTypes, setSelectedChartTypes] = useState(['speed']);
  const [timeType, setTimeType] = useState('fixTime');

  // Positions report state
  const [positionsItems, setPositionsItems] = useState([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [positionsColumns, setPositionsColumns] = useState(['fixTime', 'latitude', 'longitude', 'speed', 'address']);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [geofenceId, setGeofenceId] = useState(null);

  // Logs report state
  const [logsLoading, setLogsLoading] = useState(false);

  // Scheduled report state
  const [scheduledItems, setScheduledItems] = useState([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [scheduledToDelete, setScheduledToDelete] = useState(null);

  // Statistics report state
  const [statisticsItems, setStatisticsItems] = useState([]);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [statisticsColumns, setStatisticsColumns] = useState(['captureTime', 'activeUsers', 'activeDevices', 'messagesStored']);

  // Audit report state
  const [auditItems, setAuditItems] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditColumns, setAuditColumns] = useState(['actionTime', 'userId', 'actionType', 'objectType']);

  // Statistics columns configuration
  const statisticsColumnsArray = [
    ['captureTime', 'statisticsCaptureTime'],
    ['activeUsers', 'statisticsActiveUsers'],
    ['activeDevices', 'statisticsActiveDevices'],
    ['requests', 'statisticsRequests'],
    ['messagesReceived', 'statisticsMessagesReceived'],
    ['messagesStored', 'statisticsMessagesStored'],
    ['mailSent', 'notificatorMail'],
    ['smsSent', 'notificatorSms'],
    ['geocoderRequests', 'statisticsGeocoder'],
    ['geolocationRequests', 'statisticsGeolocation'],
  ];
  const statisticsColumnsMap = new Map(statisticsColumnsArray);

  // Audit columns configuration
  const auditColumnsArray = [
    ['actionTime', 'positionServerTime'],
    ['address', 'positionAddress'],
    ['userId', 'settingsUser'],
    ['actionType', 'sharedActionType'],
    ['objectType', 'sharedQbjectType'],
    ['objectId', 'deviceIdentifier'],
  ];
  const auditColumnsMap = new Map(auditColumnsArray);

  const dispatch = useDispatch();
  const devices = useSelector((state) => state.devices.items);
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const groups = useSelector((state) => state.groups.items);
  const geofences = useSelector((state) => state.geofences.items);
  const calendars = useSelector((state) => state.calendars.items);
  const logs = useSelector((state) => state.session.logs);
  const speedUnit = useAttributePreference('speedUnit');
  const distanceUnit = useAttributePreference('distanceUnit');
  const volumeUnit = useAttributePreference('volumeUnit');
  const altitudeUnit = useAttributePreference('altitudeUnit');

  // Position attributes for chart
  const positionAttributes = usePositionAttributes(t);

  // Track if we've already pre-selected the device when popover opened
  const prevIsVisibleRef = useRef(isVisible);
  
  // Create a static snapshot of devices list that only updates when popover opens
  // This prevents Autocomplete from resetting when positions arrive via websocket
  const [staticDevicesList, setStaticDevicesList] = useState([]);

  // Update static devices list and pre-select device ONLY when popover first opens
  useEffect(() => {
    if (isVisible && !prevIsVisibleRef.current) {
      // Create a snapshot of devices as an array - this won't change until popover reopens
      const devicesSnapshot = Object.values(devices).map(device => ({ ...device }));
      // Sort once when creating snapshot to avoid sorting on every render
      devicesSnapshot.sort((a, b) => a.name.localeCompare(b.name));
      setStaticDevicesList(devicesSnapshot);
      
      // Pre-select the device if one is selected
      if (selectedDeviceId && devices[selectedDeviceId]) {
        setDeviceIds([selectedDeviceId]);
      }
    }
    
    prevIsVisibleRef.current = isVisible;
  }, [isVisible]); // Only depend on isVisible, not devices or selectedDeviceId

  // Memoize the sorted options to prevent recalculation on every render
  const sortedDevicesList = useMemo(() => {
    return staticDevicesList.length > 0 
      ? staticDevicesList 
      : [];
  }, [staticDevicesList]);

  // Memoize the selected devices value to prevent creating new arrays on every render
  // This is critical - without memoization, a new array is created on every render
  // which causes Autocomplete to think the value changed and resets
  const selectedDevicesValue = useMemo(() => {
    if (deviceIds.length === 0 || sortedDevicesList.length === 0) {
      return [];
    }
    return sortedDevicesList.filter(device => deviceIds.includes(device.id));
  }, [deviceIds, sortedDevicesList]);

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

  // Summary columns configuration
  const summaryColumnsArray = [
    ['startTime', 'reportStartDate'],
    ['distance', 'sharedDistance'],
    ['startOdometer', 'reportStartOdometer'],
    ['endOdometer', 'reportEndOdometer'],
    ['averageSpeed', 'reportAverageSpeed'],
    ['maxSpeed', 'reportMaximumSpeed'],
    ['engineHours', 'reportEngineHours'],
    ['startHours', 'reportStartEngineHours'],
    ['endHours', 'reportEndEngineHours'],
    ['spentFuel', 'reportSpentFuel'],
  ];
  const summaryColumnsMap = new Map(summaryColumnsArray);

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

  // Summary report functionality
  const onShowSummary = useCatch(async ({ deviceIds, groupIds, from, to }) => {
    const query = new URLSearchParams({ from, to, daily });
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    groupIds.forEach((groupId) => query.append('groupId', groupId));
    setSummaryLoading(true);
    try {
      const response = await fetchOrThrow(`/api/reports/summary?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      setSummaryItems(await response.json());
    } finally {
      setSummaryLoading(false);
    }
  });

  const showSummaryReport = () => {
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

    onShowSummary({ 
      deviceIds, 
      groupIds, 
      from: selectedFrom.toISOString(), 
      to: selectedTo.toISOString() 
    });
  };

  const isSummaryDisabled = () => {
    return !deviceIds.length && !groupIds.length || summaryLoading;
  };

  const onExportSummary = useCatch(async ({ deviceIds, groupIds, from, to }) => {
    const query = new URLSearchParams({ from, to, daily });
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    groupIds.forEach((groupId) => query.append('groupId', groupId));
    window.location.assign(`/api/reports/summary/xlsx?${query.toString()}`);
  });

  const exportSummaryReport = () => {
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

    onExportSummary({ 
      deviceIds, 
      groupIds, 
      from: selectedFrom.toISOString(), 
      to: selectedTo.toISOString() 
    });
  };

  const formatSummaryValue = (item, key) => {
    const value = item[key];
    switch (key) {
      case 'deviceId':
        return devices[value]?.name;
      case 'startTime':
        return formatTime(value, 'date');
      case 'startOdometer':
      case 'endOdometer':
      case 'distance':
        return formatDistance(value, distanceUnit, t);
      case 'averageSpeed':
      case 'maxSpeed':
        return value > 0 ? formatSpeed(value, speedUnit, t) : null;
      case 'engineHours':
      case 'startHours':
      case 'endHours':
        return value > 0 ? formatNumericHours(value, t) : null;
      case 'spentFuel':
        return value > 0 ? formatVolume(value, volumeUnit, t) : null;
      default:
        return value;
    }
  };

  // Chart report functionality
  const onShowChart = useCatch(async ({ deviceIds, from, to }) => {
    const query = new URLSearchParams({ from, to });
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    setChartLoading(true);
    try {
      const response = await fetchOrThrow(`/api/reports/route?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      const positions = await response.json();
      const keySet = new Set();
      const keyList = [];
      const formattedPositions = positions.map((position) => {
        const data = { ...position, ...position.attributes };
        const formatted = {};
        formatted.fixTime = dayjs(position.fixTime).valueOf();
        formatted.deviceTime = dayjs(position.deviceTime).valueOf();
        formatted.serverTime = dayjs(position.serverTime).valueOf();
        Object.keys(data).filter((key) => !['id', 'deviceId'].includes(key)).forEach((key) => {
          const value = data[key];
          if (typeof value === 'number') {
            keySet.add(key);
            const definition = positionAttributes[key] || {};
            switch (definition.dataType) {
              case 'speed':
                if (key == 'obdSpeed') {
                  formatted[key] = speedFromKnots(speedToKnots(value, 'kmh'), speedUnit).toFixed(2);
                } else {
                  formatted[key] = speedFromKnots(value, speedUnit).toFixed(2);
                }
                break;
              case 'altitude':
                formatted[key] = altitudeFromMeters(value, altitudeUnit).toFixed(2);
                break;
              case 'distance':
                formatted[key] = distanceFromMeters(value, distanceUnit).toFixed(2);
                break;
              case 'volume':
                formatted[key] = volumeFromLiters(value, volumeUnit).toFixed(2);
                break;
              case 'hours':
                formatted[key] = (value / 1000).toFixed(2);
                break;
              default:
                formatted[key] = value;
                break;
            }
          }
        });
        return formatted;
      });
      Object.keys(positionAttributes).forEach((key) => {
        if (keySet.has(key)) {
          keyList.push(key);
          keySet.delete(key);
        }
      });
      setChartTypes([...keyList, ...keySet]);
      setChartItems(formattedPositions);
    } finally {
      setChartLoading(false);
    }
  });

  const showChartReport = () => {
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

    onShowChart({ 
      deviceIds, 
      from: selectedFrom.toISOString(), 
      to: selectedTo.toISOString() 
    });
  };

  const isChartDisabled = () => {
    return !deviceIds.length || chartLoading;
  };

  // Filter chart items to only show data within selected time range
  const filteredChartItems = useMemo(() => {
    if (chartItems.length === 0) return [];
    
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
    
    const fromTime = selectedFrom.valueOf();
    const toTime = selectedTo.valueOf();
    
    return chartItems.filter(item => {
      const itemTime = item[timeType];
      return itemTime >= fromTime && itemTime <= toTime;
    });
  }, [chartItems, period, customFrom, customTo, timeType]);

  // Chart calculations (using filtered data)
  const chartValues = filteredChartItems.map((it) => selectedChartTypes.map((type) => it[type]).filter((value) => value != null));
  const minValue = chartValues.length ? Math.min(...chartValues) : 0;
  const maxValue = chartValues.length ? Math.max(...chartValues) : 100;
  const valueRange = maxValue - minValue;

  const colorPalette = [
    '#1976d2', // Blue
    '#dc004e', // Red
    '#9c27b0', // Purple
    '#ed6c02', // Orange
    '#2e7d32', // Green
    '#d32f2f', // Dark Red
    '#7b1fa2', // Dark Purple
  ];

  // Positions report functionality
  const onShowPositions = useCatch(async ({ deviceIds, from, to }) => {
    const query = new URLSearchParams({ from, to });
    if (geofenceId) {
      query.append('geofenceId', geofenceId);
    }
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    setPositionsLoading(true);
    try {
      const response = await fetchOrThrow(`/api/positions?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      const data = await response.json();
      const keySet = new Set();
      const keyList = [];
      data.forEach((position) => {
        Object.keys(position).forEach((it) => keySet.add(it));
        Object.keys(position.attributes).forEach((it) => keySet.add(it));
      });
      ['id', 'deviceId', 'outdated', 'network', 'attributes'].forEach((key) => keySet.delete(key));
      Object.keys(positionAttributes).forEach((key) => {
        if (keySet.has(key)) {
          keyList.push(key);
          keySet.delete(key);
        }
      });
      setAvailableColumns([...keyList, ...keySet].map((key) => [key, positionAttributes[key]?.name || key]));
      setPositionsItems(data);
    } finally {
      setPositionsLoading(false);
    }
  });

  const showPositionsReport = () => {
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

    onShowPositions({ 
      deviceIds, 
      from: selectedFrom.toISOString(), 
      to: selectedTo.toISOString() 
    });
  };

  const isPositionsDisabled = () => {
    return !deviceIds.length || positionsLoading;
  };

  const onExportPositions = useCatch(async ({ deviceIds, from, to }) => {
    const query = new URLSearchParams({ from, to });
    if (geofenceId) {
      query.append('geofenceId', geofenceId);
    }
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    window.location.assign(`/api/positions/csv?${query.toString()}`);
  });

  const exportPositionsReport = () => {
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

    onExportPositions({ 
      deviceIds, 
      from: selectedFrom.toISOString(), 
      to: selectedTo.toISOString() 
    });
  };

  // Logs functionality
  const registerDevice = (uniqueId) => {
    // Navigate to device settings with uniqueId
    window.open(`/settings/device?uniqueId=${uniqueId}`, '_blank');
  };

  // Enable logs when logs tab is active
  useEffect(() => {
    if (visibleTabs[activeTab]?.key === 'logs') {
      dispatch(sessionActions.enableLogs(true));
    } else {
      dispatch(sessionActions.enableLogs(false));
    }
    
    return () => {
      if (visibleTabs[activeTab]?.key === 'logs') {
        dispatch(sessionActions.enableLogs(false));
      }
    };
  }, [activeTab, dispatch]);

  // Scheduled reports functionality
  const formatScheduledType = (type) => {
    switch (type) {
      case 'events':
        return t('reportEvents');
      case 'route':
        return t('reportPositions');
      case 'summary':
        return t('reportSummary');
      case 'trips':
        return t('reportTrips');
      case 'stops':
        return t('reportStops');
      default:
        return type;
    }
  };

  const loadScheduledReports = async () => {
    setScheduledLoading(true);
    try {
      const response = await fetchOrThrow('/api/reports');
      setScheduledItems(await response.json());
    } catch (error) {
      console.error('Failed to load scheduled reports:', error);
    } finally {
      setScheduledLoading(false);
    }
  };

  // Load scheduled reports when tab is active
  useEffect(() => {
    if (visibleTabs[activeTab]?.key === 'scheduled') {
      loadScheduledReports();
    }
  }, [activeTab]);

  // Cleanup all state variables when popover is closed
  useEffect(() => {
    if (!isVisible) {
      // Reset all report data arrays
      setCombinedItems([]);
      setEventsItems([]);
      setTripsItems([]);
      setStopsItems([]);
      setSummaryItems([]);
      setChartItems([]);
      setPositionsItems([]);
      setScheduledItems([]);
      setStatisticsItems([]);
      setAuditItems([]);

      // Reset all loading states
      setCombinedLoading(false);
      setEventsLoading(false);
      setTripsLoading(false);
      setStopsLoading(false);
      setSummaryLoading(false);
      setChartLoading(false);
      setPositionsLoading(false);
      setScheduledLoading(false);
      setStatisticsLoading(false);
      setAuditLoading(false);
      setLogsLoading(false);

      // Reset all filter and selection states
      setDeviceIds([]);
      setGroupIds([]);
      setPeriod('today');
      setCustomFrom(dayjs().subtract(1, 'hour').locale('en').format('YYYY-MM-DDTHH:mm'));
      setCustomTo(dayjs().locale('en').format('YYYY-MM-DDTHH:mm'));
      setEventTypes(['allEvents']);
      setAlarmTypes([]);
      setAllEventTypes([['allEvents', 'eventAll']]);
      setEventsColumns(['eventTime', 'type', 'attributes']);
      setSelectedEvent(null);
      setEventPosition(null);
      setTripsColumns(['startTime', 'endTime', 'distance', 'averageSpeed']);
      setSelectedTrip(null);
      setTripRoute(null);
      setStopsColumns(['startTime', 'endTime', 'startOdometer', 'address']);
      setSelectedStop(null);
      setSummaryColumns(['startTime', 'distance', 'averageSpeed']);
      setDaily(false);
      setChartTypes(['speed']);
      setSelectedChartTypes(['speed']);
      setTimeType('fixTime');
      setPositionsColumns(['fixTime', 'latitude', 'longitude', 'speed', 'address']);
      setSelectedPosition(null);
      setAvailableColumns([]);
      setGeofenceId(null);
      setStatisticsColumns(['captureTime', 'activeUsers', 'activeDevices', 'messagesStored']);
      setAuditColumns(['actionTime', 'userId', 'actionType', 'objectType']);

      // Reset dialog states
      setDeleteDialog(false);
      setScheduledToDelete(null);

      // Reset active tab
      setActiveTab(0);
    }
  }, [isVisible]);

  // Handle delete scheduled report
  const handleDeleteScheduled = (scheduled) => {
    setScheduledToDelete(scheduled);
    setDeleteDialog(true);
  };

  // Handle confirm delete
  const confirmDelete = useCatch(async () => {
    if (!scheduledToDelete?.id) return;
    
    try {
      await fetchOrThrow(`/api/reports/${scheduledToDelete.id}`, {
        method: 'DELETE',
      });
      cancelDelete();
      loadScheduledReports();
    } catch (error) {
      console.error('Failed to delete scheduled report:', error);
    }
  });

  // Handle cancel delete
  const cancelDelete = () => {
    setDeleteDialog(false);
    setScheduledToDelete(null);
  };

  // Delete scheduled report (legacy function for backward compatibility)
  const deleteScheduledReport = useCatch(async () => {
    if (!scheduledToDelete?.id) return;
    
    try {
      await fetchOrThrow(`/api/reports/${scheduledToDelete.id}`, {
        method: 'DELETE',
      });
      setDeleteDialog(false);
      setScheduledToDelete(null);
      loadScheduledReports();
    } catch (error) {
      console.error('Failed to delete scheduled report:', error);
    }
  });

  // Statistics functionality
  const onShowStatistics = useCatch(async ({ from, to }) => {
    setStatisticsLoading(true);
    try {
      const query = new URLSearchParams({ from, to });
      const response = await fetchOrThrow(`/api/statistics?${query.toString()}`);
      setStatisticsItems(await response.json());
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setStatisticsLoading(false);
    }
  });

  const showStatisticsReport = () => {
    const now = dayjs();
    let selectedFrom, selectedTo;

    switch (period) {
      case 'today':
        selectedFrom = now.startOf('day');
        selectedTo = now.endOf('day');
        break;
      case 'yesterday':
        selectedFrom = now.subtract(1, 'day').startOf('day');
        selectedTo = now.subtract(1, 'day').endOf('day');
        break;
      case 'thisWeek':
        selectedFrom = now.startOf('week');
        selectedTo = now.endOf('week');
        break;
      case 'lastWeek':
        selectedFrom = now.subtract(1, 'week').startOf('week');
        selectedTo = now.subtract(1, 'week').endOf('week');
        break;
      case 'thisMonth':
        selectedFrom = now.startOf('month');
        selectedTo = now.endOf('month');
        break;
      case 'lastMonth':
        selectedFrom = now.subtract(1, 'month').startOf('month');
        selectedTo = now.subtract(1, 'month').endOf('month');
        break;
      case 'thisYear':
        selectedFrom = now.startOf('year');
        selectedTo = now.endOf('year');
        break;
      case 'lastYear':
        selectedFrom = now.subtract(1, 'year').startOf('year');
        selectedTo = now.subtract(1, 'year').endOf('year');
        break;
      case 'custom':
        selectedFrom = dayjs(customFrom, 'YYYY-MM-DDTHH:mm');
        selectedTo = dayjs(customTo, 'YYYY-MM-DDTHH:mm');
        break;
    }

    onShowStatistics({ 
      from: selectedFrom.toISOString(), 
      to: selectedTo.toISOString() 
    });
  };

  // Audit functionality
  const onShowAudit = useCatch(async ({ from, to }) => {
    setAuditLoading(true);
    try {
      const query = new URLSearchParams({ from, to });
      const response = await fetchOrThrow(`/api/audit?${query.toString()}`);
      setAuditItems(await response.json());
    } catch (error) {
      console.error('Failed to load audit:', error);
    } finally {
      setAuditLoading(false);
    }
  });

  const showAuditReport = () => {
    const now = dayjs();
    let selectedFrom, selectedTo;

    switch (period) {
      case 'today':
        selectedFrom = now.startOf('day');
        selectedTo = now.endOf('day');
        break;
      case 'yesterday':
        selectedFrom = now.subtract(1, 'day').startOf('day');
        selectedTo = now.subtract(1, 'day').endOf('day');
        break;
      case 'thisWeek':
        selectedFrom = now.startOf('week');
        selectedTo = now.endOf('week');
        break;
      case 'previousWeek':
        selectedFrom = now.subtract(1, 'week').startOf('week');
        selectedTo = now.subtract(1, 'week').endOf('week');
        break;
      case 'thisMonth':
        selectedFrom = now.startOf('month');
        selectedTo = now.endOf('month');
        break;
      case 'previousMonth':
        selectedFrom = now.subtract(1, 'month').startOf('month');
        selectedTo = now.subtract(1, 'month').endOf('month');
        break;
      case 'custom':
        selectedFrom = dayjs(customFrom, 'YYYY-MM-DDTHH:mm');
        selectedTo = dayjs(customTo, 'YYYY-MM-DDTHH:mm');
        break;
    }

    onShowAudit({ 
      from: selectedFrom.toISOString(), 
      to: selectedTo.toISOString() 
    });
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="reports-popover"
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -400, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{
            position: 'fixed',
            top: !desktop ? 'auto' : '8px',
            bottom: !desktop ? '0px' : 'auto',
            left: !desktop ? '0px' : (isMenuExpanded ? '200px' : '63px'),
            width: !desktop ? '100vw' : `calc(100vw - ${isMenuExpanded ? '200px' : '63px'} - 10px)`,
            height: !desktop ? '100vh' : 'calc(100vh - 16px)',
            zIndex: 10002,
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
                scrollButtons="auto"
                style={{
                  borderBottom: `1px solid ${colors.border}`,
                  marginBottom: '16px',
                }}
                sx={{
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
                      <Autocomplete
                        multiple
                        options={sortedDevicesList}
                        getOptionLabel={(option) => option.name || ''}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        value={selectedDevicesValue}
                        onChange={(event, newValue) => {
                          setDeviceIds(newValue.map(device => device.id));
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={t('deviceTitle')}
                            placeholder={t('sharedSearchDevices') || 'Search devices...'}
                          />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              key={option.id}
                              label={option.name}
                              {...getTagProps({ index })}
                              size="small"
                            />
                          ))
                        }
                        fullWidth
                        size="small"
                        disablePortal={false}
                        ListboxProps={{
                          style: {
                            zIndex: 10003,
                          },
                        }}
                        componentsProps={{
                          popper: {
                            style: {
                              zIndex: 10003,
                            },
                          },
                        }}
                        PaperComponent={(props) => (
                          <div 
                            {...props} 
                            style={{ 
                              ...props.style, 
                              zIndex: 10003,
                              border: `1px solid ${colors.border}`,
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)',
                              borderRadius: '8px',
                              backgroundColor: colors.surface
                            }} 
                          />
                        )}
                        sx={{
                          '& .MuiAutocomplete-popper': {
                            zIndex: '10003 !important',
                          },
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
                      <Autocomplete
                        multiple
                        options={sortedDevicesList}
                        getOptionLabel={(option) => option.name || ''}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        value={selectedDevicesValue}
                        onChange={(event, newValue) => {
                          setDeviceIds(newValue.map(device => device.id));
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={t('deviceTitle')}
                            placeholder={t('sharedSearchDevices') || 'Search devices...'}
                          />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              key={option.id}
                              label={option.name}
                              {...getTagProps({ index })}
                              size="small"
                            />
                          ))
                        }
                        fullWidth
                        size="small"
                        disablePortal={false}
                        ListboxProps={{
                          style: {
                            zIndex: 10003,
                          },
                        }}
                        componentsProps={{
                          popper: {
                            style: {
                              zIndex: 10003,
                            },
                          },
                        }}
                        PaperComponent={(props) => (
                          <div 
                            {...props} 
                            style={{ 
                              ...props.style, 
                              zIndex: 10003,
                              border: `1px solid ${colors.border}`,
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)',
                              borderRadius: '8px',
                              backgroundColor: colors.surface
                            }} 
                          />
                        )}
                        sx={{
                          '& .MuiAutocomplete-popper': {
                            zIndex: '10003 !important',
                          },
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
                      <Autocomplete
                        multiple
                        options={sortedDevicesList}
                        getOptionLabel={(option) => option.name || ''}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        value={selectedDevicesValue}
                        onChange={(event, newValue) => {
                          setDeviceIds(newValue.map(device => device.id));
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={t('deviceTitle')}
                            placeholder={t('sharedSearchDevices') || 'Search devices...'}
                          />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              key={option.id}
                              label={option.name}
                              {...getTagProps({ index })}
                              size="small"
                            />
                          ))
                        }
                        fullWidth
                        size="small"
                        disablePortal={false}
                        ListboxProps={{
                          style: {
                            zIndex: 10003,
                          },
                        }}
                        componentsProps={{
                          popper: {
                            style: {
                              zIndex: 10003,
                            },
                          },
                        }}
                        PaperComponent={(props) => (
                          <div 
                            {...props} 
                            style={{ 
                              ...props.style, 
                              zIndex: 10003,
                              border: `1px solid ${colors.border}`,
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)',
                              borderRadius: '8px',
                              backgroundColor: colors.surface
                            }} 
                          />
                        )}
                        sx={{
                          '& .MuiAutocomplete-popper': {
                            zIndex: '10003 !important',
                          },
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
                    
                    {/* Show and Export Buttons Container */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: desktop ? 'row' : 'row',
                      gap: '8px',
                      flex: desktop ? '0 0 auto' : '1 1 auto',
                      minWidth: 0
                    }}>
                      {/* Show Button */}
                      <div style={{ flex: '1 1 50%', minWidth: 0 }}>
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
                      <div style={{ flex: '0 0 auto', minWidth: 0 }}>
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
                      <Autocomplete
                        multiple
                        options={sortedDevicesList}
                        getOptionLabel={(option) => option.name || ''}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        value={selectedDevicesValue}
                        onChange={(event, newValue) => {
                          setDeviceIds(newValue.map(device => device.id));
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={t('deviceTitle')}
                            placeholder={t('sharedSearchDevices') || 'Search devices...'}
                          />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              key={option.id}
                              label={option.name}
                              {...getTagProps({ index })}
                              size="small"
                            />
                          ))
                        }
                        fullWidth
                        size="small"
                        disablePortal={false}
                        ListboxProps={{
                          style: {
                            zIndex: 10003,
                          },
                        }}
                        componentsProps={{
                          popper: {
                            style: {
                              zIndex: 10003,
                            },
                          },
                        }}
                        PaperComponent={(props) => (
                          <div 
                            {...props} 
                            style={{ 
                              ...props.style, 
                              zIndex: 10003,
                              border: `1px solid ${colors.border}`,
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)',
                              borderRadius: '8px',
                              backgroundColor: colors.surface
                            }} 
                          />
                        )}
                        sx={{
                          '& .MuiAutocomplete-popper': {
                            zIndex: '10003 !important',
                          },
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
                    
                    {/* Show and Export Buttons Container */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: desktop ? 'row' : 'row',
                      gap: '8px',
                      flex: desktop ? '0 0 auto' : '1 1 auto',
                      minWidth: 0
                    }}>
                      {/* Show Button */}
                      <div style={{ flex: '1 1 50%', minWidth: 0 }}>
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
                      <div style={{ flex: '0 0 auto', minWidth: 0 }}>
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
              ) : visibleTabs[activeTab]?.key === 'summary' ? (
                <>
                  {/* Summary Report Form */}
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
                      <Autocomplete
                        multiple
                        options={sortedDevicesList}
                        getOptionLabel={(option) => option.name || ''}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        value={selectedDevicesValue}
                        onChange={(event, newValue) => {
                          setDeviceIds(newValue.map(device => device.id));
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={t('deviceTitle')}
                            placeholder={t('sharedSearchDevices') || 'Search devices...'}
                          />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              key={option.id}
                              label={option.name}
                              {...getTagProps({ index })}
                              size="small"
                            />
                          ))
                        }
                        fullWidth
                        size="small"
                        disablePortal={false}
                        ListboxProps={{
                          style: {
                            zIndex: 10003,
                          },
                        }}
                        componentsProps={{
                          popper: {
                            style: {
                              zIndex: 10003,
                            },
                          },
                        }}
                        PaperComponent={(props) => (
                          <div 
                            {...props} 
                            style={{ 
                              ...props.style, 
                              zIndex: 10003,
                              border: `1px solid ${colors.border}`,
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)',
                              borderRadius: '8px',
                              backgroundColor: colors.surface
                            }} 
                          />
                        )}
                        sx={{
                          '& .MuiAutocomplete-popper': {
                            zIndex: '10003 !important',
                          },
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
                    
                    {/* Type Selection (Summary/Daily) */}
                    <div style={{ flex: desktop ? '1 1 150px' : '1 1 auto', minWidth: 0 }}>
                      <FormControl fullWidth>
                        <InputLabel>{t('sharedType')}</InputLabel>
                        <Select 
                          label={t('sharedType')} 
                          value={daily} 
                          onChange={(e) => setDaily(e.target.value)}
                          MenuProps={{
                            disablePortal: false,
                            style: { zIndex: 10002 }
                          }}
                        >
                          <MenuItem value={false}>{t('reportSummary')}</MenuItem>
                          <MenuItem value={true}>{t('reportDaily')}</MenuItem>
                        </Select>
                      </FormControl>
                    </div>
                    
                    {/* Column Selection */}
                    <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                      <FormControl fullWidth>
                        <InputLabel>{t('sharedColumns')}</InputLabel>
                        <Select
                          label={t('sharedColumns')}
                          value={summaryColumns}
                          onChange={(e) => setSummaryColumns(e.target.value)}
                          multiple
                          disabled={summaryLoading}
                          MenuProps={{
                            disablePortal: false,
                            style: { zIndex: 10002 }
                          }}
                        >
                          {summaryColumnsArray.map(([key, string]) => (
                            <MenuItem key={key} value={key}>{t(string)}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                    
                    {/* Show and Export Buttons Container */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: desktop ? 'row' : 'row',
                      gap: '8px',
                      flex: desktop ? '0 0 auto' : '1 1 auto',
                      minWidth: 0
                    }}>
                      {/* Show Button */}
                      <div style={{ flex: '1 1 50%', minWidth: 0 }}>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="secondary"
                          disabled={isSummaryDisabled()}
                          onClick={showSummaryReport}
                          startIcon={summaryLoading ? <CircularProgress size={20} /> : null}
                          style={{ 
                            minWidth: desktop ? '120px' : 'auto',
                            color: colors.text,
                            borderColor: colors.border
                          }}
                        >
                          <Typography variant="button" noWrap style={{ color: colors.text }}>
                            {summaryLoading ? t('sharedLoading') : t('reportShow')}
                          </Typography>
                        </Button>
                      </div>
                      
                      {/* Export Button */}
                      <div style={{ flex: '0 0 auto', minWidth: 0 }}>
                        <Button
                          variant="outlined"
                          color="primary"
                          disabled={isSummaryDisabled() || summaryItems.length === 0}
                          onClick={exportSummaryReport}
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
                  </div>
                  
                  {/* Summary Report Table */}
                  {summaryItems.length > 0 && (
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
                            {summaryColumns.map((key) => (
                              <TableCell key={key}>{t(summaryColumnsMap.get(key))}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {!summaryLoading ? summaryItems.map((item) => (
                            <TableRow key={`${item.deviceId}_${Date.parse(item.startTime)}`}>
                              <TableCell>{devices[item.deviceId]?.name}</TableCell>
                              {summaryColumns.map((key) => (
                                <TableCell key={key}>
                                  {formatSummaryValue(item, key)}
                                </TableCell>
                              ))}
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={summaryColumns.length + 1} style={{ textAlign: 'center', padding: '20px' }}>
                                <CircularProgress />
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              ) : visibleTabs[activeTab]?.key === 'chart' ? (
                <>
                  {/* Chart Report Form */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: desktop ? 'row' : 'column',
                    flexWrap: desktop ? 'wrap' : 'nowrap',
                    gap: '16px', 
                    marginBottom: '20px',
                    flexShrink: 0,
                    alignItems: desktop ? 'flex-end' : 'stretch'
                  }}>
                    {/* Device Selection (Single) */}
                    <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                      <SelectField
                        label={t('deviceTitle')}
                        data={sortedDevicesList}
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
                    
                    {/* Chart Type Selection */}
                    <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                      <FormControl fullWidth>
                        <InputLabel>{t('reportChartType')}</InputLabel>
                        <Select
                          label={t('reportChartType')}
                          value={selectedChartTypes}
                          onChange={(e) => setSelectedChartTypes(e.target.value)}
                          multiple
                          disabled={!chartItems.length}
                          MenuProps={{
                            disablePortal: false,
                            style: { zIndex: 10002 }
                          }}
                        >
                          {chartTypes.map((key) => (
                            <MenuItem key={key} value={key}>{positionAttributes[key]?.name || key}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                    
                    {/* Time Type Selection */}
                    <div style={{ flex: desktop ? '1 1 150px' : '1 1 auto', minWidth: 0 }}>
                      <FormControl fullWidth>
                        <InputLabel>{t('reportTimeType')}</InputLabel>
                        <Select
                          label={t('reportTimeType')}
                          value={timeType}
                          onChange={(e) => setTimeType(e.target.value)}
                          disabled={!chartItems.length}
                          MenuProps={{
                            disablePortal: false,
                            style: { zIndex: 10002 }
                          }}
                        >
                          <MenuItem value="fixTime">{t('positionFixTime')}</MenuItem>
                          <MenuItem value="deviceTime">{t('positionDeviceTime')}</MenuItem>
                          <MenuItem value="serverTime">{t('positionServerTime')}</MenuItem>
                        </Select>
                      </FormControl>
                    </div>
                    
                    {/* Show Button */}
                    <div style={{ flex: desktop ? '0 0 auto' : '1 1 auto', minWidth: 0 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="secondary"
                        disabled={isChartDisabled()}
                        onClick={showChartReport}
                        startIcon={chartLoading ? <CircularProgress size={20} /> : null}
                        style={{ 
                          minWidth: desktop ? '120px' : 'auto',
                          color: colors.text,
                          borderColor: colors.border
                        }}
                      >
                        <Typography variant="button" noWrap style={{ color: colors.text }}>
                          {chartLoading ? t('sharedLoading') : t('reportShow')}
                        </Typography>
                      </Button>
                    </div>
                  </div>
                  
                  {/* Chart Display */}
                  {chartItems.length > 0 && (
                    <div style={{ 
                      flex: 1, 
                      overflow: 'auto',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      padding: '16px',
                      minHeight: '400px'
                    }}>
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart
                          data={filteredChartItems}
                          margin={{
                            top: 5,
                            right: 10,
                            left: -20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid 
                            stroke={theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'} 
                            strokeDasharray="3 3" 
                          />
                          <XAxis
                            dataKey={timeType}
                            type="number"
                            scale="time"
                            domain={['dataMin', 'dataMax']}
                            tickFormatter={(value) => formatTime(value, 'time')}
                            stroke={colors.text}
                            tick={{ fill: colors.text, fontSize: '11px', fontWeight: '500' }}
                            style={{ fontSize: '11px' }}
                          />
                          <YAxis
                            type="number"
                            tickFormatter={(value) => value.toFixed(2)}
                            domain={[minValue - valueRange / 5, maxValue + valueRange / 5]}
                            stroke={colors.text}
                            tick={{ fill: colors.text, fontSize: '11px', fontWeight: '500' }}
                            style={{ fontSize: '11px' }}
                            scale="linear"
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: colors.surface,
                              border: `1px solid ${colors.border}`,
                              borderRadius: '4px',
                              color: colors.text,
                              boxShadow: theme === 'dark' ? '0 4px 12px rgba(0, 0, 0, 0.5)' : '0 4px 12px rgba(0, 0, 0, 0.15)'
                            }}
                            itemStyle={{ color: colors.text }}
                            labelStyle={{ color: colors.text, fontWeight: '600' }}
                            formatter={(value, key) => [value, positionAttributes[key]?.name || key]}
                            labelFormatter={(value) => formatTime(value, 'seconds')}
                          />
                          {selectedChartTypes.map((type, index) => (
                            <Line
                              key={type}
                              type="monotone"
                              dataKey={type}
                              stroke={colorPalette[index % colorPalette.length]}
                              strokeWidth={2}
                              dot={(props) => {
                                const { cx, cy } = props;
                                return (
                                  <circle
                                    cx={cx}
                                    cy={cy}
                                    r={4}
                                    fill={colorPalette[index % colorPalette.length]}
                                    style={{ opacity: 0.6 }}
                                  />
                                );
                              }}
                              activeDot={{ 
                                r: 5, 
                                fill: colorPalette[index % colorPalette.length], 
                                stroke: colors.surface, 
                                strokeWidth: 2 
                              }}
                              connectNulls
                              isAnimationActive={false}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              ) : visibleTabs[activeTab]?.key === 'positions' ? (
                <>
                  {/* Positions Report Form */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: desktop ? 'row' : 'column',
                    flexWrap: desktop ? 'wrap' : 'nowrap',
                    gap: '16px', 
                    marginBottom: '20px',
                    flexShrink: 0,
                    alignItems: desktop ? 'flex-end' : 'stretch'
                  }}>
                    {/* Device Selection (Single) */}
                    <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                      <SelectField
                        label={t('deviceTitle')}
                        data={sortedDevicesList}
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
                    
                    {/* Geofence Selection */}
                    <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                      <FormControl fullWidth>
                        <InputLabel>{t('sharedGeofence')}</InputLabel>
                        <Select
                          label={t('sharedGeofence')}
                          value={geofenceId || ''}
                          onChange={(e) => setGeofenceId(e.target.value || null)}
                          MenuProps={{
                            disablePortal: false,
                            style: { zIndex: 10002 }
                          }}
                        >
                          <MenuItem value="">
                            <em>-</em>
                          </MenuItem>
                          {Object.values(geofences).sort((a, b) => a.name.localeCompare(b.name)).map((geofence) => (
                            <MenuItem key={geofence.id} value={geofence.id}>
                              {geofence.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
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
                          value={positionsColumns}
                          onChange={(e) => setPositionsColumns(e.target.value)}
                          multiple
                          disabled={!positionsItems.length}
                          MenuProps={{
                            disablePortal: false,
                            style: { zIndex: 10002 }
                          }}
                        >
                          {availableColumns.map(([key, name]) => (
                            <MenuItem key={key} value={key}>{name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                    
                    {/* Show and Export Buttons Container */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: desktop ? 'row' : 'row',
                      gap: '8px',
                      flex: desktop ? '0 0 auto' : '1 1 auto',
                      minWidth: 0
                    }}>
                      {/* Show Button */}
                      <div style={{ flex: '1 1 50%', minWidth: 0 }}>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="secondary"
                          disabled={isPositionsDisabled()}
                          onClick={showPositionsReport}
                          startIcon={positionsLoading ? <CircularProgress size={20} /> : null}
                          style={{ 
                            minWidth: desktop ? '120px' : 'auto',
                            color: colors.text,
                            borderColor: colors.border
                          }}
                        >
                          <Typography variant="button" noWrap style={{ color: colors.text }}>
                            {positionsLoading ? t('sharedLoading') : t('reportShow')}
                          </Typography>
                        </Button>
                      </div>
                      
                      {/* Export Button */}
                      <div style={{ flex: '0 0 auto', minWidth: 0 }}>
                        <Button
                          variant="outlined"
                          color="primary"
                          disabled={isPositionsDisabled() || positionsItems.length === 0}
                          onClick={exportPositionsReport}
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
                  </div>
                  
                  {/* Positions Report Table */}
                  {positionsItems.length > 0 && (
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
                            {positionsColumns.map((key) => (
                              <TableCell key={key}>{positionAttributes[key]?.name || key}</TableCell>
                            ))}
                            <TableCell style={{ width: '1%', paddingLeft: '8px' }}></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {!positionsLoading ? positionsItems.slice(0, 4000).map((item) => (
                            <TableRow key={item.id}>
                              <TableCell style={{ padding: '4px' }}>
                                {selectedPosition === item ? (
                                  <IconButton size="small" onClick={() => setSelectedPosition(null)}>
                                    <GpsFixedIcon fontSize="small" />
                                  </IconButton>
                                ) : (
                                  <IconButton size="small" onClick={() => setSelectedPosition(item)}>
                                    <LocationSearchingIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </TableCell>
                              {positionsColumns.map((key) => (
                                <TableCell key={key}>
                                  <PositionValue
                                    position={item}
                                    property={item.hasOwnProperty(key) ? key : null}
                                    attribute={item.hasOwnProperty(key) ? null : key}
                                  />
                                </TableCell>
                              ))}
                              <TableCell style={{ padding: '4px' }}>
                                {/* Actions would go here if needed */}
                              </TableCell>
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={positionsColumns.length + 2} style={{ textAlign: 'center', padding: '20px' }}>
                                <CircularProgress />
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              ) : visibleTabs[activeTab]?.key === 'logs' ? (
                <>
                  {/* Logs Report Table */}
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
                          <TableCell>{t('deviceIdentifier')}</TableCell>
                          <TableCell>{t('positionProtocol')}</TableCell>
                          <TableCell>{t('commandData')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {logs.map((item, index) => (
                          <TableRow key={`log-${item.id || item.deviceId || index}`}>
                            <TableCell style={{ padding: '4px' }}>
                              {item.deviceId ? (
                                <IconButton color="success" size="small" disabled>
                                  <CheckCircleOutlineIcon fontSize="small" />
                                </IconButton>
                              ) : (
                                <IconButton 
                                  color="error" 
                                  size="small" 
                                  onClick={() => registerDevice(item.uniqueId)}
                                  title={t('loginRegister')}
                                >
                                  <HelpOutlineIcon fontSize="small" />
                                </IconButton>
                              )}
                            </TableCell>
                            <TableCell>{item.uniqueId}</TableCell>
                            <TableCell>{item.protocol}</TableCell>
                            <TableCell>{item.data}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : visibleTabs[activeTab]?.key === 'scheduled' ? (
                <>
                  {/* Scheduled Reports Table */}
                  <div style={{ 
                    flex: 1, 
                    overflow: 'auto',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px'
                  }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>{t('sharedType')}</TableCell>
                          <TableCell>{t('sharedDescription')}</TableCell>
                          <TableCell>{t('sharedCalendar')}</TableCell>
                          <TableCell style={{ width: '1%', paddingRight: '8px' }}></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {!scheduledLoading ? scheduledItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{formatScheduledType(item.type)}</TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>{calendars[item.calendarId]?.name || ''}</TableCell>
                            <TableCell style={{ padding: '4px' }}>
                              <IconButton 
                                size="small" 
                                onClick={() => handleDeleteScheduled(item)}
                                style={{ color: colors.text }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                              <CircularProgress size={24} />
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : visibleTabs[activeTab]?.key === 'statistics' ? (
                <>
                  {/* Statistics Report Form */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: desktop ? 'row' : 'column',
                    flexWrap: desktop ? 'wrap' : 'nowrap',
                    gap: '16px', 
                    marginBottom: '20px',
                    flexShrink: 0,
                    alignItems: desktop ? 'flex-end' : 'stretch'
                  }}>
                    {/* Period Selection */}
                    <div style={{ flex: desktop ? '1 1 150px' : '1 1 auto', minWidth: 0 }}>
                      <FormControl fullWidth>
                        <InputLabel style={{ color: colors.text }}>{t('reportPeriod')}</InputLabel>
                        <Select 
                          label={t('reportPeriod')} 
                          value={period} 
                          onChange={(e) => setPeriod(e.target.value)}
                          style={{ color: colors.text }}
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
                            InputLabelProps={{ style: { color: colors.text } }}
                            InputProps={{
                              style: { color: colors.text }
                            }}
                          />
                        </div>
                        <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                          <TextField
                            label={t('reportTo')}
                            type="datetime-local"
                            value={customTo}
                            onChange={(e) => setCustomTo(e.target.value)}
                            fullWidth
                            InputLabelProps={{ style: { color: colors.text } }}
                            InputProps={{
                              style: { color: colors.text }
                            }}
                          />
                        </div>
                      </>
                    )}
                    
                    {/* Column Selection */}
                    <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                      <FormControl fullWidth>
                        <InputLabel style={{ color: colors.text }}>{t('sharedColumns')}</InputLabel>
                        <Select
                          label={t('sharedColumns')}
                          value={statisticsColumns}
                          onChange={(e) => setStatisticsColumns(e.target.value)}
                          multiple
                          disabled={statisticsLoading}
                          style={{ color: colors.text }}
                          MenuProps={{
                            disablePortal: false,
                            style: { zIndex: 10002 }
                          }}
                        >
                          {statisticsColumnsArray.map(([key, title]) => (
                            <MenuItem key={key} value={key}>
                              {t(title)}
                            </MenuItem>
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
                        disabled={statisticsLoading || (period === 'custom' && (!customFrom || !customTo))}
                        onClick={showStatisticsReport}
                        startIcon={statisticsLoading ? <CircularProgress size={20} /> : null}
                        style={{ 
                          minWidth: desktop ? '120px' : 'auto',
                          color: colors.text,
                          borderColor: colors.border
                        }}
                      >
                        <Typography variant="button" noWrap style={{ color: colors.text }}>
                          {statisticsLoading ? t('sharedLoading') : t('reportShow')}
                        </Typography>
                      </Button>
                    </div>
                  </div>

                  {/* Statistics Report Table */}
                  <div style={{ 
                    flex: 1, 
                    overflow: 'auto',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px'
                  }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          {statisticsColumns.map((key) => (
                            <TableCell key={key}>{t(statisticsColumnsMap.get(key))}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {!statisticsLoading ? statisticsItems.map((item, index) => (
                          <TableRow key={item.id || index}>
                            {statisticsColumns.map((key) => (
                              <TableCell key={key}>
                                {key === 'captureTime' ? formatTime(item[key], 'date') : item[key]}
                              </TableCell>
                            ))}
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={statisticsColumns.length} style={{ textAlign: 'center', padding: '20px' }}>
                              <CircularProgress size={24} />
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : visibleTabs[activeTab]?.key === 'audit' ? (
                <>
                  {/* Audit Report Form */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: desktop ? 'row' : 'column',
                    flexWrap: desktop ? 'wrap' : 'nowrap',
                    gap: '16px', 
                    marginBottom: '20px',
                    flexShrink: 0,
                    alignItems: desktop ? 'flex-end' : 'stretch'
                  }}>
                    {/* Period Selection */}
                    <div style={{ flex: desktop ? '1 1 150px' : '1 1 auto', minWidth: 0 }}>
                      <FormControl fullWidth>
                        <InputLabel style={{ color: colors.text }}>{t('reportPeriod')}</InputLabel>
                        <Select 
                          label={t('reportPeriod')} 
                          value={period} 
                          onChange={(e) => setPeriod(e.target.value)}
                          style={{ color: colors.text }}
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
                            InputLabelProps={{ style: { color: colors.text } }}
                            InputProps={{
                              style: { color: colors.text }
                            }}
                          />
                        </div>
                        <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                          <TextField
                            label={t('reportTo')}
                            type="datetime-local"
                            value={customTo}
                            onChange={(e) => setCustomTo(e.target.value)}
                            fullWidth
                            InputLabelProps={{ style: { color: colors.text } }}
                            InputProps={{
                              style: { color: colors.text }
                            }}
                          />
                        </div>
                      </>
                    )}
                    
                    {/* Column Selection */}
                    <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                      <FormControl fullWidth>
                        <InputLabel style={{ color: colors.text }}>{t('sharedColumns')}</InputLabel>
                        <Select
                          label={t('sharedColumns')}
                          value={auditColumns}
                          onChange={(e) => setAuditColumns(e.target.value)}
                          multiple
                          disabled={auditLoading}
                          style={{ color: colors.text }}
                          MenuProps={{
                            disablePortal: false,
                            style: { zIndex: 10002 }
                          }}
                        >
                          {auditColumnsArray.map(([key, title]) => (
                            <MenuItem key={key} value={key}>
                              {t(title)}
                            </MenuItem>
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
                        disabled={auditLoading || (period === 'custom' && (!customFrom || !customTo))}
                        onClick={showAuditReport}
                        startIcon={auditLoading ? <CircularProgress size={20} /> : null}
                        style={{ 
                          minWidth: desktop ? '120px' : 'auto',
                          color: colors.text,
                          borderColor: colors.border
                        }}
                      >
                        <Typography variant="button" noWrap style={{ color: colors.text }}>
                          {auditLoading ? t('sharedLoading') : t('reportShow')}
                        </Typography>
                      </Button>
                    </div>
                  </div>

                  {/* Audit Report Table */}
                  <div style={{ 
                    flex: 1, 
                    overflow: 'auto',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px'
                  }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          {auditColumns.map((key) => (
                            <TableCell key={key}>{t(auditColumnsMap.get(key))}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {!auditLoading ? auditItems.map((item, index) => (
                          <TableRow key={item.id || index}>
                            {auditColumns.map((key) => (
                              <TableCell key={key}>
                                {key === 'actionTime' ? formatTime(item[key], 'minutes') : item[key]}
                              </TableCell>
                            ))}
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={auditColumns.length} style={{ textAlign: 'center', padding: '20px' }}>
                              <CircularProgress size={24} />
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
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
          {/* Delete Confirmation Modal - Matching logout style */}
          <AnimatePresence>
            {deleteDialog && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10000
                }}
                onClick={cancelDelete}
              >
                <motion.div
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -50, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: '8px',
                    padding: '20px',
                    maxWidth: '400px',
                    width: '90%',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p style={{
                    margin: '0 0 20px 0',
                    fontSize: '16px',
                    color: colors.text,
                    lineHeight: '1.5'
                  }}>
                    {t('sharedDeleteConfirm')} "{scheduledToDelete?.description}"?
                  </p>
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'space-between'
                  }}>
                    <button
                      onClick={cancelDelete}
                      style={{
                        padding: '8px 16px',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '6px',
                        backgroundColor: colors.secondary,
                        color: colors.text,
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = colors.hover;
                        e.target.style.color = colors.text;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = colors.secondary;
                        e.target.style.color = colors.text;
                      }}
                    >
                      {t('sharedCancel')}
                    </button>
                    <button
                      onClick={confirmDelete}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid #FECACA',
                        borderRadius: '6px',
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#FEE2E2';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#FEF2F2';
                      }}
                    >
                      {t('sharedRemove')}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingReportsPopover;
