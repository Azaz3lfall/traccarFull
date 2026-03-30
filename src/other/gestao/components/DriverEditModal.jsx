import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  InputAdornment,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Edit as EditIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import { formatCPF, formatCNH, formatPhone } from '../utils/formatters';
import { validateCPF, validateCNH, removeFormatting } from '../utils/validators';
import { CNH_CATEGORIES } from '../constants';
import { useThemeColors } from '../../../common/components/ThemeProvider';
import { useDraggable } from '../hooks/useDraggable';

const DriverEditModal = ({
  open,
  onClose,
  onSubmit,
  driver,
  loading = false,
  onSyncFromTraccar
}) => {
  const colors = useThemeColors();
  const { elementRef, dragHandleProps, draggableStyle, resetPosition } = useDraggable(true);
  
  // Resetar posição quando o modal é fechado
  useEffect(() => {
    if (!open) {
      resetPosition();
    }
  }, [open, resetPosition]);
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    cnh_number: '',
    cnh_category: '',
    cnh_validity: '',
    phone: '',
    username: ''
  });

  const [errors, setErrors] = useState({});
  const [cpfValidation, setCpfValidation] = useState({ valid: true, error: '' });
  const [cnhValidation, setCnhValidation] = useState({ valid: true, error: '' });
  const [submitError, setSubmitError] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Carregar dados do motorista quando o modal abrir
  useEffect(() => {
    if (open && driver) {
      setFormData({
        name: driver.name || '',
        cpf: driver.cpf || '',
        cnh_number: driver.cnh_number || '',
        cnh_category: driver.cnh_category || '',
        cnh_validity: driver.cnh_validity || '',
        phone: driver.phone || '',
        username: driver.username || ''
      });
      setErrors({});
      setSubmitError(null);
      setCpfValidation({ valid: true, error: '' });
      setCnhValidation({ valid: true, error: '' });
    }
  }, [open, driver]);

  // Validar CPF em tempo real
  useEffect(() => {
    if (formData.cpf) {
      const validation = validateCPF(formData.cpf);
      setCpfValidation(validation);
      if (!validation.valid) {
        setErrors(prev => ({ ...prev, cpf: validation.error }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.cpf;
          return newErrors;
        });
      }
    } else {
      setCpfValidation({ valid: true, error: '' });
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.cpf;
        return newErrors;
      });
    }
  }, [formData.cpf]);

  // Validar CNH em tempo real
  useEffect(() => {
    if (formData.cnh_number) {
      const validation = validateCNH(formData.cnh_number);
      setCnhValidation(validation);
      if (!validation.valid) {
        setErrors(prev => ({ ...prev, cnh_number: validation.error }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.cnh_number;
          return newErrors;
        });
      }
    } else {
      setCnhValidation({ valid: true, error: '' });
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.cnh_number;
        return newErrors;
      });
    }
  }, [formData.cnh_number]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    
    // Aplicar formatação automática
    let formattedValue = value;
    if (field === 'cpf') {
      formattedValue = formatCPF(value);
    } else if (field === 'cnh_number') {
      formattedValue = formatCNH(value);
    } else if (field === 'phone') {
      formattedValue = formatPhone(value);
    }

    setFormData(prev => ({ ...prev, [field]: formattedValue }));
  };

  const handleSyncFromTraccar = async () => {
    if (!onSyncFromTraccar) return;
    
    setSyncing(true);
    setSubmitError(null);
    
    try {
      await onSyncFromTraccar(driver.id);
      // Recarregar dados após sincronização
      if (driver) {
        // O componente pai deve recarregar os dados
        onClose();
      }
    } catch (error) {
      console.error('Erro ao sincronizar do Traccar:', error);
      let errorMessage = 'Erro ao sincronizar dados do Traccar.';
      if (error.message) {
        try {
          const parsedError = JSON.parse(error.message);
          errorMessage = parsedError.message || parsedError.error || error.message;
        } catch {
          errorMessage = error.message;
        }
      }
      setSubmitError(errorMessage);
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validações finais
    const newErrors = {};

    if (!formData.name || formData.name.trim().length < 3) {
      newErrors.name = 'Nome é obrigatório e deve ter no mínimo 3 caracteres';
    }

    if (formData.cpf && !cpfValidation.valid) {
      newErrors.cpf = cpfValidation.error;
    }

    if (formData.cnh_number && !cnhValidation.valid) {
      newErrors.cnh_number = cnhValidation.error;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Preparar dados para envio (remover formatação de CPF e CNH)
    const submitData = {
      name: formData.name.trim(),
      cpf: formData.cpf ? removeFormatting(formData.cpf) : null,
      cnh_number: formData.cnh_number ? removeFormatting(formData.cnh_number) : null,
      cnh_category: formData.cnh_category || null,
      cnh_validity: formData.cnh_validity || null,
      phone: formData.phone ? removeFormatting(formData.phone) : null,
      username: formData.username.trim() || null
    };

    // Limpar erro anterior
    setSubmitError(null);
    
    // Chamar onSubmit de forma assíncrona para tratar erros
    Promise.resolve(onSubmit(submitData)).catch((error) => {
      console.error('Erro ao atualizar motorista:', error);
      let errorMessage = 'Erro ao atualizar motorista. Tente novamente.';
      if (error.message) {
        try {
          const parsedError = JSON.parse(error.message);
          errorMessage = parsedError.message || parsedError.error || error.message;
        } catch {
          errorMessage = error.message;
        }
      }
      setSubmitError(errorMessage);
    });
  };

  const handleCloseModal = () => {
    // Resetar formulário ao fechar
    setFormData({
      name: '',
      cpf: '',
      cnh_number: '',
      cnh_category: '',
      cnh_validity: '',
      phone: '',
      username: ''
    });
    setErrors({});
    setCpfValidation({ valid: true, error: '' });
    setCnhValidation({ valid: true, error: '' });
    setSubmitError(null);
    onClose();
  };

  const hasTraccarData = driver && driver.id && !driver.cpf && !driver.cnh_number;

  return (
      <Dialog 
        open={open} 
        onClose={handleCloseModal} 
        maxWidth="md" 
        fullWidth
        sx={{ zIndex: 11000 }} // Forçar acima do FloatingGestaoPopover (10002)
        PaperProps={{
          sx: {
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
          },
          ref: elementRef,
        }}
      >
      <form onSubmit={handleSubmit}>
        <DialogTitle 
          {...dragHandleProps}
          sx={{
            userSelect: 'none',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon color="primary" />
            <Typography variant="h6">Editar Motorista - {driver?.name || ''}</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ 
          padding: '24px',
          backgroundColor: colors.surface,
          flex: '1 1 auto',
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: colors.background,
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: colors.border,
            borderRadius: '4px',
            '&:hover': {
              background: colors.textSecondary,
            },
          },
        }}>
          {/* Alerta para motoristas do Traccar sem dados completos */}
          {hasTraccarData && (
            <Alert 
              severity="info" 
              sx={{ mb: 2 }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={handleSyncFromTraccar}
                  disabled={syncing}
                  startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
                >
                  {syncing ? 'Sincronizando...' : 'Sincronizar do Traccar'}
                </Button>
              }
            >
              <Typography variant="body2">
                Este motorista foi criado no Traccar e não possui dados completos no sistema de gestão. 
                Clique em "Sincronizar do Traccar" para buscar o nome e ID, depois complete os dados abaixo.
              </Typography>
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Nome */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Nome Completo"
                value={formData.name}
                onChange={handleChange('name')}
                required
                error={!!errors.name}
                helperText={errors.name}
                autoFocus
              />
            </Grid>

            {/* CPF */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="CPF"
                value={formData.cpf}
                onChange={handleChange('cpf')}
                error={!!errors.cpf || !cpfValidation.valid}
                helperText={errors.cpf || (cpfValidation.error || '')}
                inputProps={{ maxLength: 14 }}
              />
            </Grid>

            {/* CNH Número */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Número da CNH"
                value={formData.cnh_number}
                onChange={handleChange('cnh_number')}
                error={!!errors.cnh_number || !cnhValidation.valid}
                helperText={errors.cnh_number || (cnhValidation.error || '')}
                inputProps={{ maxLength: 14 }}
              />
            </Grid>

            {/* CNH Categoria */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth error={!!errors.cnh_category}>
                <InputLabel id="cnh-category-edit-label">Categoria CNH</InputLabel>
                <Select
                  labelId="cnh-category-edit-label"
                  value={formData.cnh_category || ''}
                  onChange={handleChange('cnh_category')}
                  label="Categoria CNH"
                  MenuProps={{
                    disablePortal: false,
                    style: { 
                      zIndex: 1000000 
                    },
                    PaperProps: {
                      style: {
                        zIndex: 1000000,
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        maxHeight: 300,
                      },
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: colors.border,
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: colors.primary,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: colors.primary,
                      borderWidth: '2px',
                    },
                    '& .MuiSelect-select': {
                      color: colors.text,
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>Nenhuma</em>
                  </MenuItem>
                  {CNH_CATEGORIES.map((category) => (
                    <MenuItem 
                      key={category} 
                      value={category}
                      sx={{
                        color: colors.text,
                        '&:hover': {
                          backgroundColor: colors.primary + '15',
                        },
                        '&.Mui-selected': {
                          backgroundColor: colors.primary + '25',
                          color: colors.primary,
                          '&:hover': {
                            backgroundColor: colors.primary + '35',
                          },
                        },
                      }}
                    >
                      {category}
                    </MenuItem>
                  ))}
                </Select>
                {errors.cnh_category && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                    {errors.cnh_category}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* CNH Validade */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Validade da CNH"
                type="date"
                value={formData.cnh_validity}
                onChange={handleChange('cnh_validity')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Telefone */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Telefone"
                value={formData.phone}
                onChange={handleChange('phone')}
                error={!!errors.phone}
                helperText={errors.phone}
                inputProps={{ maxLength: 15 }}
              />
            </Grid>

            {/* Username */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Username"
                value={formData.username}
                onChange={handleChange('username')}
                error={!!errors.username}
                helperText={errors.username || 'Username para login no sistema de gestão'}
              />
            </Grid>

            {/* Mensagem de erro */}
            {submitError && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="error" onClose={() => setSubmitError(null)}>
                  {submitError}
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} disabled={loading || syncing}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || syncing}
            startIcon={loading ? <CircularProgress size={20} /> : <EditIcon />}
          >
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default DriverEditModal;

