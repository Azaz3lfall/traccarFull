import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputLabel,
  Radio,
  RadioGroup,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Box,
  Typography,
  Autocomplete,
} from '@mui/material';
import { PersonAdd as PersonAddIcon, Person as PersonIcon } from '@mui/icons-material';
import { fetchClients, addClient, updateClient, clientsActions, fetchTraccarUsers } from '../store';
import { useThemeColors } from '../common/components/ThemeProvider';
import UserManagementPopover from './UserManagementPopover';

const safeColor = (color, fallback) => {
  if (!color) return fallback;
  if (typeof color === 'string') return color;
  if (typeof color === 'object') return color.main || color.primary || color.dark || color.light || fallback;
  return fallback;
};

/**
 * ClientFormModal - Reusable form for creating/editing clients.
 * When "Criar novo usuário Traccar" is selected, opens UserManagementPopover in createOnly mode.
 *
 * @param {Object} props
 * @param {boolean} props.open - Dialog visibility
 * @param {Function} props.onClose - Close handler
 * @param {number|null} [props.clientId] - null = create, id = edit
 * @param {Function} [props.onSuccess] - Called after successful save with (client)
 * @param {boolean} [props.compact] - If true, show fewer fields (compact mode)
 */
const ClientFormModal = ({ open, onClose, clientId = null, onSuccess, compact = false }) => {
  const dispatch = useDispatch();
  const colorsRaw = useThemeColors();
  const { items: clients = [], status, error } = useSelector((state) => state.clients);
  const { items: traccarUsers = [] } = useSelector((state) => state.users || {});

  const [formData, setFormData] = useState({
    name: '',
    type: 'PJ',
    tax_id: '',
    contact_phone: '',
    email: '',
    address: '',
    cep: '',
    traccar_user_id: null,
    traccarMode: 'existing',
    active: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [showUserCreatePopover, setShowUserCreatePopover] = useState(false);

  const isEdit = !!clientId;
  const existingClient = isEdit ? clients.find((c) => c.id === clientId) : null;

  useEffect(() => {
    if (open) {
      dispatch(fetchTraccarUsers());
    }
  }, [open, dispatch]);

  useEffect(() => {
    if (open && existingClient) {
      setFormData({
        name: existingClient.name || '',
        type: existingClient.type || 'PJ',
        tax_id: existingClient.tax_id || '',
        contact_phone: existingClient.contact_phone || '',
        email: existingClient.email || '',
        address: existingClient.address || '',
        cep: existingClient.cep || '',
        traccar_user_id: existingClient.traccar_user_id || null,
        traccarMode: existingClient.traccar_user_id ? 'existing' : 'none',
        active: existingClient.active !== false,
      });
    } else if (open && !isEdit) {
      setFormData({
        name: '',
        type: 'PJ',
        tax_id: '',
        contact_phone: '',
        email: '',
        address: '',
        cep: '',
        traccar_user_id: null,
        traccarMode: 'existing',
        active: true,
      });
    }
  }, [open, isEdit, existingClient]);

  useEffect(() => {
    if (!open) {
      setFormErrors({});
      setShowUserCreatePopover(false);
      if (error) dispatch(clientsActions.clearError());
    }
  }, [open, error, dispatch]);

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Nome é obrigatório';
    if (!formData.type) errors.type = 'Tipo é obrigatório';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUserCreated = (user) => {
    handleFormChange('traccar_user_id', user.id);
    handleFormChange('traccarMode', 'existing');
    setShowUserCreatePopover(false);
    dispatch(fetchTraccarUsers());
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const clientData = {
        name: formData.name.trim(),
        type: formData.type,
        tax_id: formData.tax_id.trim() || null,
        contact_phone: formData.contact_phone.trim() || null,
        email: formData.email?.trim() || null,
        address: compact ? null : (formData.address?.trim() || null),
        cep: compact ? null : (formData.cep?.trim() || null),
        traccar_user_id: formData.traccar_user_id || null,
        active: formData.active,
      };

      const action = isEdit ? updateClient({ id: clientId, clientData }) : addClient(clientData);
      const result = await dispatch(action);

      if (addClient.fulfilled.match(result) || updateClient.fulfilled.match(result)) {
        await dispatch(fetchClients());
        dispatch(fetchTraccarUsers());
        onSuccess?.(result.payload);
        onClose?.();
      }
    } catch (err) {
      dispatch(clientsActions.setError(err?.message || 'Erro ao salvar cliente'));
      console.error('Erro ao salvar cliente:', err);
    }
  };

  const isSaveDisabled = !formData.name.trim() || !formData.type || status === 'loading';

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus={showUserCreatePopover}
        sx={{ zIndex: 20002 }}
        PaperProps={{
          sx: {
            backgroundColor: safeColor(colorsRaw?.surface, '#fff'),
            border: `1px solid ${safeColor(colorsRaw?.border, '#E5E7EB')}`,
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            padding: '24px 24px 20px 24px',
            backgroundColor: safeColor(colorsRaw?.surface, '#fff'),
            borderBottom: `1px solid ${safeColor(colorsRaw?.border, '#E5E7EB')}`,
            color: safeColor(colorsRaw?.text, '#000'),
            fontWeight: 600,
          }}
        >
          <PersonAddIcon sx={{ color: safeColor(colorsRaw?.primary, '#3B82F6'), fontSize: 28 }} />
          {isEdit ? 'Editar Cliente' : 'Novo Cliente'}
        </DialogTitle>
        <DialogContent sx={{ padding: '24px', backgroundColor: safeColor(colorsRaw?.surface, '#fff') }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Nome"
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              fullWidth
              required
              error={!!formErrors.name}
              helperText={formErrors.name}
              autoFocus
            />

            <FormControl fullWidth required error={!!formErrors.type}>
              <InputLabel id="client-type-label" shrink={!!formData.type}>
                Tipo
              </InputLabel>
              <Select
                labelId="client-type-label"
                value={formData.type}
                onChange={(e) => handleFormChange('type', e.target.value)}
                label="Tipo"
                MenuProps={{ style: { zIndex: 20003 } }}
              >
                <MenuItem value="PF">Pessoa Física (PF)</MenuItem>
                <MenuItem value="PJ">Pessoa Jurídica (PJ)</MenuItem>
              </Select>
              {formErrors.type && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                  {formErrors.type}
                </Typography>
              )}
            </FormControl>

            <TextField
              label="CPF/CNPJ"
              value={formData.tax_id}
              onChange={(e) => handleFormChange('tax_id', e.target.value)}
              fullWidth
              placeholder={formData.type === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
            />

            <TextField
              label="Telefone"
              value={formData.contact_phone}
              onChange={(e) => handleFormChange('contact_phone', e.target.value)}
              fullWidth
              placeholder="(00) 00000-0000"
            />

            <TextField
              label="Email"
              value={formData.email}
              onChange={(e) => handleFormChange('email', e.target.value)}
              fullWidth
              type="email"
              placeholder="exemplo@email.com"
            />

            {!compact && (
              <>
                <TextField
                  label="Endereço"
                  value={formData.address}
                  onChange={(e) => handleFormChange('address', e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Rua, número, bairro, cidade..."
                />

                <TextField
                  label="CEP"
                  value={formData.cep}
                  onChange={(e) => handleFormChange('cep', e.target.value)}
                  fullWidth
                  placeholder="00000-000"
                />
              </>
            )}

            <FormControl component="fieldset" fullWidth sx={{ mt: 1 }}>
              <FormLabel component="legend" sx={{ color: safeColor(colorsRaw?.textSecondary, '#9CA3AF'), mb: 1 }}>
                Usuário de Login (Traccar)
              </FormLabel>
              <RadioGroup
                row
                value={formData.traccarMode}
                onChange={(e) => handleFormChange('traccarMode', e.target.value)}
                sx={{ color: safeColor(colorsRaw?.text, '#111827') }}
              >
                <FormControlLabel value="existing" control={<Radio />} label="Vincular usuário existente" />
                <FormControlLabel value="create" control={<Radio />} label="Criar novo usuário Traccar" />
              </RadioGroup>
              {formData.traccarMode === 'existing' ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                  <Autocomplete
                    options={traccarUsers}
                    getOptionLabel={(option) => option.name || option.email || `ID: ${option.id}`}
                    value={traccarUsers.find((u) => u.id === formData.traccar_user_id) || null}
                    onChange={(event, newValue) => {
                      handleFormChange('traccar_user_id', newValue ? newValue.id : null);
                    }}
                    slotProps={{
                      popper: { style: { zIndex: 20003 } },
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Selecione um usuário"
                        placeholder="Selecione um usuário do Traccar"
                        helperText="Opcional: Vincule este cliente a um usuário de login do Traccar"
                      />
                    )}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    noOptionsText="Nenhum usuário encontrado"
                  />
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                  {formData.traccar_user_id ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                      <PersonIcon sx={{ color: 'primary.main' }} />
                      <Typography variant="body2">
                        {traccarUsers.find((u) => u.id === formData.traccar_user_id)?.name || traccarUsers.find((u) => u.id === formData.traccar_user_id)?.email || `ID: ${formData.traccar_user_id}`} vinculado
                      </Typography>
                      <Button size="small" onClick={() => handleFormChange('traccar_user_id', null)}>
                        Remover
                      </Button>
                    </Box>
                  ) : (
                    <Button
                      variant="outlined"
                      onClick={() => setShowUserCreatePopover(true)}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      Abrir formulário de criar usuário
                    </Button>
                  )}
                </Box>
              )}
            </FormControl>

            {error && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            padding: '16px 24px',
            backgroundColor: safeColor(colorsRaw?.surface, '#fff'),
            borderTop: `1px solid ${safeColor(colorsRaw?.border, '#E5E7EB')}`,
          }}
        >
          <Button onClick={onClose} disabled={status === 'loading'} sx={{ color: safeColor(colorsRaw?.textSecondary, '#9CA3AF') }}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={isSaveDisabled}
            startIcon={status === 'loading' ? <CircularProgress size={20} /> : null}
            sx={{
              backgroundColor: safeColor(colorsRaw?.primary, '#3B82F6'),
              '&:hover': { backgroundColor: safeColor(colorsRaw?.primaryDark, '#2563EB') },
            }}
          >
            {status === 'loading' ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* UserManagementPopover in createOnly mode - render via Portal to ensure it appears above the Dialog */}
      {showUserCreatePopover && createPortal(
        <UserManagementPopover
          desktop={true}
          isMenuExpanded={false}
          isVisible={true}
          onClose={() => setShowUserCreatePopover(false)}
          mode="createOnly"
          onUserCreated={handleUserCreated}
          closeOnCreate={true}
        />,
        document.body
      )}
    </>
  );
};

export default ClientFormModal;
