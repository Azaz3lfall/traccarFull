import { useState, useEffect, useCallback } from 'react';
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
  Snackbar,
  Autocomplete,
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
import resellersConfig from '../config/resellersConfig';
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [usersFetched, setUsersFetched] = useState(false);
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);

  // Fetch resellers with TanStack Query
  const { data: resellersData, isLoading, error, refetch } = useQuery({
    queryKey: ['resellers', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User ID is required');
      }
      
      const response = await fetch(resellersConfig.ENDPOINTS.LIST, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parentUserId: user.id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch resellers');
      }

      const data = await response.json();
      return data.resellers || [];
    },
    enabled: isVisible && !!user?.id, // Only fetch when popover is visible and user is logged in
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Filter resellers based on search keyword
  const filteredResellers = (resellersData || []).filter(reseller =>
    reseller.companyName?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    reseller.appUrl?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    reseller.resellerEmail?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    reseller.resellerUser?.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [searchKeyword]);

  // Debounced fetch users function
  const debouncedFetchUsers = useCallback(() => {
    const timeoutId = setTimeout(async () => {
      if (usersFetched) return; // Only fetch once
      
      setUsersLoading(true);
      setUsersError(null);
      
      try {
        const response = await fetch('/api/users', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        // Store all users for filtering, but show only first 10 initially
        setUsers(data || []);
        setUsersFetched(true);
        
        // Open autocomplete and focus after data loads
        setTimeout(() => {
          setAutocompleteOpen(true);
          setTimeout(() => {
            const input = document.querySelector('input[aria-autocomplete="list"]');
            if (input) {
              input.focus();
            }
          }, 100);
        }, 0);
      } catch (error) {
        console.error('Error fetching users:', error);
        setUsersError(error.message);
      } finally {
        setUsersLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [usersFetched]);

  // Function to trigger debounced fetch
  const fetchUsers = () => {
    if (!usersFetched) {
      debouncedFetchUsers();
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredResellers.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedResellers = filteredResellers.slice(startIndex, startIndex + pageSize);

  // Cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      // Reset all state when component unmounts
      setSearchKeyword('');
      setSelectedReseller(null);
      setAnchorEl(null);
      setDeleteDialog(false);
      setResellerToDelete(null);
      handleCloseEditDialog();
      setPage(1);
    };
  }, []);


  // Handle edit reseller
  const handleEdit = (reseller) => {
    setEditingReseller({
      ...reseller,
    });
    setIsEditMode(true);
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
      deleteResellerMutation.mutate(resellerToDelete);
    }
  };

  // Handle delete cancellation
  const cancelDelete = () => {
    setDeleteDialog(false);
    setResellerToDelete(null);
  };

  // Mutations
  const createResellerMutation = useMutation({
    mutationFn: async (resellerData) => {
    // Create FormData to send both validation data and image
    const formData = new FormData();
    
    // Add all reseller data as JSON
    formData.append('resellerData', JSON.stringify(resellerData));
    
    // Add individual fields for backend processing
    Object.keys(resellerData).forEach(key => {
      formData.append(key, resellerData[key]);
    });
    
    // Add image if selected
    if (selectedImage && resellerData.appUrl) {
      formData.append('image', selectedImage);
      formData.append('filename', `${resellerData.appUrl}.png`);
    }

      const response = await fetch(resellersConfig.ENDPOINTS.CREATE, {
        method: 'POST',
        body: formData, // Send as FormData instead of JSON
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Handle domain conflict specifically
        if (response.status === 409 && error.details) {
          const { domain, whatsapp, existingReseller } = error.details;
          
          if (domain) {
            throw new Error(`Domain '${domain}' is already registered by ${existingReseller.company} (${existingReseller.email})`);
          } else if (whatsapp) {
            throw new Error(`WhatsApp number '${whatsapp}' is already registered by ${existingReseller.company} (${existingReseller.email})`);
          }
        }
        
        throw new Error(error.message || 'Failed to create reseller');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resellers', user?.id] });
      queryClient.refetchQueries({ queryKey: ['resellers', user?.id] });
      handleCloseEditDialog();
      setSnackbar({ open: true, message: t('resellerCreatedSuccess'), severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ open: true, message: `${t('resellerCreateError')}: ${error.message}`, severity: 'error' });
    },
  });

  const updateResellerMutation = useMutation({
    mutationFn: async ({ id, ...resellerData }) => {
      const response = await fetch(resellersConfig.ENDPOINTS.UPDATE(id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resellerData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update reseller');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resellers', user?.id] });
      queryClient.refetchQueries({ queryKey: ['resellers', user?.id] });
      handleCloseEditDialog();
      setSnackbar({ open: true, message: t('resellerUpdatedSuccess'), severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ open: true, message: `${t('resellerUpdateError')}: ${error.message}`, severity: 'error' });
    },
  });

  const deleteResellerMutation = useMutation({
    mutationFn: async (reseller) => {
      const response = await fetch(resellersConfig.ENDPOINTS.DELETE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appUrl: reseller.appUrl,
          parentUserId: user?.id
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete reseller');
      }

      const result = await response.json();
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resellers', user?.id] });
      queryClient.refetchQueries({ queryKey: ['resellers', user?.id] });
      setDeleteDialog(false);
      setResellerToDelete(null);
      setSnackbar({ open: true, message: t('resellerDeletedSuccess'), severity: 'success' });
    },
    onError: (error) => {
      setSnackbar({ open: true, message: `${t('resellerDeleteError')}: ${error.message}`, severity: 'error' });
    },
  });

  // Handle save reseller
  const handleSaveReseller = async (e) => {
    e?.preventDefault(); // Prevent form submission
    if (!editingReseller) return;

    // Validate that a user is selected
    if (!editingReseller.resellerId || editingReseller.resellerId === '') {
      setSnackbar({ open: true, message: 'Please select a user for Reseller ID', severity: 'error' });
      return;
    }

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
      logotype: editingReseller.logotype || editingReseller.logo || '',
      appUrl: editingReseller.appUrl || editingReseller.url || '',
      whatsapp: editingReseller.whatsapp || '',
      billingEmail: editingReseller.billingEmail || '',
      supportEmail: editingReseller.supportEmail || '',
      resellerLimit: parseInt(editingReseller.resellerLimit) || 0,
      deviceLimit: parseInt(editingReseller.deviceLimit) || 0,
      userLimit: parseInt(editingReseller.userLimit) || 0,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    
    if (isEditMode) {
      // Update existing reseller
      updateResellerMutation.mutate({ id: editingReseller.id || editingReseller.resellerId, ...fullPayload });
    } else {
      // Create new reseller - validation happens first, then image upload
      createResellerMutation.mutate(fullPayload);
    }
  };

  // Handle closing edit dialog
  const handleCloseEditDialog = () => {
    setEditDialog(false);
    setEditingReseller(null);
    setIsEditMode(false);
    setSelectedImage(null);
    setImagePreview(null);
    setImageError('');
  };

  // Handle image selection
  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file type
    if (file.type !== 'image/png') {
      setImageError(t('resellerImageErrorPngOnly'));
      setSelectedImage(null);
      setImagePreview(null);
      return;
    }

    // Check file size (120KB = 120 * 1024 bytes)
    const maxSize = 120 * 1024;
    if (file.size > maxSize) {
      setImageError(t('resellerImageErrorSize'));
      setSelectedImage(null);
      setImagePreview(null);
      return;
    }

    // Clear errors and set image
    setImageError('');
    setSelectedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Upload image to server
  const uploadImage = async (file, appUrl, parentUserId, resellerId) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('filename', `${appUrl}.png`);
    formData.append('appUrl', appUrl);
    formData.append('parentUserId', parentUserId);
    formData.append('resellerId', resellerId);

    try {
      const response = await fetch(resellersConfig.ENDPOINTS.UPLOAD, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        return result.url || result.filename;
      } else {
        const error = await response.json();
        console.error('❌ Error uploading image:', error);
        throw new Error(error.message || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Network error uploading image:', error);
      throw error;
    }
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
    <AnimatePresence>
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
                      id: null,
                      resellerId: '',
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
                      appUrl: '',
                      logotype: ''
                    });
                    setIsEditMode(false);
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
                      <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                        {t('resellerCompany')}
                      </TableCell>
                      {desktop && (
                        <TableCell style={{ color: colors.text, fontWeight: '600', padding: '6px 12px', fontSize: '12px' }}>
                          {t('userEmail')}
                        </TableCell>
                      )}
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
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={desktop ? 5 : 2} align="center" style={{ padding: '20px' }}>
                          <CircularProgress size={24} />
                        </TableCell>
                      </TableRow>
                    ) : error ? (
                      <TableRow>
                        <TableCell colSpan={desktop ? 5 : 2} align="center" style={{ padding: '20px', color: colors.error }}>
                          Error loading resellers: {error.message}
                        </TableCell>
                      </TableRow>
                    ) : paginatedResellers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={desktop ? 5 : 2} align="center" style={{ padding: '20px', color: colors.textSecondary, lineHeight: 0.8, fontSize: '12px' }}>
                          {searchKeyword ? 'No resellers found matching your search' : t('sharedNoData')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {paginatedResellers.map((reseller, index) => (
                          <TableRow
                            key={reseller.resellerId || reseller.id}
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
                              <div>
                                <Typography variant="body2" style={{ color: colors.text, fontWeight: '500', lineHeight: 1.8, fontSize: '13px' }}>
                                  {reseller.companyName || t('sharedUnknown')}
                                </Typography>
                                {reseller.appUrl && (
                                  <Typography variant="caption" style={{ color: colors.textSecondary, fontSize: '10px' }}>
                                    {reseller.appUrl}
                                  </Typography>
                                )}
                                {!desktop && (
                                  <Typography variant="caption" style={{ color: colors.textSecondary, fontSize: '11px', display: 'block', marginTop: '2px' }}>
                                    {reseller.resellerEmail || '-'}
                                  </Typography>
                                )}
                              </div>
                            </TableCell>
                            {desktop && (
                              <TableCell style={{ color: colors.text, lineHeight: 1.8, fontSize: '13px' }}>
                                {reseller.resellerEmail || '-'}
                              </TableCell>
                            )}
                            {desktop && (
                              <>
                                <TableCell style={{ color: colors.text, lineHeight: 1.8, fontSize: '13px' }}>
                                  {reseller.whatsapp || '-'}
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
                      {t('sharedDeleteConfirm')} "{resellerToDelete?.companyName}"?
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
                                <Autocomplete
                                  fullWidth
                                  options={users}
                                  getOptionLabel={(option) => {
                                    if (typeof option === 'string') return option;
                                    const name = option.name || option.email || `User ${option.id}`;
                                    return `${option.id} - ${name}`;
                                  }}
                                  value={users.find(user => user.id === editingReseller.resellerId) || null}
                                  onChange={(event, newValue) => {
                                    if (typeof newValue === 'string') {
                                      // User typed something, find matching user
                                      const matchingUser = users.find(user => {
                                        const name = user.name || user.email || `User ${user.id}`;
                                        const displayName = `${user.id} - ${name}`;
                                        return displayName.toLowerCase() === newValue.toLowerCase();
                                      });
                                      if (matchingUser) {
                                        setEditingReseller({ 
                                          ...editingReseller, 
                                          resellerId: matchingUser.id,
                                          resellerUser: matchingUser.login || matchingUser.email,
                                          resellerEmail: matchingUser.email
                                        });
                                      } else {
                                        setEditingReseller({ 
                                          ...editingReseller, 
                                          resellerId: newValue
                                        });
                                      }
                                    } else if (newValue) {
                                      // User selected from dropdown
                                      setEditingReseller({ 
                                        ...editingReseller, 
                                        resellerId: newValue.id,
                                        resellerUser: newValue.login || newValue.email,
                                        resellerEmail: newValue.email
                                      });
                                    } else {
                                      // Cleared selection
                                      setEditingReseller({ 
                                        ...editingReseller, 
                                        resellerId: '',
                                        resellerUser: '',
                                        resellerEmail: ''
                                      });
                                    }
                                  }}
                                  onFocus={fetchUsers}
                                  loading={usersLoading}
                                  disabled={usersLoading}
                                  open={autocompleteOpen}
                                  onOpen={() => setAutocompleteOpen(true)}
                                  onClose={() => setTimeout(() => setAutocompleteOpen(false), 0)}
                                  filterOptions={(options, { inputValue }) => {
                                    if (!inputValue) {
                                      // Show only first 10 users when no input
                                      return options.slice(0, 10);
                                    }
                                    // Filter from all users when typing
                                    return options.filter(option => {
                                      const id = option.id.toString().toLowerCase();
                                      const name = (option.name || '').toLowerCase();
                                      const email = (option.email || '').toLowerCase();
                                      const login = (option.login || '').toLowerCase();
                                      const searchValue = inputValue.toLowerCase();
                                      return id.includes(searchValue) || 
                                             name.includes(searchValue) || 
                                             email.includes(searchValue) || 
                                             login.includes(searchValue);
                                    });
                                  }}
                                  freeSolo={true}
                                  selectOnFocus={false}
                                  clearOnBlur={false}
                                  handleHomeEndKeys={true}
                                  autoSelect={false}
                                  autoComplete={false}
                                  disablePortal={true}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      label={t('resellerId')}
                                      required
                                      InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                          <>
                                            {usersLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                            {params.InputProps.endAdornment}
                                          </>
                                        ),
                                      }}
                                      sx={{
                                        '& .MuiOutlinedInput-root': {
                                          backgroundColor: colors.secondary,
                                          '& fieldset': { borderColor: colors.border },
                                          '&:hover fieldset': { borderColor: colors.primary },
                                          '&.Mui-focused fieldset': { borderColor: colors.primary },
                                        },
                                        '& .MuiInputLabel-root': {
                                          color: colors.textSecondary,
                                          '&.Mui-focused': { color: colors.primary }
                                        },
                                      }}
                                    />
                                  )}
                                  renderOption={(props, option) => {
                                    const { key, ...otherProps } = props;
                                    return (
                                      <Box component="li" key={key} {...otherProps}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }}>
                                          <Typography variant="body2" style={{ color: colors.text, fontWeight: '500' }}>
                                            {option.id} - {option.name || option.email || `User ${option.id}`}
                                          </Typography>
                                          <Typography variant="caption" style={{ color: colors.textSecondary, fontSize: '10px' }}>
                                            {option.login || option.email || 'No login/email'}
                                          </Typography>
                                        </div>
                                      </Box>
                                    );
                                  }}
                                  noOptionsText={usersError ? `${t('sharedError')}: ${usersError}` : t('sharedNoData')}
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
                                
                                {/* Image Upload Field */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  <input
                                    type="file"
                                    accept=".png"
                                    onChange={handleImageSelect}
                                    style={{ display: 'none' }}
                                    id="logotype-upload"
                                  />
                                  <label htmlFor="logotype-upload">
                                    <Button
                                      variant="outlined"
                                      component="span"
                                      fullWidth
                                      style={{
                                        borderColor: colors.border,
                                        color: colors.text,
                                        height: '56px',
                                        borderStyle: 'dashed',
                                      }}
                                    >
                                      {selectedImage ? t('resellerChangeLogo') : t('resellerSelectLogo')}
                                    </Button>
                                  </label>
                                  
                                  {/* Image Preview */}
                                  {imagePreview && (
                                    <div style={{ 
                                      display: 'flex', 
                                      flexDirection: 'column', 
                                      alignItems: 'center', 
                                      gap: '8px',
                                      padding: '12px',
                                      border: `1px solid ${colors.border}`,
                                      borderRadius: '8px',
                                      backgroundColor: colors.secondary
                                    }}>
                                      <img
                                        src={imagePreview}
                                        alt="Logo preview"
                                        style={{
                                          maxWidth: '120px',
                                          maxHeight: '120px',
                                          objectFit: 'contain',
                                          borderRadius: '4px'
                                        }}
                                      />
                                      <Typography variant="caption" style={{ color: colors.textSecondary }}>
                                        {selectedImage?.name} ({(selectedImage?.size / 1024).toFixed(1)}KB)
                                      </Typography>
                                    </div>
                                  )}
                                  
                                  {/* Error Message */}
                                  {imageError && (
                                    <Typography variant="caption" style={{ color: '#f44336' }}>
                                      {imageError}
                                    </Typography>
                                  )}
                                  
                                  {/* Current Logo Display */}
                                  {!imagePreview && editingReseller.logo && (
                                    <div style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '8px',
                                      padding: '8px',
                                      border: `1px solid ${colors.border}`,
                                      borderRadius: '8px',
                                      backgroundColor: colors.secondary
                                    }}>
                                      <Typography variant="body2" style={{ color: colors.textSecondary }}>
                                        Current: {editingReseller.logo}
                                      </Typography>
                                    </div>
                                  )}
                                </div>
                                
                                <TextField
                                  fullWidth
                                  value={editingReseller.appUrl || editingReseller.url || ''}
                                  onChange={(e) => setEditingReseller({ ...editingReseller, appUrl: e.target.value })}
                                  label={t('resellerAppUrl')}
                                  required
                                  InputProps={{
                                    readOnly: isEditMode
                                  }}
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
                                  label={t('resellerUser')}
                                  required
                                  InputProps={{
                                    readOnly: true
                                  }}
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
                                  label={t('resellerEmail')}
                                  type="email"
                                  required
                                  InputProps={{
                                    readOnly: true
                                  }}
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
                        type="button"
                        variant="contained"
                        onClick={handleSaveReseller}
                        disabled={createResellerMutation.isPending || updateResellerMutation.isPending}
                        style={{
                          backgroundColor: colors.primary,
                          color: colors.text,
                        }}
                      >
                        {(createResellerMutation.isPending || updateResellerMutation.isPending) ? (
                          <>
                            <CircularProgress size={16} color="inherit" style={{ marginRight: '8px' }} />
                            {t('sharedSaving')}
                          </>
                        ) : (
                          t('sharedSave')
                        )}
                      </Button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

          </div>
        </motion.div>
      )}
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={10000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </AnimatePresence>
  );
};

export default FloatingResellersPopover;
