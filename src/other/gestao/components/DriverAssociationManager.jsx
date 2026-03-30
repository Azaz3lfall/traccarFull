import React, { useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  Alert,
  TextField,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Sync as SyncIcon,
  AutoMode as AutoModeIcon,
  TouchApp as TouchAppIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { updateDriverAssociationType, syncSingleDriver } from '../utils/apiUtils';
import { formatDate } from '../utils/formatters';

const DriverAssociationManager = ({ driver, onUpdate }) => {
  const [associationType, setAssociationType] = useState(driver.association_type || 'manual');
  const [traccarUserId, setTraccarUserId] = useState(driver.traccar_user_id || '');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleAssociationTypeChange = async (newType) => {
    if (newType === 'auto' && !traccarUserId) {
      setError('É necessário informar o ID do usuário Traccar para associação automática');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await updateDriverAssociationType(
        driver.id,
        newType,
        newType === 'auto' ? traccarUserId : null
      );
      
      setAssociationType(newType);
      setMessage(`Tipo de associação alterado para ${newType === 'auto' ? 'automática' : 'manual'} com sucesso!`);
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error('Erro ao alterar tipo de associação:', err);
      setError('Erro ao alterar tipo de associação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setError(null);
    setMessage(null);

    try {
      const result = await syncSingleDriver(driver.id);
      setMessage(
        `Sincronização concluída! ${result.created_associations || 0} associações criadas, ${result.removed_associations || 0} removidas.`
      );
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
      setError('Erro ao sincronizar motorista. Tente novamente.');
    } finally {
      setSyncing(false);
    }
  };

  const isAutoSync = associationType === 'auto';

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Configuração de Associação de Veículos
      </Typography>

      {/* Tipo de Associação */}
      <FormControl fullWidth margin="normal">
        <InputLabel>Tipo de Associação</InputLabel>
        <Select
          value={associationType}
          onChange={(e) => handleAssociationTypeChange(e.target.value)}
          disabled={loading}
          startAdornment={
            isAutoSync ? (
              <AutoModeIcon sx={{ ml: 1, mr: 0.5, color: 'primary.main' }} />
            ) : (
              <TouchAppIcon sx={{ ml: 1, mr: 0.5, color: 'secondary.main' }} />
            )
          }
        >
          <MenuItem value="manual">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TouchAppIcon color="secondary" />
              <span>Manual (Administrador define)</span>
            </Box>
          </MenuItem>
          <MenuItem value="auto">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoModeIcon color="primary" />
              <span>Automática (Sincronizada com Traccar)</span>
            </Box>
          </MenuItem>
        </Select>
      </FormControl>

      {/* Campo ID do Usuário Traccar */}
      {(isAutoSync || associationType === 'manual') && (
        <TextField
          fullWidth
          margin="normal"
          label="ID do Usuário Traccar"
          type="number"
          value={traccarUserId}
          onChange={(e) => setTraccarUserId(e.target.value)}
          disabled={loading || isAutoSync}
          helperText={
            isAutoSync
              ? 'Necessário para sincronização automática'
              : 'Opcional: Permite ativar sincronização automática futuramente'
          }
          required={!isAutoSync && associationType === 'auto'}
        />
      )}

      {/* Informações de Sincronização Automática */}
      {isAutoSync && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CheckCircleIcon color="primary" />
            <Typography variant="subtitle2" color="primary.dark">
              Sincronização Automática Ativada
            </Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Os veículos são sincronizados automaticamente com base no usuário Traccar (ID: {traccarUserId})
          </Typography>
          
          {driver.last_sync && (
            <Box sx={{ mt: 1 }}>
              <Chip
                label={`Última sincronização: ${formatDate(driver.last_sync)}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
          )}

          <Button
            variant="outlined"
            onClick={handleSyncNow}
            disabled={syncing}
            startIcon={syncing ? <CircularProgress size={20} /> : <SyncIcon />}
            sx={{ mt: 2 }}
            fullWidth
          >
            {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
          </Button>
        </Box>
      )}

      {/* Mensagens */}
      {message && (
        <Alert severity="success" sx={{ mt: 2 }} onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Informações sobre Associação Manual */}
      {!isAutoSync && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Modo Manual:</strong> Você tem controle total sobre quais veículos este motorista pode acessar.
            Use o botão "Gerenciar Veículos" na lista de motoristas para configurar.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default DriverAssociationManager;

