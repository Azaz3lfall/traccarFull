import { useState, useEffect } from 'react';
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
    Typography,
    InputAdornment,
    CircularProgress,
    Box,
    Checkbox,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Paper,
} from '@mui/material';
import {
    Search as SearchIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    ChevronLeft as ChevronLeftIcon,
    Save as SaveIcon,
    CheckBox as CheckBoxIcon,
    CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
} from '@mui/icons-material';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors, useTheme } from '../common/components/ThemeProvider';
import fetchOrThrow from '../common/util/fetchOrThrow';

const FloatingRolesPopover = ({
    desktop,
    isMenuExpanded,
    isVisible,
    onClose
}) => {
    const t = useTranslation();
    const colors = useThemeColors();
    const { theme } = useTheme();
    const queryClient = useQueryClient();

    const [searchKeyword, setSearchKeyword] = useState('');
    const [editDialog, setEditDialog] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [deleteDialog, setDeleteDialog] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState(null);

    const permissionScreens = [
        { key: 'reports', labelKey: 'reportTitle' },
        { key: 'devices', labelKey: 'deviceTitle' },
        { key: 'geofences', labelKey: 'sharedGeofences' },
        { key: 'settings', labelKey: 'settingsTitle' },
        { key: 'notifications', labelKey: 'sharedNotifications' },
        { key: 'account', labelKey: 'settingsUser' },
        { key: 'users', labelKey: 'settingsUsers' },
        { key: 'maintenance', labelKey: 'sharedMaintenance' },
        { key: 'computedAttributes', labelKey: 'sharedComputedAttributes' },
        { key: 'savedCommands', labelKey: 'sharedSavedCommands' },
        { key: 'announcement', labelKey: 'serverAnnouncement' },
        { key: 'dataAnalytics', labelKey: 'rolesPermissionScreenDataAnalytics' },
        { key: 'resellers', labelKey: 'rolesPermissionScreenResellers' },
    ];

    const permissionActions = [
        { key: 'view', labelKey: 'rolesPermissionView' },
        { key: 'edit', labelKey: 'rolesPermissionEdit' },
        { key: 'delete', labelKey: 'rolesPermissionDelete' },
    ];

    const defaultPermissions = permissionScreens.reduce((acc, screen) => {
        acc[screen.key] = { view: false, edit: false, delete: false };
        return acc;
    }, {});

    // Fetch roles
    const { data: rolesResponse, isLoading } = useQuery({
        queryKey: ['roles'],
        queryFn: async () => {
            const response = await fetchOrThrow('/api/roles');
            return response.json();
        },
        enabled: isVisible,
    });

    const roles = rolesResponse?.roles || [];

    const createRoleMutation = useMutation({
        mutationFn: async (roleData) => {
            const response = await fetchOrThrow('/api/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(roleData),
            });
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            setEditDialog(false);
        },
    });

    const updateRoleMutation = useMutation({
        mutationFn: async (roleData) => {
            const response = await fetchOrThrow(`/api/roles/${roleData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(roleData),
            });
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            setEditDialog(false);
        },
    });

    const deleteRoleMutation = useMutation({
        mutationFn: async (roleId) => {
            const response = await fetchOrThrow(`/api/roles/${roleId}`, {
                method: 'DELETE',
            });
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            setDeleteDialog(false);
        },
    });

    const handleAddRole = () => {
        setEditingRole({
            name: '',
            permissions: { ...defaultPermissions }
        });
        setEditDialog(true);
    };

    const handleEditRole = (role) => {
        setEditingRole({
            ...role,
            permissions: { ...defaultPermissions, ...role.permissions }
        });
        setEditDialog(true);
    };

    const handleSaveRole = () => {
        if (editingRole.id) {
            updateRoleMutation.mutate(editingRole);
        } else {
            createRoleMutation.mutate(editingRole);
        }
    };

    const handleTogglePermission = (screen, action) => {
        setEditingRole(prev => {
            const newPermissions = { ...prev.permissions };
            newPermissions[screen] = {
                ...newPermissions[screen],
                [action]: !newPermissions[screen][action]
            };
            return { ...prev, permissions: newPermissions };
        });
    };

    const filteredRoles = roles.filter(role =>
        role.name.toLowerCase().includes(searchKeyword.toLowerCase())
    );

    return (
        <AnimatePresence mode="wait">
            {isVisible && (
                <motion.div
                    key="floating-roles-popover"
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
                        zIndex: 10000,
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
                                <IconButton onClick={onClose} size="small" style={{ color: colors.textSecondary }}>
                                    <ChevronLeftIcon fontSize="small" />
                                </IconButton>
                                <Typography variant="h6" style={{ color: colors.text, fontWeight: '600' }}>
                                    {t('rolesRolesAndPermissions')}
                                </Typography>
                            </div>
                            <IconButton
                                onClick={handleAddRole}
                                style={{ backgroundColor: colors.primary, color: colors.text }}
                                size="small"
                            >
                                <AddIcon />
                            </IconButton>
                        </div>

                        {/* Search */}
                        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${colors.border}` }}>
                            <TextField
                                placeholder={t('rolesSearchPlaceholder')}
                                fullWidth
                                size="small"
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" style={{ color: colors.textSecondary }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </div>

                        {/* Roles Table */}
                        <TableContainer style={{ flex: 1 }}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell style={{ backgroundColor: colors.surface }}>{t('sharedName')}</TableCell>
                                        <TableCell style={{ backgroundColor: colors.surface }}>{t('rolesCreatedAt')}</TableCell>
                                        <TableCell align="right" style={{ backgroundColor: colors.surface }}>{t('rolesActions')}</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={3} align="center">
                                                <CircularProgress size={24} />
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredRoles.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} align="center">{t('rolesNoRolesFound')}</TableCell>
                                        </TableRow>
                                    ) : filteredRoles.map((role) => (
                                        <TableRow key={role.id}>
                                            <TableCell>{role.name}</TableCell>
                                            <TableCell>{new Date(role.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell align="right">
                                                <IconButton onClick={() => handleEditRole(role)} size="small" style={{ color: colors.primary }}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton onClick={() => { setRoleToDelete(role); setDeleteDialog(true); }} size="small" style={{ color: colors.error }}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </div>

                    {/* Edit Role Modal (SmartLink Style) */}
                    <AnimatePresence>
                        {editDialog && (
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
                                    zIndex: 12000
                                }}
                                onClick={() => setEditDialog(false)}
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
                                        width: desktop ? '85vw' : '98vw',
                                        height: '80vh',
                                        maxWidth: '900px',
                                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        overflow: 'hidden'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                        <IconButton onClick={() => setEditDialog(false)} size="small" style={{ color: colors.text }}>
                                            <ChevronLeftIcon />
                                        </IconButton>
                                        <Typography variant="h6" style={{ color: colors.text, fontWeight: '600' }}>
                                            {editingRole?.id ? t('rolesEditRole') : t('rolesCreateNewRole')}
                                        </Typography>
                                    </div>

                                    <div style={{ flex: 1, overflow: 'auto', paddingRight: '10px' }}>
                                        <TextField
                                            label={t('rolesRoleName')}
                                            fullWidth
                                            value={editingRole?.name || ''}
                                            onChange={(e) => setEditingRole(prev => ({ ...prev, name: e.target.value }))}
                                            sx={{ mb: 4, mt: 1 }}
                                        />

                                        <Typography variant="subtitle1" gutterBottom fontWeight="600" style={{ color: colors.text }}>
                                            {t('rolesPermissionsMatrix')}
                                        </Typography>

                                        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow sx={{ backgroundColor: colors.secondary + '40' }}>
                                                        <TableCell style={{ fontWeight: '600' }}>{t('rolesScreenActionColumn')}</TableCell>
                                                        {permissionActions.map(action => (
                                                            <TableCell key={action.key} align="center" style={{ fontWeight: '600' }}>{t(action.labelKey)}</TableCell>
                                                        ))}
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {permissionScreens.map(screen => (
                                                        <TableRow key={screen.key}>
                                                            <TableCell sx={{ fontWeight: '500' }}>{t(screen.labelKey)}</TableCell>
                                                            {permissionActions.map(action => (
                                                                <TableCell key={action.key} align="center">
                                                                    <Checkbox
                                                                        size="small"
                                                                        icon={<CheckBoxOutlineBlankIcon sx={{ color: colors.textSecondary, opacity: 0.8 }} />}
                                                                        checkedIcon={<CheckBoxIcon sx={{ color: colors.primary }} />}
                                                                        checked={editingRole?.permissions?.[screen.key]?.[action.key] || false}
                                                                        onChange={() => handleTogglePermission(screen.key, action.key)}
                                                                        sx={{
                                                                            '&:hover': {
                                                                                backgroundColor: `${colors.primary}15`,
                                                                            },
                                                                            padding: '4px'
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                                        <button
                                            onClick={() => setEditDialog(false)}
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
                                        >
                                            {t('sharedCancel')}
                                        </button>
                                        <button
                                            onClick={handleSaveRole}
                                            disabled={!editingRole?.name || createRoleMutation.isPending || updateRoleMutation.isPending}
                                            style={{
                                                padding: '8px 24px',
                                                border: 'none',
                                                borderRadius: '6px',
                                                backgroundColor: colors.primary,
                                                color: '#fff',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                cursor: (!editingRole?.name || createRoleMutation.isPending || updateRoleMutation.isPending) ? 'not-allowed' : 'pointer',
                                                opacity: (!editingRole?.name || createRoleMutation.isPending || updateRoleMutation.isPending) ? 0.6 : 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {(createRoleMutation.isPending || updateRoleMutation.isPending) ? (
                                                <CircularProgress size={16} color="inherit" />
                                            ) : (
                                                <SaveIcon fontSize="small" />
                                            )}
                                            {t('rolesSaveRole')}
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Delete Confirmation Modal (Logout Style) */}
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
                                    zIndex: 12000
                                }}
                                onClick={() => setDeleteDialog(false)}
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
                                        lineHeight: '1.5',
                                    }}
                                    >
                                        {t('rolesDeleteConfirm', { name: roleToDelete?.name || '' })}
                                    </p>
                                    <div style={{
                                        display: 'flex',
                                        gap: '12px',
                                        justifyContent: 'space-between'
                                    }}>
                                        <button
                                            onClick={() => setDeleteDialog(false)}
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
                                        >
                                            {t('sharedCancel')}
                                        </button>
                                        <button
                                            onClick={() => deleteRoleMutation.mutate(roleToDelete.id)}
                                            disabled={deleteRoleMutation.isPending}
                                            style={{
                                                padding: '8px 16px',
                                                border: '1px solid #FECACA',
                                                borderRadius: '6px',
                                                backgroundColor: '#FEF2F2',
                                                color: '#DC2626',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                cursor: deleteRoleMutation.isPending ? 'not-allowed' : 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            {deleteRoleMutation.isPending && <CircularProgress size={14} color="inherit" />}
                                            {t('rolesDeleteRole')}
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

export default FloatingRolesPopover;
