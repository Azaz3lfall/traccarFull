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
  CircularProgress
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import { formatCPF, formatCNH, formatPhone, formatNameForUsername } from '../utils/formatters';
import { validateCPF, validateCNH, removeFormatting } from '../utils/validators';
import { CNH_CATEGORIES } from '../constants';
import { useThemeColors } from '../../../common/components/ThemeProvider';
import { useDraggable } from '../hooks/useDraggable';

const DriverCreateModal = ({
  open,
  onClose,
  onSubmit,
  loading = false
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
    username: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [cpfValidation, setCpfValidation] = useState({ valid: true, error: '' });
  const [cnhValidation, setCnhValidation] = useState({ valid: true, error: '' });
  const [submitError, setSubmitError] = useState(null);

  // Gerar username automaticamente quando o nome mudar
  useEffect(() => {
    if (formData.name && !formData.username) {
      const generatedUsername = formatNameForUsername(formData.name);
      setFormData(prev => ({ ...prev, username: generatedUsername }));
    }
  }, [formData.name]);

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

  // Validar senha
  useEffect(() => {
    if (formData.password && formData.password.length < 6) {
      setErrors(prev => ({ ...prev, password: 'A senha deve ter no mínimo 6 caracteres' }));
    } else if (formData.password) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.password;
        return newErrors;
      });
    }

    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: 'As senhas não coincidem' }));
    } else if (formData.confirmPassword) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.confirmPassword;
        return newErrors;
      });
    }
  }, [formData.password, formData.confirmPassword]);

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

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validações finais
    const newErrors = {};

    if (!formData.name || formData.name.trim().length < 3) {
      newErrors.name = 'Nome é obrigatório e deve ter no mínimo 3 caracteres';
    }

    if (!formData.cpf) {
      newErrors.cpf = 'CPF é obrigatório';
    } else if (!cpfValidation.valid) {
      newErrors.cpf = cpfValidation.error;
    }

    if (!formData.cnh_number) {
      newErrors.cnh_number = 'CNH é obrigatória';
    } else if (!cnhValidation.valid) {
      newErrors.cnh_number = cnhValidation.error;
    }

    if (!formData.cnh_category) {
      newErrors.cnh_category = 'Categoria da CNH é obrigatória';
    }

    if (!formData.username || formData.username.trim().length < 3) {
      newErrors.username = 'Username é obrigatório e deve ter no mínimo 3 caracteres';
    }

    if (!formData.password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'A senha deve ter no mínimo 6 caracteres';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

      // Preparar dados para envio (remover formatação de CPF e CNH)
      const submitData = {
        name: formData.name.trim(),
        cpf: removeFormatting(formData.cpf),
        cnh_number: removeFormatting(formData.cnh_number),
        cnh_category: formData.cnh_category,
        cnh_validity: formData.cnh_validity || null,
        phone: removeFormatting(formData.phone) || null,
        username: formData.username.trim(),
        password: formData.password
      };

      // Limpar erro anterior
      setSubmitError(null);
      
      // Chamar onSubmit de forma assíncrona para tratar erros
      Promise.resolve(onSubmit(submitData)).catch((error) => {
        console.error('Erro ao criar motorista:', error);
        let errorMessage = 'Erro ao criar motorista. Tente novamente.';
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
      username: '',
      password: '',
      confirmPassword: ''
    });
    setErrors({});
    setCpfValidation({ valid: true, error: '' });
    setCnhValidation({ valid: true, error: '' });
    setSubmitError(null);
    onClose();
  };

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
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5,
            padding: '24px 24px 20px 24px',
            overflow: 'visible',
            textOverflow: 'unset',
            whiteSpace: 'normal',
            backgroundColor: colors.surface,
            borderBottom: `1px solid ${colors.border}`,
            userSelect: 'none',
          }}
        >
          <PersonAddIcon sx={{ color: colors.primary, fontSize: 28 }} />
          <Typography variant="h6" sx={{ 
            overflow: 'visible',
            textOverflow: 'unset',
            whiteSpace: 'normal',
            wordBreak: 'normal',
            color: colors.text,
            fontWeight: 600,
            fontSize: '1.25rem'
          }}>
            Cadastrar Novo Motorista
          </Typography>
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
          <Grid container spacing={3} sx={{ mt: 0 }}>
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
                required
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
                required
                error={!!errors.cnh_number || !cnhValidation.valid}
                helperText={errors.cnh_number || (cnhValidation.error || '')}
                inputProps={{ maxLength: 14 }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: colors.background,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: colors.primary,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: colors.primary,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: colors.textSecondary,
                    '&.Mui-focused': {
                      color: colors.primary,
                    },
                  },
                }}
              />
            </Grid>

            {/* CNH Categoria */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth required error={!!errors.cnh_category}>
                <InputLabel 
                  sx={{ 
                    color: colors.textSecondary,
                    '&.Mui-focused': {
                      color: colors.primary,
                    },
                  }}
                >
                  Categoria CNH
                </InputLabel>
                <Select
                  value={formData.cnh_category}
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
                    anchorOrigin: {
                      vertical: 'bottom',
                      horizontal: 'left',
                    },
                    transformOrigin: {
                      vertical: 'top',
                      horizontal: 'left',
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
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: colors.background,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: colors.primary,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: colors.primary,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: colors.textSecondary,
                    '&.Mui-focused': {
                      color: colors.primary,
                    },
                  },
                }}
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
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: colors.background,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: colors.primary,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: colors.primary,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: colors.textSecondary,
                    '&.Mui-focused': {
                      color: colors.primary,
                    },
                  },
                }}
              />
            </Grid>

            {/* Username */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Username"
                value={formData.username}
                onChange={handleChange('username')}
                required
                error={!!errors.username}
                helperText={errors.username || 'Gerado automaticamente do nome (editável)'}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: colors.background,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: colors.primary,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: colors.primary,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: colors.textSecondary,
                    '&.Mui-focused': {
                      color: colors.primary,
                    },
                  },
                }}
              />
            </Grid>

            {/* Senha */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange('password')}
                required
                error={!!errors.password}
                helperText={errors.password || 'Mínimo 6 caracteres'}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: colors.textSecondary }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: colors.background,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: colors.primary,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: colors.primary,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: colors.textSecondary,
                    '&.Mui-focused': {
                      color: colors.primary,
                    },
                  },
                }}
              />
            </Grid>

            {/* Confirmar Senha */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Confirmar Senha"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                required
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        sx={{ color: colors.textSecondary }}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: colors.background,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: colors.primary,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: colors.primary,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: colors.textSecondary,
                    '&.Mui-focused': {
                      color: colors.primary,
                    },
                  },
                }}
              />
            </Grid>

            {/* Informação sobre sincronização automática */}
            <Grid size={{ xs: 12 }}>
              <Alert severity="info" sx={{ backgroundColor: colors.background, border: `1px solid ${colors.border}` }}>
                <Typography variant="body2" sx={{ color: colors.text }}>
                  <strong>Sincronização automática:</strong> O motorista será automaticamente criado no Traccar primeiro. 
                  Se houver algum problema com o Traccar, o cadastro será salvo no sistema de gestão e poderá ser sincronizado depois.
                </Typography>
              </Alert>
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
        <DialogActions sx={{ 
          padding: '20px 24px',
          backgroundColor: colors.surface,
          borderTop: `1px solid ${colors.border}`,
          gap: 2,
        }}>
          <Button 
            onClick={handleCloseModal} 
            disabled={loading}
            sx={{
              color: colors.textSecondary,
              '&:hover': {
                backgroundColor: colors.background,
              },
            }}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <PersonAddIcon />}
            sx={{
              backgroundColor: colors.primary,
              color: '#fff',
              fontWeight: 600,
              padding: '10px 24px',
              borderRadius: '8px',
              textTransform: 'none',
              boxShadow: `0 4px 12px ${colors.primary}40`,
              '&:hover': {
                backgroundColor: colors.primary,
                boxShadow: `0 6px 16px ${colors.primary}60`,
                transform: 'translateY(-1px)',
              },
              '&:disabled': {
                backgroundColor: colors.primary + '80',
              },
            }}
          >
            {loading ? 'Cadastrando...' : 'Cadastrar Motorista'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default DriverCreateModal;

