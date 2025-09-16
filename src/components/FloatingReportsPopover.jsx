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
import { formatTime } from '../common/util/formatter';
import { prefixString } from '../common/util/stringUtils';
import fetchOrThrow from '../common/util/fetchOrThrow';
import SelectField from '../common/components/SelectField';
import dayjs from 'dayjs';
import StarIcon from '@mui/icons-material/Star';
import TimelineIcon from '@mui/icons-material/Timeline';
import PauseCircleFilledIcon from '@mui/icons-material/PauseCircleFilled';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RouteIcon from '@mui/icons-material/Route';
import NotesIcon from '@mui/icons-material/Notes';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import BarChartIcon from '@mui/icons-material/BarChart';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

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

  const devices = useSelector((state) => state.devices.items);
  const groups = useSelector((state) => state.groups.items);

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
                      <FormControl fullWidth>
                        <InputLabel>{t('deviceTitle')}</InputLabel>
                        <Select
                          label={t('deviceTitle')}
                          multiple
                          value={deviceIds}
                          onChange={(e) => setDeviceIds(e.target.value)}
                          MenuProps={{
                            disablePortal: false,
                            style: { zIndex: 10002 }
                          }}
                        >
                          {Object.values(devices).sort((a, b) => a.name.localeCompare(b.name)).map((device) => (
                            <MenuItem key={device.id} value={device.id}>
                              {device.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                    
                    {/* Group Selection */}
                    <div style={{ flex: desktop ? '1 1 200px' : '1 1 auto', minWidth: 0 }}>
                      <FormControl fullWidth>
                        <InputLabel>{t('settingsGroups')}</InputLabel>
                        <Select
                          label={t('settingsGroups')}
                          multiple
                          value={groupIds}
                          onChange={(e) => setGroupIds(e.target.value)}
                          MenuProps={{
                            disablePortal: false,
                            style: { zIndex: 10002 }
                          }}
                        >
                          {Object.values(groups).sort((a, b) => a.name.localeCompare(b.name)).map((group) => (
                            <MenuItem key={group.id} value={group.id}>
                              {group.name}
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
