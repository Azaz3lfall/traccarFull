import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
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
  Typography,
  InputAdornment,
  CircularProgress,
  Pagination,
  Tabs,
  Tab,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ChevronLeft as ChevronLeftIcon,
  Folder as FolderIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Web as WebIcon,
  CheckCircle as CheckIcon,
  Block as BlockIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
} from '@mui/icons-material';
import { useCatch } from '../reactHelper';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors, useTheme } from '../common/components/ThemeProvider';
import { useManager, useAdministrator } from '../common/util/permissions';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { resellersActions } from '../store';
import { useSelector } from 'react-redux';

const FloatingResellersPopover = ({ 
  desktop, 
  isMenuExpanded, 
  isVisible, 
  onClose 
}) => {
  const t = useTranslation();
  const colors = useThemeColors();
  const { theme } = useTheme();
  const manager = useManager();
  const admin = useAdministrator();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.session.user);

  // State management
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedReseller, setSelectedReseller] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [resellerToDelete, setResellerToDelete] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [editingReseller, setEditingReseller] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [activeTab, setActiveTab] = useState(0);

  // Mock data for now - will be replaced with real API calls
  const mockResellers = [
    {
      id: 1,
      name: 'Tech Solutions Inc',
      email: 'admin@techsolutions.com',
      phone: '+1-555-0123',
      website: 'https://techsolutions.com',
      status: 'active',
      resellerLimit: 10,
      deviceLimit: 100,
      userLimit: 50,
      createdAt: '2024-01-15',
      logo: '',
      whatsapp: '+1-555-0123',
      billingEmail: 'billing@techsolutions.com',
      supportEmail: 'support@techsolutions.com',
    },
    {
      id: 2,
      name: 'GPS Fleet Management',
      email: 'contact@gpsfleet.com',
      phone: '+1-555-0456',
      website: 'https://gpsfleet.com',
      status: 'inactive',
      resellerLimit: 5,
      deviceLimit: 50,
      userLimit: 25,
      createdAt: '2024-02-20',
      logo: '',
      whatsapp: '+1-555-0456',
      billingEmail: 'billing@gpsfleet.com',
      supportEmail: 'support@gpsfleet.com',
    },
  ];

  // Filter resellers based on search keyword
  const filteredResellers = mockResellers.filter(reseller =>
    reseller.name?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    reseller.email?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    reseller.phone?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    reseller.website?.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [searchKeyword]);

  // Pagination
  const totalPages = Math.ceil(filteredResellers.length / pageSize);
  const paginatedResellers = filteredResellers.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Handle edit reseller
  const handleEdit = (reseller) => {
    setEditingReseller({
      ...reseller,
    });
    setActiveTab(0);
    setEditDialog(true);
    setAnchorEl(null);
  };

  // Handle delete reseller
  const handleDelete = (reseller) => {
    setResellerToDelete(reseller);
    setDeleteDialog(true);
    setAnchorEl(null);
  };

  // Handle delete confirmation
  const confirmDelete = () => {
    if (resellerToDelete) {
      // TODO: Implement delete API call
      console.log('Delete reseller:', resellerToDelete.id);
    }
    setDeleteDialog(false);
    setResellerToDelete(null);
  };

  // Handle delete cancellation
  const cancelDelete = () => {
    setDeleteDialog(false);
    setResellerToDelete(null);
  };

  // Handle save reseller
  const handleSaveReseller = async () => {
    if (!editingReseller) return;

    // Create payload matching the exact structure you specified
    const fullPayload = {
      currentDomain: window.location.hostname,
      parentUserId: user?.id || '',
      parentUser: user?.name || user?.login || '',
      parentEmail: user?.email || '',
      resellerId: editingReseller.resellerId || '',
      resellerUser: editingReseller.resellerUser || '',
      resellerEmail: editingReseller.resellerEmail || '',
      companyName: editingReseller.companyName || '',
      logotype: editingReseller.logo || '',
      appUrl: editingReseller.url || '',
      whatsapp: editingReseller.whatsapp || '',
      billingEmail: editingReseller.billingEmail || '',
      supportEmail: editingReseller.supportEmail || '',
      resellerLimit: parseInt(editingReseller.resellerLimit) || 0,
      deviceLimit: parseInt(editingReseller.deviceLimit) || 0,
      userLimit: parseInt(editingReseller.userLimit) || 0,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    // Console log the full payload
    console.log('🚀 FULL RESELLER PAYLOAD:', fullPayload);
    console.log('📊 Payload size:', JSON.stringify(fullPayload).length, 'characters');
    console.log('🔍 Individual field values:');
    Object.entries(fullPayload).forEach(([key, value]) => {
      console.log(`  ${key}:`, value);
    });

    // Send data to resellers server on port 3333
    try {
      const response = await fetch('http://localhost:3333/api/resellers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullPayload),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Reseller saved successfully:', result);
        // TODO: Show success notification
      } else {
        const error = await response.json();
        console.error('❌ Error saving reseller:', error);
        // TODO: Show error notification
      }
    } catch (error) {
      console.error('❌ Network error saving reseller:', error);
      // TODO: Show network error notification
    }
    
    // Don't close drawer for now - keep it open for debugging
    // setEditDialog(false);
    // setEditingReseller(null);
  };

  // Handle closing edit dialog
  const handleCloseEditDialog = () => {
    setEditDialog(false);
    setEditingReseller(null);
  };

  // Menu actions
  const actions = [
    {
      key: 'edit',
      title: t('sharedEdit'),
      icon: <EditIcon fontSize="small" />,
      handler: handleEdit,
      show: admin,
    },
    {
      key: 'delete',
      title: t('sharedRemove'),
      icon: <DeleteIcon fontSize="small" />,
      handler: handleDelete,
      show: admin,
    },
  ];

  const getStatusIcon = (reseller) => {
    if (reseller.status === 'inactive') return <BlockIcon />;
    return <CheckIcon />;
  };

  const getStatusColor = (reseller) => {
    return reseller.status === 'active' ? colors.success : colors.error;
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="floating-resellers-popover"
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
            overflow: 'hidden',
            boxShadow: !desktop ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
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
                  {t('resellerPanel')}
                </Typography>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setEditingReseller({ 
                      name: '', 
                      email: '', 
                      phone: '',
                      website: '',
                      status: 'active',
                      resellerLimit: 5,
                      deviceLimit: 50,
                      userLimit: 25,
                      logo: '',
                      whatsapp: '',
                      billingEmail: '',
                      supportEmail: '',
                    });
                    setActiveTab(0);
                    setEditDialog(true);
                  }}
                  size="small"
                  style={{
                    backgroundColor: colors.primary,
                    color: colors.text,
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: '500',
                  }}
                >
                  {t('sharedAdd')}
                </Button>
              </div>
            </div>

            {/* Search */}
            <div style={{
              padding: '12px 20px',
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
            }}>
              <TextField
                placeholder={t('sharedSearch')}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon style={{ color: colors.textSecondary }} fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  flex: 1,
                  minWidth: '120px',
                  '& .MuiOutlinedInputRoot': {
                    borderRadius: '8px',
                  },
                }}
              />
            </div>

            {/* Resellers Table */}
            <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow style={{ backgroundColor: colors.surface }}>
                      {desktop && (
                        <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                          {t('sharedName')}
                        </TableCell>
                      )}
                      <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                        {t('userEmail')}
                      </TableCell>
                      {desktop && (
                        <>
                          <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                            {t('sharedPhone')}
                          </TableCell>
                          <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                            {t('sharedStatus')}
                          </TableCell>
                        </>
                      )}
                      <TableCell align="right" style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                        {t('sharedActions')}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedResellers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={desktop ? 5 : 2} align="center" style={{ padding: '20px', color: colors.textSecondary, lineHeight: 0.8, fontSize: '12px' }}>
                          {t('sharedNoData')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {paginatedResellers.map((reseller, index) => (
                          <TableRow
                            key={reseller.id}
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
                            {desktop && (
                              <TableCell>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <BusinessIcon
                                    style={{
                                      color: colors.primary,
                                      width: '20px',
                                      height: '20px',
                                    }}
                                  />
                                  <div>
                                    <Typography variant="body2" style={{ color: colors.text, fontWeight: '500', lineHeight: 1.8, fontSize: '13px' }}>
                                      {reseller.name || t('sharedUnknown')}
                                    </Typography>
                                    {reseller.website && (
                                      <Typography variant="caption" style={{ color: colors.textSecondary, fontSize: '10px' }}>
                                        {reseller.website}
                                      </Typography>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            )}
                            <TableCell style={{ color: colors.text, lineHeight: 1.8, fontSize: '13px' }}>
                              {reseller.email || '-'}
                            </TableCell>
                            {desktop && (
                              <>
                                <TableCell style={{ color: colors.text, lineHeight: 1.8, fontSize: '13px' }}>
                                  {reseller.phone || '-'}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    icon={getStatusIcon(reseller)}
                                    label={reseller.status === 'active' ? t('sharedActive') : t('sharedInactive')}
                                    size="small"
                                    style={{
                                      backgroundColor: getStatusColor(reseller),
                                      color: colors.text,
                                      fontSize: '10px',
                                      height: '16px',
                                    }}
                                  />
                                </TableCell>
                              </>
                            )}
                            <TableCell align="right">
                              <IconButton
                                onClick={(e) => {
                                  setSelectedReseller(reseller);
                                  setAnchorEl(e.currentTarget);
                                }}
                                size="small"
                                style={{ color: colors.textSecondary, padding: '2px' }}
                              >
                                <MoreVertIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                padding: '8px 16px',
                borderTop: `1px solid ${colors.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
              }}>
                <Typography style={{ color: colors.textSecondary, fontSize: '11px', lineHeight: 0.8 }}>
                  {page} / {totalPages} ({filteredResellers.length} {t('resellerPanel')})
                </Typography>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
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
                    onChange={(event, value) => setPage(value)}
                    color="primary"
                    size="small"
                    showFirstButton={false}
                    showLastButton={false}
                    style={{
                      '& .MuiPaginationItem-root': {
                        color: colors.text,
                        fontSize: '10px',
                        minWidth: '24px',
                        height: '24px',
                        '&.Mui-selected': {
                          backgroundColor: colors.primary,
                          color: colors.text,
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
              </div>
            )}

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
                  minWidth: '140px',
                  zIndex: 10002,
                },
              }}
            >
              {actions
                .filter(action => action.show !== false)
                .map((action) => (
                  <MenuItem
                    key={action.key}
                    onClick={() => action.handler(selectedReseller)}
                    style={{ color: colors.text, fontSize: '12px' }}
                  >
                    {action.icon}
                    <span style={{ marginLeft: '6px' }}>{action.title}</span>
                  </MenuItem>
                ))}
            </Menu>

            {/* Delete Confirmation Modal */}
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
                      {t('sharedDeleteConfirm')} "{resellerToDelete?.name}"?
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

            {/* Edit Reseller Drawer */}
            <AnimatePresence>
              {editDialog && (
                <>
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleCloseEditDialog}
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      zIndex: 9999,
                    }}
                  />
                  
                  {/* Reseller Drawer */}
                  <motion.div
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    style={{
                      position: 'fixed',
                      top: 0,
                      right: 0,
                      width: desktop ? '400px' : '100vw',
                      height: '100vh',
                      backgroundColor: colors.surface,
                      borderLeft: desktop ? `1px solid ${colors.border}` : 'none',
                      zIndex: 10000,
                      boxShadow: desktop ? '-4px 0 20px rgba(0, 0, 0, 0.15)' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
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
                          onClick={handleCloseEditDialog}
                          size="small"
                          style={{ color: colors.textSecondary }}
                        >
                          <ChevronLeftIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                          {t('resellerPanel')}
                        </Typography>
                      </div>
                    </div>

                    {/* Drawer Content */}
                    <div style={{ 
                      flex: 1, 
                      overflow: 'auto', 
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}>
                      {editingReseller && (
                        <>
                          {/* Reseller Tabs */}
                          <Tabs
                            value={activeTab}
                            onChange={(e, newValue) => setActiveTab(newValue)}
                            variant="scrollable"
                            scrollButtons="auto"
                            style={{
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
                            <Tab label={t('resellerBranding')} />
                            <Tab label={t('resellerContact')} />
                            <Tab label={t('resellerPermissions')} />
                          </Tabs>

                          {/* Tab Content */}
                          <Box style={{ flex: 1, overflow: 'auto', paddingTop: '16px' }}>
                            {/* Branding Tab */}
                            {activeTab === 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <TextField
                                  fullWidth
                                  value={editingReseller.resellerId || ''}
                                  onChange={(e) => setEditingReseller({ ...editingReseller, resellerId: e.target.value })}
                                  label={t('resellerId')}
                                  required
                                  sx={{
                                    '& .MuiOutlinedInputRoot': {
                                      backgroundColor: colors.secondary,
                                      '& fieldset': { borderColor: colors.border },
                                      '&:hover fieldset': { borderColor: colors.primary },
                                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                                    },
                                    '& .MuiInputLabelRoot': {
                                      color: colors.textSecondary,
                                      '&.Mui-focused': { color: colors.primary }
                                    },
                                  }}
                                />
                                
                                <TextField
                                  fullWidth
                                  value={editingReseller.companyName || ''}
                                  onChange={(e) => setEditingReseller({ ...editingReseller, companyName: e.target.value })}
                                  label={t('resellerCompanyName')}
                                  required
                                  sx={{
                                    '& .MuiOutlinedInputRoot': {
                                      backgroundColor: colors.secondary,
                                      '& fieldset': { borderColor: colors.border },
                                      '&:hover fieldset': { borderColor: colors.primary },
                                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                                    },
                                    '& .MuiInputLabelRoot': {
                                      color: colors.textSecondary,
                                      '&.Mui-focused': { color: colors.primary }
                                    },
                                  }}
                                />
                                
                                <TextField
                                  fullWidth
                                  value={editingReseller.logo || ''}
                                  onChange={(e) => setEditingReseller({ ...editingReseller, logo: e.target.value })}
                                  label={t('resellerLogotype')}
                                  required
                                  sx={{
                                    '& .MuiOutlinedInputRoot': {
                                      backgroundColor: colors.secondary,
                                      '& fieldset': { borderColor: colors.border },
                                      '&:hover fieldset': { borderColor: colors.primary },
                                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                                    },
                                    '& .MuiInputLabelRoot': {
                                      color: colors.textSecondary,
                                      '&.Mui-focused': { color: colors.primary }
                                    },
                                  }}
                                />
                                
                                <TextField
                                  fullWidth
                                  value={editingReseller.url || ''}
                                  onChange={(e) => setEditingReseller({ ...editingReseller, url: e.target.value })}
                                  label={t('resellerAppUrl')}
                                  required
                                  sx={{
                                    '& .MuiOutlinedInputRoot': {
                                      backgroundColor: colors.secondary,
                                      '& fieldset': { borderColor: colors.border },
                                      '&:hover fieldset': { borderColor: colors.primary },
                                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                                    },
                                    '& .MuiInputLabelRoot': {
                                      color: colors.textSecondary,
                                      '&.Mui-focused': { color: colors.primary }
                                    },
                                  }}
                                />
                              </div>
                            )}

                            {/* Contact Tab */}
                            {activeTab === 1 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <TextField
                                  fullWidth
                                  value={editingReseller.resellerUser || ''}
                                  onChange={(e) => setEditingReseller({ ...editingReseller, resellerUser: e.target.value })}
                                  label={t('resellerUser')}
                                  required
                                  sx={{
                                    '& .MuiOutlinedInputRoot': {
                                      backgroundColor: colors.secondary,
                                      '& fieldset': { borderColor: colors.border },
                                      '&:hover fieldset': { borderColor: colors.primary },
                                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                                    },
                                    '& .MuiInputLabelRoot': {
                                      color: colors.textSecondary,
                                      '&.Mui-focused': { color: colors.primary }
                                    },
                                  }}
                                />
                                
                                <TextField
                                  fullWidth
                                  value={editingReseller.resellerEmail || ''}
                                  onChange={(e) => setEditingReseller({ ...editingReseller, resellerEmail: e.target.value })}
                                  label={t('resellerEmail')}
                                  type="email"
                                  required
                                  sx={{
                                    '& .MuiOutlinedInputRoot': {
                                      backgroundColor: colors.secondary,
                                      '& fieldset': { borderColor: colors.border },
                                      '&:hover fieldset': { borderColor: colors.primary },
                                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                                    },
                                    '& .MuiInputLabelRoot': {
                                      color: colors.textSecondary,
                                      '&.Mui-focused': { color: colors.primary }
                                    },
                                  }}
                                />
                                
                                <TextField
                                  fullWidth
                                  value={editingReseller.whatsapp || ''}
                                  onChange={(e) => setEditingReseller({ ...editingReseller, whatsapp: e.target.value })}
                                  label={t('resellerWhatsapp')}
                                  required
                                  sx={{
                                    '& .MuiOutlinedInputRoot': {
                                      backgroundColor: colors.secondary,
                                      '& fieldset': { borderColor: colors.border },
                                      '&:hover fieldset': { borderColor: colors.primary },
                                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                                    },
                                    '& .MuiInputLabelRoot': {
                                      color: colors.textSecondary,
                                      '&.Mui-focused': { color: colors.primary }
                                    },
                                  }}
                                />
                                
                                <TextField
                                  fullWidth
                                  value={editingReseller.billingEmail || ''}
                                  onChange={(e) => setEditingReseller({ ...editingReseller, billingEmail: e.target.value })}
                                  label={t('resellerBillingEmail')}
                                  type="email"
                                  required
                                  sx={{
                                    '& .MuiOutlinedInputRoot': {
                                      backgroundColor: colors.secondary,
                                      '& fieldset': { borderColor: colors.border },
                                      '&:hover fieldset': { borderColor: colors.primary },
                                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                                    },
                                    '& .MuiInputLabelRoot': {
                                      color: colors.textSecondary,
                                      '&.Mui-focused': { color: colors.primary }
                                    },
                                  }}
                                />
                                
                                <TextField
                                  fullWidth
                                  value={editingReseller.supportEmail || ''}
                                  onChange={(e) => setEditingReseller({ ...editingReseller, supportEmail: e.target.value })}
                                  label={t('resellerSupportEmail')}
                                  type="email"
                                  required
                                  sx={{
                                    '& .MuiOutlinedInputRoot': {
                                      backgroundColor: colors.secondary,
                                      '& fieldset': { borderColor: colors.border },
                                      '&:hover fieldset': { borderColor: colors.primary },
                                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                                    },
                                    '& .MuiInputLabelRoot': {
                                      color: colors.textSecondary,
                                      '&.Mui-focused': { color: colors.primary }
                                    },
                                  }}
                                />
                              </div>
                            )}

                            {/* Permissions Tab */}
                            {activeTab === 2 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <TextField
                                  fullWidth
                                  value={editingReseller.resellerLimit || ''}
                                  onChange={(e) => setEditingReseller({ ...editingReseller, resellerLimit: e.target.value })}
                                  label={t('resellerLimit')}
                                  type="number"
                                  required
                                  inputProps={{ min: 1 }}
                                  sx={{
                                    '& .MuiOutlinedInputRoot': {
                                      backgroundColor: colors.secondary,
                                      '& fieldset': { borderColor: colors.border },
                                      '&:hover fieldset': { borderColor: colors.primary },
                                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                                    },
                                    '& .MuiInputLabelRoot': {
                                      color: colors.textSecondary,
                                      '&.Mui-focused': { color: colors.primary }
                                    },
                                  }}
                                />
                                
                                <TextField
                                  fullWidth
                                  value={editingReseller.deviceLimit || ''}
                                  onChange={(e) => setEditingReseller({ ...editingReseller, deviceLimit: e.target.value })}
                                  label={t('userDeviceLimit')}
                                  type="number"
                                  required
                                  inputProps={{ min: 1 }}
                                  sx={{
                                    '& .MuiOutlinedInputRoot': {
                                      backgroundColor: colors.secondary,
                                      '& fieldset': { borderColor: colors.border },
                                      '&:hover fieldset': { borderColor: colors.primary },
                                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                                    },
                                    '& .MuiInputLabelRoot': {
                                      color: colors.textSecondary,
                                      '&.Mui-focused': { color: colors.primary }
                                    },
                                  }}
                                />
                                
                                <TextField
                                  fullWidth
                                  value={editingReseller.userLimit || ''}
                                  onChange={(e) => setEditingReseller({ ...editingReseller, userLimit: e.target.value })}
                                  label={t('userUserLimit')}
                                  type="number"
                                  required
                                  inputProps={{ min: 1 }}
                                  sx={{
                                    '& .MuiOutlinedInputRoot': {
                                      backgroundColor: colors.secondary,
                                      '& fieldset': { borderColor: colors.border },
                                      '&:hover fieldset': { borderColor: colors.primary },
                                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                                    },
                                    '& .MuiInputLabelRoot': {
                                      color: colors.textSecondary,
                                      '&.Mui-focused': { color: colors.primary }
                                    },
                                  }}
                                />
                              </div>
                            )}
                          </Box>
                        </>
                      )}
                    </div>

                    {/* Drawer Footer */}
                    <div style={{
                      padding: '16px 20px',
                      borderTop: `1px solid ${colors.border}`,
                      display: 'flex',
                      gap: '12px',
                      justifyContent: 'flex-end',
                      backgroundColor: colors.surface,
                    }}>
                      <Button
                        variant="outlined"
                        onClick={handleCloseEditDialog}
                        style={{
                          borderColor: colors.border,
                          color: colors.text,
                        }}
                      >
                        {t('sharedCancel')}
                      </Button>
                      <Button
                        variant="contained"
                        onClick={handleSaveReseller}
                        style={{
                          backgroundColor: colors.primary,
                          color: colors.text,
                        }}
                      >
                        {t('sharedSave')}
                      </Button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingResellersPopover;
