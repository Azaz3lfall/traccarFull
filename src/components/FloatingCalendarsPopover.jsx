import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  Typography,
  CircularProgress,
  Pagination,
  Tabs,
  Tab,
  Box,
  Chip,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ChevronLeft as ChevronLeftIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors } from '../common/components/ThemeProvider';
import dayjs from 'dayjs';
import useCommonUserAttributes from '../common/attributes/useCommonUserAttributes';
import useCommonDeviceAttributes from '../common/attributes/useCommonDeviceAttributes';
import useServerAttributes from '../common/attributes/useServerAttributes';
import EditAttributesAccordion from '../settings/components/EditAttributesAccordion';
import { prefixString } from '../common/util/stringUtils';

const FloatingCalendarsPopover = ({ isVisible, onClose, desktop, isMenuExpanded }) => {
  const colors = useThemeColors();
  const t = useTranslation();
  const queryClient = useQueryClient();

  // State management
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCalendar, setSelectedCalendar] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [calendarToDelete, setCalendarToDelete] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [timeRanges, setTimeRanges] = useState({
    enabled: false,
    periods: [
      { enabled: true, name: `${t('calendarPeriod') || 'Period'} 1`, startTime: '08:00', endTime: '12:00' },
      { enabled: false, name: `${t('calendarPeriod') || 'Period'} 2`, startTime: '14:00', endTime: '18:00' }
    ]
  });

  // Update calendar data when timeRanges change
  useEffect(() => {
    if (editingCalendar && editingCalendar.type === 'simple') {
      const startTime = dayjs(editingCalendar.startTime);
      const endTime = dayjs(editingCalendar.endTime);
      const rule = { frequency: editingCalendar.frequency, by: editingCalendar.by };
      
      if (startTime.isValid() && endTime.isValid()) {
        const newData = generateCalendarWithTimeRanges(startTime, endTime, rule, timeRanges);
        setEditingCalendar({ ...editingCalendar, data: newData });
      }
    }
  }, [timeRanges.enabled, timeRanges.periods]);

  // Helper function to get period name
  const getPeriodName = (index) => {
    const periodName = t('calendarPeriod');
    return periodName && periodName !== 'calendarPeriod' ? `${periodName} ${index}` : `Period ${index}`;
  };

  // Functions to manage time range periods
  const addPeriod = () => {
    const newPeriodIndex = timeRanges.periods.length + 1;
    const newPeriod = {
      enabled: true,
      name: getPeriodName(newPeriodIndex),
      startTime: '08:00',
      endTime: '12:00'
    };
    
    setTimeRanges({
      ...timeRanges,
      periods: [...timeRanges.periods, newPeriod]
    });
  };

  const removePeriod = (index) => {
    if (timeRanges.periods.length > 1) {
      const newPeriods = [...timeRanges.periods];
      newPeriods.splice(index, 1);
      setTimeRanges({
        ...timeRanges,
        periods: newPeriods
      });
    }
  };
  
  // Custom dropdown states
  const [recurrenceDropdownOpen, setRecurrenceDropdownOpen] = useState(false);
  const [daysDropdownOpen, setDaysDropdownOpen] = useState(false);
  
  // Refs for dropdown positioning
  const recurrenceInputRef = useRef(null);
  const daysInputRef = useRef(null);

  // Attributes hooks
  const commonUserAttributes = useCommonUserAttributes(t);
  const commonDeviceAttributes = useCommonDeviceAttributes(t);
  const serverAttributes = useServerAttributes(t);


  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (recurrenceInputRef.current && !recurrenceInputRef.current.contains(event.target)) {
        setRecurrenceDropdownOpen(false);
      }
      if (daysInputRef.current && !daysInputRef.current.contains(event.target)) {
        setDaysDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch calendars with TanStack Query
  const { data: calendars = [], isLoading } = useQuery({
    queryKey: ['calendars'],
    queryFn: async () => {
      const response = await fetch('/api/calendars');
      if (!response.ok) {
        throw new Error('Failed to fetch calendars');
      }
      const data = await response.json();
      return data;
    },
    enabled: isVisible,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });


  // Filter calendars based on search keyword
  const filteredCalendars = calendars.filter(calendar =>
    calendar.name?.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredCalendars.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedCalendars = filteredCalendars.slice(startIndex, startIndex + pageSize);

  // Actions for calendar menu
  const actions = [
    {
      key: 'edit',
      title: t('sharedEdit'),
      icon: <EditIcon fontSize="small" />,
      handler: (calendar) => {
        setSelectedCalendar(calendar);
        const rule = getCalendarRule(calendar);
        const times = getCalendarTimes(calendar);
        const lines = getCalendarLines(calendar);
        const parsedTimeRanges = lines ? parseTimeRanges(lines) : timeRanges;
        
        setEditingCalendar({ 
          ...calendar, 
          type: getCalendarType(calendar), // UI only field
          frequency: rule.frequency, // UI only field
          by: rule.by, // UI only field
          startTime: times.start.format('YYYY-MM-DDTHH:mm'), // UI only field
          endTime: times.end.format('YYYY-MM-DDTHH:mm'), // UI only field
          attributes: calendar.attributes || {}
        });
        setTimeRanges(parsedTimeRanges);
        setEditDialog(true);
        setActiveTab(0);
        setAnchorEl(null);
      },
    },
    {
      key: 'delete',
      title: t('sharedRemove'),
      icon: <DeleteIcon fontSize="small" />,
      handler: (calendar) => {
        setCalendarToDelete(calendar);
        setDeleteDialog(true);
        setAnchorEl(null);
      },
    },
  ];

  // Mutations
  const createCalendarMutation = useMutation({
    mutationFn: async (calendarData) => {
      const response = await fetch('/api/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calendarData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['calendars']);
      setEditDialog(false);
      setEditingCalendar(null);
    },
    onError: (error) => {
      console.error('Error creating calendar:', error);
      setSnackbar({ open: true, message: error.message || t('sharedError'), severity: 'error' });
    },
  });

  const updateCalendarMutation = useMutation({
    mutationFn: async (calendarData) => {
      const response = await fetch(`/api/calendars/${calendarData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calendarData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['calendars']);
      setEditDialog(false);
      setEditingCalendar(null);
    },
    onError: (error) => {
      console.error('Error updating calendar:', error);
      setSnackbar({ open: true, message: error.message || t('sharedError'), severity: 'error' });
    },
  });

  const deleteCalendarMutation = useMutation({
    mutationFn: async (calendarId) => {
      const response = await fetch(`/api/calendars/${calendarId}`, { method: 'DELETE' });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['calendars']);
      cancelDelete();
    },
    onError: (error) => {
      console.error('Error deleting calendar:', error);
      setSnackbar({ open: true, message: error.message || t('sharedError'), severity: 'error' });
    },
  });

  // Handlers
  const handleSaveCalendar = () => {
    if (!editingCalendar) return;

    // Generate iCal data for simple calendars
    let calendarData = {
      id: editingCalendar.id,
      name: editingCalendar.name,
      data: editingCalendar.data,
      attributes: editingCalendar.attributes || {}
    };

    if (editingCalendar.type === 'simple') {
      const startTime = dayjs(editingCalendar.startTime);
      const endTime = dayjs(editingCalendar.endTime);
      const rule = { frequency: editingCalendar.frequency, by: editingCalendar.by };
      
      calendarData.data = generateCalendarWithTimeRanges(startTime, endTime, rule, timeRanges);
    }

    if (editingCalendar.id) {
      updateCalendarMutation.mutate(calendarData);
    } else {
      createCalendarMutation.mutate(calendarData);
    }
  };

  // Handle confirm delete
  const confirmDelete = () => {
    if (calendarToDelete) {
      deleteCalendarMutation.mutate(calendarToDelete.id);
    }
  };

  // Handle cancel delete
  const cancelDelete = () => {
    setDeleteDialog(false);
    setCalendarToDelete(null);
  };

  const handleAddCalendar = () => {
    const startTime = dayjs(); // Current datetime
    const endTime = startTime.add(10, 'years'); // Current datetime + 10 years
    
    // Reset timeRanges to default
    setTimeRanges({
      enabled: false,
      periods: [
        { enabled: true, name: getPeriodName(1), startTime: '08:00', endTime: '12:00' },
        { enabled: false, name: getPeriodName(2), startTime: '14:00', endTime: '18:00' }
      ]
    });
    
    setEditingCalendar({
      name: '',
      data: simpleCalendar(),
      type: 'simple', // UI only field
      frequency: 'ONCE', // UI only field
      by: null, // UI only field
      startTime: startTime.format('YYYY-MM-DDTHH:mm'), // UI only field
      endTime: endTime.format('YYYY-MM-DDTHH:mm'), // UI only field
      attributes: {},
    });
    setEditDialog(true);
    setActiveTab(0);
  };

  // Calendar helper functions
  const formatCalendarTime = (time) => {
    const tzid = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return `TZID=${tzid}:${time.locale('en').format('YYYYMMDDTHHmmss')}`;
  };

  const parseRule = (rule) => {
    if (rule.endsWith('COUNT=1')) {
      return { frequency: 'ONCE' };
    }
    const fragments = rule.split(';');
    const frequency = fragments[0].substring(11);
    const by = fragments.length > 1 ? fragments[1].split('=')[1].split(',') : null;
    return { frequency, by };
  };

  const formatRule = (rule) => {
    const by = rule.by && rule.by.join(',');
    const untilDate = dayjs().add(10, 'years').format('YYYYMMDDTHHmmss') + 'Z';
    
    switch (rule.frequency) {
      case 'DAILY':
        return `RRULE:FREQ=${rule.frequency};UNTIL=${untilDate}`;
      case 'WEEKLY':
        return `RRULE:FREQ=${rule.frequency};BYDAY=${by || 'SU'};UNTIL=${untilDate}`;
      case 'MONTHLY':
        return `RRULE:FREQ=${rule.frequency};BYMONTHDAY=${by || 1};UNTIL=${untilDate}`;
      default:
        return 'RRULE:FREQ=DAILY;COUNT=1';
    }
  };

  const generateCalendarWithTimeRanges = (startTime, endTime, rule, timeRanges) => {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Traccar//NONSGML Traccar//EN',
    ];



    if (timeRanges && timeRanges.enabled && timeRanges.periods && timeRanges.periods.length > 0) {
      // Generate VEVENT blocks for each enabled time range
      const enabledPeriods = timeRanges.periods.filter(period => period.enabled);
      
      if (enabledPeriods.length > 0) {
        enabledPeriods.forEach((period, index) => {
          if (period.startTime && period.endTime) {
            // Use the base date from startTime and apply the period times
            const baseDate = dayjs(startTime);
            
            // Parse time strings properly
            const [startHour, startMinute] = period.startTime.split(':').map(Number);
            const [endHour, endMinute] = period.endTime.split(':').map(Number);
            
            const periodStart = baseDate.clone().hour(startHour).minute(startMinute).second(0);
            const periodEnd = baseDate.clone().hour(endHour).minute(endMinute).second(0);
            
            if (periodStart.isValid() && periodEnd.isValid()) {
              lines.push(
                'BEGIN:VEVENT',
                `UID:00000000-0000-0000-0000-000000000${100 + index}`,
                `DTSTART;${formatCalendarTime(periodStart)}`,
                `DTEND;${formatCalendarTime(periodEnd)}`,
                formatRule(rule),
                `SUMMARY:${period.name || getPeriodName(index + 1)}`,
                'END:VEVENT'
              );
            }
          }
        });
      }
    } else {
    
      // Single VEVENT block for regular calendar
      if (startTime.isValid() && endTime.isValid()) {
        lines.push(
          'BEGIN:VEVENT',
          'UID:00000000-0000-0000-0000-000000000000',
          `DTSTART;${formatCalendarTime(startTime)}`,
          `DTEND;${formatCalendarTime(endTime)}`,
          formatRule(rule),
          'SUMMARY:Event',
          'END:VEVENT'
        );
      } else {
        console.error('FloatingCalendarsPopover - Invalid start or end time!', { startTime, endTime });
      }
    }

    lines.push('END:VCALENDAR');
    const result = window.btoa(lines.join('\n'));
    return result;
  };

  const parseTimeRanges = (lines) => {
    const events = [];
    let currentEvent = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === 'BEGIN:VEVENT') {
        currentEvent = {};
      } else if (line === 'END:VEVENT' && currentEvent) {
        events.push(currentEvent);
        currentEvent = null;
      } else if (currentEvent) {
        if (line.startsWith('DTSTART;')) {
          const timeStr = line.split(':')[1];
          if (timeStr && timeStr !== 'Invalid Date') {
            const parsedTime = dayjs(timeStr, 'YYYYMMDDTHHmmss');
            if (parsedTime.isValid()) {
              currentEvent.startTime = parsedTime.format('HH:mm');
            }
          }
        } else if (line.startsWith('DTEND;')) {
          const timeStr = line.split(':')[1];
          if (timeStr && timeStr !== 'Invalid Date') {
            const parsedTime = dayjs(timeStr, 'YYYYMMDDTHHmmss');
            if (parsedTime.isValid()) {
              currentEvent.endTime = parsedTime.format('HH:mm');
            }
          }
        } else if (line.startsWith('SUMMARY:')) {
          currentEvent.name = line.substring(8);
        }
      }
    }
    
    return {
      enabled: events.length > 0,
      periods: events.length > 0 ? events.map((event, index) => ({
        enabled: true,
        name: event.name || getPeriodName(index + 1),
        startTime: event.startTime || '08:00',
        endTime: event.endTime || '12:00'
      })) : [
        { enabled: true, name: getPeriodName(1), startTime: '08:00', endTime: '12:00' },
        { enabled: false, name: getPeriodName(2), startTime: '14:00', endTime: '18:00' }
      ]
    };
  };


  const simpleCalendar = () => {
    const startTime = dayjs(); // Current datetime
    const endTime = startTime.add(10, 'years'); // Current datetime + 10 years
    const rule = { frequency: 'DAILY' };
    const defaultTimeRanges = {
      enabled: false,
      periods: [
        { enabled: true, name: getPeriodName(1), startTime: '08:00', endTime: '12:00' },
        { enabled: false, name: getPeriodName(2), startTime: '14:00', endTime: '18:00' }
      ]
    };
    
    return generateCalendarWithTimeRanges(startTime, endTime, rule, defaultTimeRanges);
  };

  // Get calendar data and rule for editing
  const getCalendarLines = (calendar) => {
    if (!calendar?.data) return null;
    const decoded = window.atob(calendar.data);
    return decoded.split('\n');
  };

  const getCalendarRule = (calendar) => {
    const lines = getCalendarLines(calendar);
    if (!lines) return { frequency: 'ONCE', by: null };
    const ruleLine = lines.find(line => line.startsWith('RRULE:'));
    return ruleLine ? parseRule(ruleLine) : { frequency: 'ONCE', by: null };
  };

  const getCalendarTimes = (calendar) => {
    const lines = getCalendarLines(calendar);
    if (!lines) return { start: dayjs(), end: dayjs().add(1, 'hour') };
    
    // For time ranges, we need to get the base date from the first VEVENT
    // and set timeRanges from all VEVENTs
    const firstStartLine = lines.find(line => line.startsWith('DTSTART;'));
    const firstEndLine = lines.find(line => line.startsWith('DTEND;'));
    
    let start = dayjs();
    let end = dayjs().add(1, 'hour');
    
    if (firstStartLine) {
      const timeStr = firstStartLine.split(':')[1];
      if (timeStr && timeStr !== 'Invalid Date') {
        const parsedStart = dayjs(timeStr, 'YYYYMMDDTHHmmss');
        if (parsedStart.isValid()) {
          start = parsedStart;
        }
      }
    }
    
    if (firstEndLine) {
      const timeStr = firstEndLine.split(':')[1];
      if (timeStr && timeStr !== 'Invalid Date') {
        const parsedEnd = dayjs(timeStr, 'YYYYMMDDTHHmmss');
        if (parsedEnd.isValid()) {
          end = parsedEnd;
        }
      }
    }
    
    return { start, end };
  };

  // Get calendar type and parsed data
  const getCalendarType = (calendar) => {
    if (!calendar?.data) return 'custom';
    const decoded = window.atob(calendar.data);
    return decoded.indexOf('//Traccar//') > 0 ? 'simple' : 'custom';
  };

  // Get recurrence display text
  const getRecurrenceText = (calendar) => {
    if (getCalendarType(calendar) === 'custom') return t('reportCustom');
    const rule = getCalendarRule(calendar);
    return t(prefixString('calendar', rule.frequency.toLowerCase()));
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="floating-calendars-popover"
        initial={{ x: -400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -400, opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{
          position: 'fixed',
          top: !desktop ? '0px' : '8px',
          left: !desktop ? '0px' : (isMenuExpanded ? '200px' : '63px'),
          width: !desktop ? '100vw' : `calc(100vw - ${isMenuExpanded ? '200px' : '63px'} - 10px)`,
          height: !desktop ? '100vh' : 'calc(100vh - 16px)',
          zIndex: 9999,
          pointerEvents: 'auto',
          transition: 'left 0.3s ease'
        }}
      >
        <div style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: !desktop ? '0px' : '0px 16px 16px 0px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <IconButton
                onClick={onClose}
                size="small"
                style={{ color: colors.textSecondary }}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                {t('sharedCalendars')}
              </Typography>
            </div>
            <IconButton
              onClick={handleAddCalendar}
              style={{
                backgroundColor: colors.primary,
                color: colors.text,
                width: '40px',
                height: '40px',
              }}
              title={t('sharedAdd')}
            >
              <AddIcon />
            </IconButton>
          </div>

          {/* Search */}
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}` }}>
            <TextField
              fullWidth
              size="small"
              placeholder={t('sharedSearch')}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon style={{ color: colors.textSecondary, marginRight: '8px' }} />,
              }}
              sx={{
                '& .MuiOutlinedInputRoot': {
                  backgroundColor: colors.secondary,
                  '& fieldset': { borderColor: colors.border },
                  '&:hover fieldset': { borderColor: colors.primary },
                  '&.Mui-focused fieldset': { borderColor: colors.primary },
                },
                '& .MuiInputLabel-root': { 
                  color: colors.text,
                  '&.Mui-focused': { color: colors.primary }
                },
              }}
            />
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: 'visible', position: 'relative' }}>
            {isLoading ? (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surface,
                zIndex: 10
              }}>
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '120px',
                  height: '120px',
                  backgroundColor: colors.surface,
                  borderRadius: '50%',
                  boxShadow: `0 4px 12px ${colors.border}20`
                }}>
                  <CircularProgress 
                    style={{ 
                      color: colors.text,
                      position: 'absolute'
                    }} 
                    size={100}
                    thickness={4}
                  />
                </div>
                <Typography 
                  variant="body2" 
                  style={{ 
                    color: colors.textSecondary,
                    fontSize: '14px',
                    fontWeight: '500',
                    marginTop: '16px'
                  }}
                >
                  {t('sharedLoading')}...
                </Typography>
              </div>
            ) : (
              <>
                {/* Table */}
                <TableContainer style={{ padding: '0 20px' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow style={{ backgroundColor: colors.surface }}>
                        <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                          {t('sharedName')}
                        </TableCell>
                        {desktop && (
                          <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                            {t('sharedType')}
                          </TableCell>
                        )}
                        {desktop && (
                          <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                            {t('calendarRecurrence')}
                          </TableCell>
                        )}
                        <TableCell align="right" style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px', textAlign: 'right' }}>
                          {t('sharedActions')}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedCalendars.map((calendar, index) => (
                        <TableRow 
                          key={calendar.id} 
                          style={{
                            backgroundColor: index % 2 === 0 ? 'transparent' : colors.secondary,
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.hover;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'transparent' : colors.secondary;
                          }}
                          sx={{ '& .MuiTableCell-root': { padding: '9px 12px' } }}
                        >
                          <TableCell>
                            <Typography variant="body2" style={{ color: colors.text, fontWeight: '500', lineHeight: 1.8, fontSize: '13px' }}>
                              {calendar.name}
                            </Typography>
                          </TableCell>
                          {desktop && (
                            <TableCell>
                              <Chip
                                label={getCalendarType(calendar) === 'simple' ? t('calendarSimple') : t('reportCustom')}
                                size="small"
                                style={{
                                  backgroundColor: getCalendarType(calendar) === 'simple' ? colors.primary : colors.surface,
                                  color: getCalendarType(calendar) === 'simple' ? colors.text : colors.textSecondary,
                                  fontSize: '10px',
                                  height: '16px',
                                }}
                              />
                            </TableCell>
                          )}
                          {desktop && (
                            <TableCell>
                              <Typography variant="body2" style={{ color: colors.textSecondary, fontSize: '12px' }}>
                                {getRecurrenceText(calendar)}
                              </Typography>
                            </TableCell>
                          )}
                          <TableCell align="right" style={{ textAlign: 'right', padding: '4px' }}>
                            <IconButton
                              onClick={(e) => {
                                setSelectedCalendar(calendar);
                                setAnchorEl(e.currentTarget);
                              }}
                              size="small"
                              style={{ color: colors.textSecondary }}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}>
                    <IconButton
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      size="small"
                      style={{
                        color: colors.text,
                        width: '24px',
                        height: '24px',
                      }}
                    >
                      <FirstPageIcon fontSize="small" />
                    </IconButton>
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={(e, value) => setPage(value)}
                      size="small"
                      showFirstButton={false}
                      showLastButton={false}
                      siblingCount={0}
                      boundaryCount={1}
                      style={{
                        '& .MuiPaginationItem-root': {
                          color: colors.text,
                          '&.Mui-selected': {
                            backgroundColor: colors.primary,
                            color: 'white',
                          },
                        },
                      }}
                    />
                    <IconButton
                      onClick={() => setPage(totalPages)}
                      disabled={page === totalPages}
                      size="small"
                      style={{
                        color: colors.text,
                        width: '24px',
                        height: '24px',
                      }}
                    >
                      <LastPageIcon fontSize="small" />
                    </IconButton>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Actions Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            style={{ zIndex: 10002 }}
            PaperProps={{
              style: {
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                minWidth: '160px',
                zIndex: 10002,
              }
            }}
          >
            {actions
              .filter(action => action.show !== false)
              .map((action) => (
                <MenuItem
                  key={action.key}
                  onClick={() => action.handler(selectedCalendar)}
                  style={{ color: colors.text, fontSize: '12px' }}
                >
                  {action.icon}
                  <span style={{ marginLeft: '6px' }}>{action.title}</span>
                </MenuItem>
              ))}
          </Menu>

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
                    {t('sharedDeleteConfirm')} "{calendarToDelete?.name}"?
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
                      disabled={deleteCalendarMutation.isPending}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid #FECACA',
                        borderRadius: '6px',
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: deleteCalendarMutation.isPending ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: deleteCalendarMutation.isPending ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!deleteCalendarMutation.isPending) {
                          e.target.style.backgroundColor = '#FEE2E2';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!deleteCalendarMutation.isPending) {
                          e.target.style.backgroundColor = '#FEF2F2';
                        }
                      }}
                    >
                      {deleteCalendarMutation.isPending ? (
                        <CircularProgress size={16} style={{ color: '#DC2626' }} />
                      ) : (
                        t('sharedRemove')
                      )}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Edit Dialog */}
          <AnimatePresence>
            {editDialog && (
              <>
                {/* Backdrop */}
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
                    zIndex: 9999,
                  }}
                  onClick={() => setEditDialog(false)}
                />
                
                {/* Edit Drawer */}
                <motion.div
                  initial={{ x: '100%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '100%', opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    width: desktop ? '400px' : '100vw',
                    height: '100vh',
                    backgroundColor: colors.surface,
                    borderLeft: desktop ? `1px solid ${colors.border}` : 'none',
                    zIndex: 10000,
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: desktop ? '-4px 0 20px rgba(0, 0, 0, 0.15)' : 'none',
                  }}
                >
                  {/* Drawer Header */}
                  <div style={{
                    padding: '16px 20px',
                    borderBottom: `1px solid ${colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <IconButton
                        onClick={() => setEditDialog(false)}
                        size="small"
                        style={{ color: colors.textSecondary }}
                      >
                        <ChevronLeftIcon fontSize="small" />
                      </IconButton>
                      <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                        {editingCalendar?.id ? t('sharedEdit') : t('sharedAdd')} {t('sharedCalendar')}
                      </Typography>
                    </div>
                    <IconButton
                      onClick={handleSaveCalendar}
                      disabled={createCalendarMutation.isPending || updateCalendarMutation.isPending || !editingCalendar?.name}
                      style={{
                        backgroundColor: colors.primary,
                        color: colors.text,
                        width: '40px',
                        height: '40px',
                      }}
                      title={createCalendarMutation.isPending || updateCalendarMutation.isPending ? t('sharedSaving') : t('sharedSave')}
                    >
                      {(createCalendarMutation.isPending || updateCalendarMutation.isPending) ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <SaveIcon />
                      )}
                    </IconButton>
                  </div>

                  {/* Form */}
                  <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column' }}>
                    {/* Tabs Navigation */}
                    <Tabs
                      value={activeTab}
                      onChange={(e, newValue) => setActiveTab(newValue)}
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
                        },
                        '& .MuiTabs-indicator': {
                          backgroundColor: '#1976d2',
                          height: '2px',
                        },
                      }}
                    >
                      <Tab label={t('sharedRequired')} />
                      <Tab label={t('calendarRecurrence')} />
                      <Tab label={t('sharedAttributes')} />
                    </Tabs>

                    {/* Tab Content */}
                    <Box style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: '16px' }}>
                      {/* Required Tab */}
                      {activeTab === 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {/* Name */}
                          <TextField
                            label={t('sharedName')}
                            value={editingCalendar?.name || ''}
                            onChange={(e) => setEditingCalendar({ ...editingCalendar, name: e.target.value })}
                            fullWidth
                            variant="outlined"
                            size="small"
                            sx={{
                              '& .MuiOutlinedInputRoot': {
                                backgroundColor: colors.secondary,
                                '& fieldset': { borderColor: colors.border },
                                '&:hover fieldset': { borderColor: colors.primary },
                                '&.Mui-focused fieldset': { borderColor: colors.primary },
                              },
                              '& .MuiInputLabel-root': { 
                                color: colors.text,
                                '&.Mui-focused': { color: colors.primary }
                              },
                            }}
                          />

                          {/* Type */}
                          <TextField
                            fullWidth
                            size="small"
                            label={t('sharedType')}
                            value={getCalendarType(editingCalendar) === 'simple' ? t('calendarSimple') : t('reportCustom')}
                            InputProps={{
                              readOnly: true,
                            }}
                            sx={{
                              '& .MuiOutlinedInputRoot': {
                                color: colors.text,
                                '& fieldset': { borderColor: colors.border },
                                '&:hover fieldset': { borderColor: colors.border },
                                '&.Mui-focused fieldset': { borderColor: colors.border },
                              },
                              '& .MuiInputLabel-root': { color: colors.textSecondary },
                              '& .MuiInputLabel-root.Mui-focused': { color: colors.textSecondary },
                            }}
                          />

                          {/* Custom Data */}
                          {editingCalendar?.type === 'custom' && (
                            <TextField
                              label={t('calendarData')}
                              value={editingCalendar?.data || ''}
                              onChange={(e) => setEditingCalendar({ ...editingCalendar, data: e.target.value })}
                              fullWidth
                              multiline
                              rows={6}
                              variant="outlined"
                              size="small"
                              sx={{
                                '& .MuiOutlinedInputRoot': {
                                  backgroundColor: colors.secondary,
                                  '& fieldset': { borderColor: colors.border },
                                  '&:hover fieldset': { borderColor: colors.primary },
                                  '&.Mui-focused fieldset': { borderColor: colors.primary },
                                },
                                '& .MuiInputLabel-root': { 
                                  color: colors.text,
                                  '&.Mui-focused': { color: colors.primary }
                                },
                              }}
                            />
                          )}
                        </div>
                      )}

                      {/* Recurrence Tab */}
                      {activeTab === 1 && editingCalendar?.type === 'simple' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {/* Start Time */}
                          <TextField
                            label={t('reportFrom')}
                            type="datetime-local"
                            value={editingCalendar?.startTime || dayjs().format('YYYY-MM-DDTHH:mm')}
                            onChange={(e) => setEditingCalendar({ ...editingCalendar, startTime: e.target.value })}
                            fullWidth
                            variant="outlined"
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            sx={{
                              '& .MuiOutlinedInputRoot': {
                                backgroundColor: colors.secondary,
                                '& fieldset': { borderColor: colors.border },
                                '&:hover fieldset': { borderColor: colors.primary },
                                '&.Mui-focused fieldset': { borderColor: colors.primary },
                              },
                              '& .MuiInputLabel-root': { 
                                color: colors.text,
                                '&.Mui-focused': { color: colors.primary }
                              },
                            }}
                          />

                          {/* End Time */}
                          <TextField
                            label={t('reportTo')}
                            type="datetime-local"
                            value={editingCalendar?.endTime || dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm')}
                            onChange={(e) => setEditingCalendar({ ...editingCalendar, endTime: e.target.value })}
                            fullWidth
                            variant="outlined"
                            size="small"
                            InputLabelProps={{ shrink: true }}
                            sx={{
                              '& .MuiOutlinedInputRoot': {
                                backgroundColor: colors.secondary,
                                '& fieldset': { borderColor: colors.border },
                                '&:hover fieldset': { borderColor: colors.primary },
                                '&.Mui-focused fieldset': { borderColor: colors.primary },
                              },
                              '& .MuiInputLabel-root': { 
                                color: colors.text,
                                '&.Mui-focused': { color: colors.primary }
                              },
                            }}
                          />

                          {/* Recurrence */}
                          <div>
                            <TextField
                              ref={recurrenceInputRef}
                              fullWidth
                              size="small"
                              label={t('calendarRecurrence')}
                              value={t(prefixString('calendar', (editingCalendar?.frequency || 'ONCE').toLowerCase()))}
                              onClick={() => setRecurrenceDropdownOpen(!recurrenceDropdownOpen)}
                              InputProps={{
                                readOnly: true,
                                endAdornment: <ChevronLeftIcon style={{ transform: 'rotate(-90deg)', color: colors.textSecondary }} />
                              }}
                              sx={{
                                '& .MuiOutlinedInputRoot': {
                                  color: colors.text,
                                  '& fieldset': { borderColor: colors.border },
                                  '&:hover fieldset': { borderColor: colors.primary },
                                  '&.Mui-focused fieldset': { borderColor: colors.primary },
                                },
                                '& .MuiInputLabel-root': { color: colors.textSecondary },
                                '& .MuiInputLabel-root.Mui-focused': { color: colors.primary },
                              }}
                            />
                            {recurrenceDropdownOpen && (
                              <div 
                                style={{
                                  position: 'fixed',
                                  zIndex: 10010,
                                  maxHeight: '200px',
                                  overflow: 'auto',
                                  border: `1px solid ${colors.border}`,
                                  borderRadius: '4px',
                                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                                  backgroundColor: colors.surface,
                                  marginTop: '4px',
                                  width: recurrenceInputRef.current ? recurrenceInputRef.current.getBoundingClientRect().width : '100%',
                                  left: recurrenceInputRef.current ? recurrenceInputRef.current.getBoundingClientRect().left : 0,
                                  top: recurrenceInputRef.current ? recurrenceInputRef.current.getBoundingClientRect().bottom + 4 : 0,
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY'].map((frequency, index) => (
                                  <div
                                    key={frequency}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setEditingCalendar({ ...editingCalendar, frequency, by: null });
                                      setRecurrenceDropdownOpen(false);
                                    }}
                                    style={{
                                      padding: '12px 16px',
                                      cursor: 'pointer',
                                      color: colors.text,
                                      backgroundColor: colors.surface,
                                      borderBottom: index < 3 ? `1px solid ${colors.border}` : 'none',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.stopPropagation();
                                      e.target.style.backgroundColor = colors.backgroundHover;
                                    }}
                                    onMouseLeave={(e) => {
                                      e.stopPropagation();
                                      e.target.style.backgroundColor = colors.surface;
                                    }}
                                  >
                                    {t(prefixString('calendar', frequency.toLowerCase()))}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Conditional Days Selection */}
                          {['WEEKLY', 'MONTHLY'].includes(editingCalendar?.frequency) && (
                            <div>
                              <TextField
                                ref={daysInputRef}
                                fullWidth
                                size="small"
                                label={t('calendarDays')}
                                value={editingCalendar?.by?.length > 0 ? 
                                  (editingCalendar.frequency === 'WEEKLY' ? 
                                    editingCalendar.by.map(day => t(prefixString('calendar', ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].indexOf(day)]))).join(', ') :
                                    editingCalendar.by.join(', ')
                                  ) : ''
                                }
                                onClick={() => setDaysDropdownOpen(!daysDropdownOpen)}
                                InputProps={{
                                  readOnly: true,
                                  endAdornment: <ChevronLeftIcon style={{ transform: 'rotate(-90deg)', color: colors.textSecondary }} />
                                }}
                                sx={{
                                  '& .MuiOutlinedInputRoot': {
                                    color: colors.text,
                                    '& fieldset': { borderColor: colors.border },
                                    '&:hover fieldset': { borderColor: colors.primary },
                                    '&.Mui-focused fieldset': { borderColor: colors.primary },
                                  },
                                  '& .MuiInputLabel-root': { color: colors.textSecondary },
                                  '& .MuiInputLabel-root.Mui-focused': { color: colors.primary },
                                }}
                              />
                              {daysDropdownOpen && (
                                <div 
                                  style={{
                                    position: 'fixed',
                                    zIndex: 10010,
                                    maxHeight: '200px',
                                    overflow: 'auto',
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: '4px',
                                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                                    backgroundColor: colors.surface,
                                    marginTop: '4px',
                                    width: daysInputRef.current ? daysInputRef.current.getBoundingClientRect().width : '100%',
                                    left: daysInputRef.current ? daysInputRef.current.getBoundingClientRect().left : 0,
                                    top: daysInputRef.current ? daysInputRef.current.getBoundingClientRect().bottom + 4 : 0,
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {editingCalendar?.frequency === 'WEEKLY' ? 
                                    ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day, index) => {
                                      const dayCode = day.substring(0, 2).toUpperCase();
                                      const isSelected = editingCalendar?.by?.includes(dayCode);
                                      return (
                                        <div
                                          key={day}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const currentBy = editingCalendar?.by || [];
                                            const newBy = isSelected 
                                              ? currentBy.filter(d => d !== dayCode)
                                              : [...currentBy, dayCode];
                                            setEditingCalendar({ ...editingCalendar, by: newBy });
                                          }}
                                          style={{
                                            padding: '12px 16px',
                                            cursor: 'pointer',
                                            color: colors.text,
                                            backgroundColor: isSelected ? colors.primary + '20' : colors.surface,
                                            borderBottom: index < 6 ? `1px solid ${colors.border}` : 'none',
                                          }}
                                          onMouseEnter={(e) => {
                                            e.stopPropagation();
                                            e.target.style.backgroundColor = colors.backgroundHover;
                                          }}
                                          onMouseLeave={(e) => {
                                            e.stopPropagation();
                                            e.target.style.backgroundColor = isSelected ? colors.primary + '20' : colors.surface;
                                          }}
                                        >
                                          {t(prefixString('calendar', day))}
                                        </div>
                                      );
                                    }) : 
                                    Array.from({ length: 31 }, (_, i) => i + 1).map((day, index) => {
                                      const isSelected = editingCalendar?.by?.includes(String(day));
                                      return (
                                        <div
                                          key={day}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const currentBy = editingCalendar?.by || [];
                                            const newBy = isSelected 
                                              ? currentBy.filter(d => d !== String(day))
                                              : [...currentBy, String(day)];
                                            setEditingCalendar({ ...editingCalendar, by: newBy });
                                          }}
                                          style={{
                                            padding: '12px 16px',
                                            cursor: 'pointer',
                                            color: colors.text,
                                            backgroundColor: isSelected ? colors.primary + '20' : colors.surface,
                                            borderBottom: index < 30 ? `1px solid ${colors.border}` : 'none',
                                          }}
                                          onMouseEnter={(e) => {
                                            e.stopPropagation();
                                            e.target.style.backgroundColor = colors.backgroundHover;
                                          }}
                                          onMouseLeave={(e) => {
                                            e.stopPropagation();
                                            e.target.style.backgroundColor = isSelected ? colors.primary + '20' : colors.surface;
                                          }}
                                        >
                                          {day}
                                        </div>
                                      );
                                    })
                                  }
                                </div>
                              )}
                            </div>
                          )}

                          {/* Time Ranges for Weekly Recurrence */}
                          {editingCalendar?.frequency === 'WEEKLY' && (
                            <Box>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={timeRanges.enabled}
                                    onChange={(e) => {
                                      const newTimeRanges = { ...timeRanges, enabled: e.target.checked };
                                      // Ensure first period is enabled when time ranges are enabled
                                      if (e.target.checked && newTimeRanges.periods.length > 0) {
                                        newTimeRanges.periods[0].enabled = true;
                                      }
                                      setTimeRanges(newTimeRanges);
                                    }}
                                  />
                                }
                                label={t('calendarByTimeRange')}
                                sx={{ 
                                  width: '100%',
                                  marginBottom: 1,
                                  '& .MuiFormControlLabel-label': {
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: 'inherit'
                                  }
                                }}
                              />
                              
                              {timeRanges.enabled && (
                                <Box sx={{ 
                                  ml: 2, 
                                  mt: 1,
                                  maxHeight: '300px',
                                  overflowY: 'auto',
                                  overflowX: 'hidden',
                                  '&::-webkit-scrollbar': {
                                    width: '6px',
                                  },
                                  '&::-webkit-scrollbar-track': {
                                    background: colors.border,
                                    borderRadius: '3px',
                                  },
                                  '&::-webkit-scrollbar-thumb': {
                                    background: colors.primary,
                                    borderRadius: '3px',
                                    '&:hover': {
                                      background: colors.primary + 'CC',
                                    },
                                  },
                                }}>
                                  {timeRanges.periods.map((period, index) => (
                                    <Box key={`period-${index}-${period.name || 'unnamed'}`} sx={{ mb: 2, p: 2, border: `1px solid ${colors.border}`, borderRadius: 1 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                        <FormControlLabel
                                          control={
                                            <Checkbox
                                              checked={period.enabled}
                                              disabled={index === 0 && timeRanges.enabled}
                                              onChange={(e) => {
                                                const newPeriods = [...timeRanges.periods];
                                                newPeriods[index].enabled = e.target.checked;
                                                setTimeRanges({ ...timeRanges, periods: newPeriods });
                                              }}
                                            />
                                          }
                                          label={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                              {period.name}
                                              {index === 0 && timeRanges.enabled && (
                                                <Chip
                                                  label={t('sharedRequired')}
                                                  size="small"
                                                  color="primary"
                                                  variant="outlined"
                                                  sx={{ 
                                                    fontSize: '10px',
                                                    height: '20px',
                                                    '& .MuiChip-label': { px: 0.5 }
                                                  }}
                                                />
                                              )}
                                            </Box>
                                          }
                                        />
                                        {timeRanges.periods.length > 1 && index > 0 && (
                                          <IconButton
                                            size="small"
                                            onClick={() => removePeriod(index)}
                                            sx={{
                                              color: colors.error,
                                              '&:hover': {
                                                backgroundColor: colors.error + '20'
                                              }
                                            }}
                                          >
                                            <DeleteIcon fontSize="small" />
                                          </IconButton>
                                        )}
                                      </Box>
                                      
                                      {period.enabled && (
                                        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                                          <TextField
                                            label={t('calendarStartTime')}
                                            type="time"
                                            value={period.startTime}
                                            onChange={(e) => {
                                              const newPeriods = [...timeRanges.periods];
                                              newPeriods[index].startTime = e.target.value;
                                              setTimeRanges({ ...timeRanges, periods: newPeriods });
                                            }}
                                            InputLabelProps={{ shrink: true }}
                                            size="small"
                                            sx={{
                                              '& .MuiOutlinedInputRoot': {
                                                backgroundColor: colors.secondary,
                                                '& fieldset': { borderColor: colors.border },
                                                '&:hover fieldset': { borderColor: colors.primary },
                                                '&.Mui-focused fieldset': { borderColor: colors.primary },
                                              },
                                              '& .MuiInputLabel-root': { 
                                                color: colors.text,
                                                '&.Mui-focused': { color: colors.primary }
                                              },
                                            }}
                                          />
                                          <TextField
                                            label={t('calendarEndTime')}
                                            type="time"
                                            value={period.endTime}
                                            onChange={(e) => {
                                              const newPeriods = [...timeRanges.periods];
                                              newPeriods[index].endTime = e.target.value;
                                              setTimeRanges({ ...timeRanges, periods: newPeriods });
                                            }}
                                            InputLabelProps={{ shrink: true }}
                                            size="small"
                                            sx={{
                                              '& .MuiOutlinedInputRoot': {
                                                backgroundColor: colors.secondary,
                                                '& fieldset': { borderColor: colors.border },
                                                '&:hover fieldset': { borderColor: colors.primary },
                                                '&.Mui-focused fieldset': { borderColor: colors.primary },
                                              },
                                              '& .MuiInputLabel-root': { 
                                                color: colors.text,
                                                '&.Mui-focused': { color: colors.primary }
                                              },
                                            }}
                                          />
                                        </Box>
                                      )}
                                    </Box>
                                  ))}
                                  
                                  {/* Add Period Button */}
                                  <Button
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={addPeriod}
                                    sx={{
                                      width: '100%',
                                      borderColor: colors.border,
                                      color: colors.text,
                                      '&:hover': {
                                        borderColor: colors.primary,
                                        backgroundColor: colors.primary + '10'
                                      }
                                    }}
                                  >
                                    {t('calendarAddPeriod')}
                                  </Button>
                                </Box>
                              )}
                            </Box>
                          )}
                        </div>
                      )}

                      {/* Attributes Tab */}
                      {activeTab === 2 && (
                        <div>
                          <EditAttributesAccordion
                            attribute={null}
                            attributes={editingCalendar?.attributes || {}}
                            setAttributes={(attributes) => setEditingCalendar({ ...editingCalendar, attributes })}
                            definitions={{ ...commonUserAttributes, ...commonDeviceAttributes, ...serverAttributes }}
                            focusAttribute={null}
                            zIndex={10003}
                          />
                        </div>
                      )}
                    </Box>
                  </div>

                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Snackbar */}
          <Dialog
            open={snackbar.open}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            style={{ zIndex: 10004 }}
          >
            <div style={{
              padding: '16px',
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              color: colors.text,
            }}>
              {snackbar.message}
            </div>
          </Dialog>
        </div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingCalendarsPopover;