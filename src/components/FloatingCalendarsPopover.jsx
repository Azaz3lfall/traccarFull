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
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CircularProgress,
  Pagination,
  Tabs,
  Tab,
  Box,
  Chip,
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
        setEditingCalendar({ 
          ...calendar, 
          type: getCalendarType(calendar), // UI only field
          frequency: rule.frequency, // UI only field
          by: rule.by, // UI only field
          startTime: times.start.format('YYYY-MM-DDTHH:mm'), // UI only field
          endTime: times.end.format('YYYY-MM-DDTHH:mm'), // UI only field
          attributes: calendar.attributes || {}
        });
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
      setDeleteDialog(false);
      setCalendarToDelete(null);
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
      
      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Traccar//NONSGML Traccar//EN',
        'BEGIN:VEVENT',
        'UID:00000000-0000-0000-0000-000000000000',
        `DTSTART;${formatCalendarTime(startTime)}`,
        `DTEND;${formatCalendarTime(endTime)}`,
        formatRule(rule),
        'SUMMARY:Event',
        'END:VEVENT',
        'END:VCALENDAR',
      ];
      
      calendarData.data = window.btoa(lines.join('\n'));
    }

    if (editingCalendar.id) {
      updateCalendarMutation.mutate(calendarData);
    } else {
      createCalendarMutation.mutate(calendarData);
    }
  };

  const handleDeleteCalendar = () => {
    if (calendarToDelete) {
      deleteCalendarMutation.mutate(calendarToDelete.id);
    }
  };

  const handleAddCalendar = () => {
    setEditingCalendar({
      name: '',
      data: simpleCalendar(),
      type: 'simple', // UI only field
      frequency: 'ONCE', // UI only field
      by: null, // UI only field
      startTime: dayjs().format('YYYY-MM-DDTHH:mm'), // UI only field
      endTime: dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'), // UI only field
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
    switch (rule.frequency) {
      case 'DAILY':
        return `RRULE:FREQ=${rule.frequency}`;
      case 'WEEKLY':
        return `RRULE:FREQ=${rule.frequency};BYDAY=${by || 'SU'}`;
      case 'MONTHLY':
        return `RRULE:FREQ=${rule.frequency};BYMONTHDAY=${by || 1}`;
      default:
        return 'RRULE:FREQ=DAILY;COUNT=1';
    }
  };


  const simpleCalendar = () => window.btoa([
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Traccar//NONSGML Traccar//EN',
    'BEGIN:VEVENT',
    'UID:00000000-0000-0000-0000-000000000000',
    `DTSTART;${formatCalendarTime(dayjs())}`,
    `DTEND;${formatCalendarTime(dayjs().add(1, 'hours'))}`,
    'RRULE:FREQ=DAILY',
    'SUMMARY:Event',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n'));

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
    
    const startLine = lines.find(line => line.startsWith('DTSTART;'));
    const endLine = lines.find(line => line.startsWith('DTEND;'));
    
    const start = startLine ? dayjs(startLine.split(':')[1], 'YYYYMMDDTHHmmss') : dayjs();
    const end = endLine ? dayjs(endLine.split(':')[1], 'YYYYMMDDTHHmmss') : dayjs().add(1, 'hour');
    
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
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddCalendar}
                size="small"
                style={{
                  backgroundColor: colors.primary,
                  color: colors.text,
                  fontSize: '12px',
                  fontWeight: '500',
                  textTransform: 'none',
                  padding: '6px 12px',
                  minWidth: 'auto',
                }}
              >
                {t('sharedAdd')}
              </Button>
            </div>
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
                '& .MuiOutlinedInput-root': {
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
                        <TableCell align="right" style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
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
                          <TableCell align="right">
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

          {/* Delete Confirmation Dialog */}
          <Dialog
            open={deleteDialog}
            onClose={() => setDeleteDialog(false)}
            style={{ zIndex: 10003 }}
            PaperProps={{
              style: {
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                zIndex: 10003,
              },
            }}
          >
            <DialogTitle style={{ color: colors.text, fontSize: '16px', fontWeight: '600' }}>
              {t('sharedDelete')} {t('sharedCalendar')}
            </DialogTitle>
            <DialogContent>
              <Typography style={{ color: colors.textSecondary, fontSize: '14px' }}>
                {t('sharedDeleteConfirm')} "{calendarToDelete?.name}"?
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setDeleteDialog(false)}
                size="small"
                style={{ color: colors.textSecondary }}
              >
                {t('sharedCancel')}
              </Button>
              <Button
                onClick={handleDeleteCalendar}
                size="small"
                style={{ color: colors.error }}
              >
                {t('sharedRemove')}
              </Button>
            </DialogActions>
          </Dialog>

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
                  </div>

                  {/* Form */}
                  <div style={{ flex: 1, overflow: 'visible', padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column' }}>
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
                    <Box style={{ flex: 1, overflow: 'auto', paddingTop: '16px' }}>
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
                              '& .MuiOutlinedInput-root': {
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
                              '& .MuiOutlinedInput-root': {
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
                                '& .MuiOutlinedInput-root': {
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
                              '& .MuiOutlinedInput-root': {
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
                              '& .MuiOutlinedInput-root': {
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
                                '& .MuiOutlinedInput-root': {
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
                                  '& .MuiOutlinedInput-root': {
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

                  {/* Footer */}
                  <div style={{
                    padding: '16px 20px',
                    borderTop: `1px solid ${colors.border}`,
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end',
                  }}>
                    <Button
                      onClick={() => {
                        setEditDialog(false);
                        setEditingCalendar(null);
                      }}
                      style={{ color: colors.textSecondary }}
                    >
                      {t('sharedCancel')}
                    </Button>
                    <Button
                      onClick={handleSaveCalendar}
                      variant="contained"
                      disabled={createCalendarMutation.isPending || updateCalendarMutation.isPending || !editingCalendar?.name}
                      style={{
                        backgroundColor: colors.primary,
                        color: colors.text,
                      }}
                    >
                      {(createCalendarMutation.isPending || updateCalendarMutation.isPending) ? (
                        <CircularProgress size={16} />
                      ) : (
                        t('sharedSave')
                      )}
                    </Button>
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