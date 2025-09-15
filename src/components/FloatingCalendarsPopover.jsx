import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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
  Switch,
  FormControlLabel,
  Chip,
  Avatar,
  Typography,
  InputAdornment,
  CircularProgress,
  Pagination,
  Tabs,
  Tab,
  Box,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  FormGroup,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Login as LoginIcon,
  Link as LinkIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Block as BlockIcon,
  CheckCircle as CheckIcon,
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  CalendarToday as CalendarIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import { useCatch } from '../reactHelper';
import { formatBoolean } from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors, useTheme } from '../common/components/ThemeProvider';
import fetchOrThrow from '../common/util/fetchOrThrow';
import dayjs from 'dayjs';
import useUserAttributes from '../common/attributes/useUserAttributes';
import useCommonUserAttributes from '../common/attributes/useCommonUserAttributes';
import useCommonDeviceAttributes from '../common/attributes/useCommonDeviceAttributes';
import useServerAttributes from '../common/attributes/useServerAttributes';
import EditAttributesAccordion from '../settings/components/EditAttributesAccordion';
import SelectField from '../common/components/SelectField';
import { prefixString } from '../common/util/stringUtils';

const FloatingCalendarsPopover = ({ isVisible, onClose, desktop, isMenuExpanded }) => {
  const colors = useThemeColors();
  const theme = useTheme();
  const t = useTranslation();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const navigate = useNavigate();

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

  // Attributes hooks
  const userAttributes = useUserAttributes();
  const commonUserAttributes = useCommonUserAttributes();
  const commonDeviceAttributes = useCommonDeviceAttributes();
  const serverAttributes = useServerAttributes();

  console.log('FloatingCalendarsPopover state:', { editDialog, isVisible });

  // Fetch calendars with TanStack Query
  console.log('=== TEST: Before useQuery ===');
  const { data: calendars = [], isLoading, error } = useQuery({
    queryKey: ['calendars'],
    queryFn: async () => {
      console.log('=== TEST: Fetching calendars ===');
      const response = await fetch('/api/calendars');
      if (!response.ok) {
        throw new Error('Failed to fetch calendars');
      }
      const data = await response.json();
      console.log('=== TEST: Calendars data ===', data);
      return data;
    },
    enabled: isVisible,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  console.log('=== TEST: After useQuery ===', { calendars, isLoading, error });

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
          frequency: rule.frequency,
          by: rule.by,
          startTime: times.start.format('YYYY-MM-DDTHH:mm'),
          endTime: times.end.format('YYYY-MM-DDTHH:mm'),
          attributes: calendar.attributes || {}
        });
        setEditDialog(true);
        setActiveTab(0);
        setAnchorEl(null);
      },
    },
    {
      key: 'delete',
      title: t('sharedDelete'),
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
      const response = await fetchOrThrow('/api/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calendarData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['calendars']);
      setSnackbar({ open: true, message: t('sharedSaved'), severity: 'success' });
      setEditDialog(false);
      setEditingCalendar(null);
    },
    onError: (error) => {
      console.error('Error creating calendar:', error);
      setSnackbar({ open: true, message: t('sharedError'), severity: 'error' });
    },
  });

  const updateCalendarMutation = useMutation({
    mutationFn: async (calendarData) => {
      const response = await fetchOrThrow(`/api/calendars/${calendarData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calendarData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['calendars']);
      setSnackbar({ open: true, message: t('sharedSaved'), severity: 'success' });
      setEditDialog(false);
      setEditingCalendar(null);
    },
    onError: (error) => {
      console.error('Error updating calendar:', error);
      setSnackbar({ open: true, message: t('sharedError'), severity: 'error' });
    },
  });

  const deleteCalendarMutation = useMutation({
    mutationFn: async (calendarId) => {
      await fetchOrThrow(`/api/calendars/${calendarId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['calendars']);
      setSnackbar({ open: true, message: t('sharedDeleted'), severity: 'success' });
      setDeleteDialog(false);
      setCalendarToDelete(null);
    },
    onError: (error) => {
      console.error('Error deleting calendar:', error);
      setSnackbar({ open: true, message: t('sharedError'), severity: 'error' });
    },
  });

  // Handlers
  const handleSaveCalendar = () => {
    if (!editingCalendar) return;

    // Generate iCal data for simple calendars
    let calendarData = editingCalendar;
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
      
      calendarData = {
        ...editingCalendar,
        data: window.btoa(lines.join('\n'))
      };
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
      type: 'simple',
      frequency: 'ONCE',
      by: null,
      startTime: dayjs().format('YYYY-MM-DDTHH:mm'),
      endTime: dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
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

  const updateCalendar = (lines, index, element) => window.btoa(lines.map((e, i) => (i !== index ? e : element)).join('\n'));

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

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
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
          borderRadius: '12px',
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
                  color: 'white',
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
              style={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: colors.secondary,
                  '& fieldset': { borderColor: colors.border },
                  '&:hover fieldset': { borderColor: colors.primary },
                  '&.Mui-focused fieldset': { borderColor: colors.primary },
                }
              }}
            />
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
            {isLoading ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                gap: '16px',
                padding: '40px 20px',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: colors.surface,
              }}>
                <CircularProgress 
                  size={40} 
                  style={{ 
                    color: colors.primary,
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                  }} 
                />
                <Typography 
                  variant="body2" 
                  style={{ 
                    color: colors.textSecondary,
                    fontSize: '14px',
                    fontWeight: '500'
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
                      <TableRow>
                        <TableCell style={{ color: colors.text, fontWeight: '600', borderBottom: `1px solid ${colors.border}` }}>
                          {t('sharedName')}
                        </TableCell>
                        <TableCell style={{ color: colors.text, fontWeight: '600', borderBottom: `1px solid ${colors.border}` }}>
                          {t('sharedType')}
                        </TableCell>
                        <TableCell style={{ color: colors.text, fontWeight: '600', borderBottom: `1px solid ${colors.border}` }}>
                          {t('sharedActions')}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedCalendars.map((calendar) => (
                        <TableRow key={calendar.id} hover>
                          <TableCell style={{ color: colors.text, borderBottom: `1px solid ${colors.border}` }}>
                            {calendar.name}
                          </TableCell>
                          <TableCell style={{ color: colors.textSecondary, borderBottom: `1px solid ${colors.border}` }}>
                            <Chip
                              label={getCalendarType(calendar) === 'simple' ? t('calendarSimple') : t('reportCustom')}
                              size="small"
                              style={{
                                backgroundColor: getCalendarType(calendar) === 'simple' ? `${colors.primary}15` : `${colors.secondary}15`,
                                color: getCalendarType(calendar) === 'simple' ? colors.primary : colors.textSecondary,
                                fontSize: '11px',
                                height: '24px',
                              }}
                            />
                          </TableCell>
                          <TableCell style={{ borderBottom: `1px solid ${colors.border}` }}>
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
                    width: '500px',
                    height: '100vh',
                    backgroundColor: colors.surface,
                    borderLeft: `1px solid ${colors.border}`,
                    zIndex: 10000,
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
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
                  <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column' }}>
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
                            style={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: colors.secondary,
                                '& fieldset': { borderColor: colors.border },
                                '&:hover fieldset': { borderColor: colors.primary },
                                '&.Mui-focused fieldset': { borderColor: colors.primary },
                              }
                            }}
                          />

                          {/* Type */}
                          <FormControl fullWidth size="small">
                            <InputLabel>{t('sharedType')}</InputLabel>
                            <Select
                              value={editingCalendar?.type || 'simple'}
                              onChange={(e) => {
                                const type = e.target.value;
                                setEditingCalendar({
                                  ...editingCalendar,
                                  type,
                                  data: type === 'simple' ? simpleCalendar() : '',
                                });
                              }}
                              label={t('sharedType')}
                              MenuProps={{
                                PaperProps: {
                                  style: {
                                    zIndex: 10004,
                                  },
                                },
                              }}
                            >
                              <MenuItem value="simple" style={{ color: colors.text }}>
                                {t('calendarSimple')}
                              </MenuItem>
                              <MenuItem value="custom" style={{ color: colors.text }}>
                                {t('reportCustom')}
                              </MenuItem>
                            </Select>
                          </FormControl>

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
                              style={{
                                '& .MuiOutlinedInput-root': {
                                  backgroundColor: colors.secondary,
                                  '& fieldset': { borderColor: colors.border },
                                  '&:hover fieldset': { borderColor: colors.primary },
                                  '&.Mui-focused fieldset': { borderColor: colors.primary },
                                }
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
                            style={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: colors.secondary,
                                '& fieldset': { borderColor: colors.border },
                                '&:hover fieldset': { borderColor: colors.primary },
                                '&.Mui-focused fieldset': { borderColor: colors.primary },
                              }
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
                            style={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: colors.secondary,
                                '& fieldset': { borderColor: colors.border },
                                '&:hover fieldset': { borderColor: colors.primary },
                                '&.Mui-focused fieldset': { borderColor: colors.primary },
                              }
                            }}
                          />

                          {/* Recurrence */}
                          <FormControl fullWidth size="small">
                            <InputLabel>{t('calendarRecurrence')}</InputLabel>
                            <Select
                              value={editingCalendar?.frequency || 'ONCE'}
                              onChange={(e) => setEditingCalendar({ ...editingCalendar, frequency: e.target.value, by: null })}
                              label={t('calendarRecurrence')}
                              MenuProps={{
                                PaperProps: {
                                  style: {
                                    zIndex: 10004,
                                  },
                                },
                              }}
                            >
                              {['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY'].map((frequency) => (
                                <MenuItem key={frequency} value={frequency} style={{ color: colors.text }}>
                                  {t(prefixString('calendar', frequency.toLowerCase()))}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>

                          {/* Conditional Days Selection */}
                          {['WEEKLY', 'MONTHLY'].includes(editingCalendar?.frequency) && (
                            <FormControl fullWidth size="small">
                              <InputLabel>{t('calendarDays')}</InputLabel>
                              <Select
                                multiple
                                label={t('calendarDays')}
                                value={editingCalendar?.by || []}
                                onChange={(e) => setEditingCalendar({ ...editingCalendar, by: e.target.value })}
                                MenuProps={{
                                  PaperProps: {
                                    style: {
                                      zIndex: 10004,
                                    },
                                  },
                                }}
                              >
                                {editingCalendar?.frequency === 'WEEKLY' ? 
                                  ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => (
                                    <MenuItem key={day} value={day.substring(0, 2).toUpperCase()} style={{ color: colors.text }}>
                                      {t(prefixString('calendar', day))}
                                    </MenuItem>
                                  )) : 
                                  Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                    <MenuItem key={day} value={String(day)} style={{ color: colors.text }}>
                                      {day}
                                    </MenuItem>
                                  ))
                                }
                              </Select>
                            </FormControl>
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
    </AnimatePresence>
  );
};

export default FloatingCalendarsPopover;