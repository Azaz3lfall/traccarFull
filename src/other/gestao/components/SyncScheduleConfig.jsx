import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { getSyncSchedule, updateSyncSchedule, runSyncNow } from '../utils/apiUtils';
import { formatDate } from '../utils/formatters';

const INTERVAL_OPTIONS = [
  { value: 5, label: '5 minutos' },
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
  { value: 120, label: '2 horas' },
  { value: 180, label: '3 horas' },
  { value: 360, label: '6 horas' },
  { value: 720, label: '12 horas' },
  { value: 1440, label: '24 horas (diário)' },
];

const SyncScheduleConfig = () => {
  const [config, setConfig] = useState(null);
  const [enabled, setEnabled] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await getSyncSchedule();
      setConfig(data);
      setEnabled(data.enabled || false);
      setIntervalMinutes(data.interval_minutes || 60);
    } catch (err) {
      console.error('Erro ao carregar configuração:', err);
      setError('Erro ao carregar configuração de agendamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const updatedConfig = await updateSyncSchedule(enabled, intervalMinutes);
      setConfig(updatedConfig);
      setMessage('Configuração salva com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setError('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleRunNow = async () => {
    setRunning(true);
    setMessage(null);
    setError(null);

    try {
      const result = await runSyncNow();
      setMessage(
        `Sincronização concluída! ${result.synced_drivers || 0} motoristas sincronizados`
      );
      await loadConfig(); // Recarregar configuração
    } catch (err) {
      console.error('Erro ao executar sincronização:', err);
      setError('Erro ao executar sincronização manual');
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  const getStatusChip = () => {
    if (!config) return null;

    switch (config.status) {
      case 'running':
        return <Chip icon={<CircularProgress size={16} />} label="Executando" color="info" size="small" />;
      case 'error':
        return <Chip icon={<ErrorIcon />} label="Erro" color="error" size="small" />;
      default:
        return <Chip icon={<CheckCircleIcon />} label="Ocioso" color="success" size="small" />;
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <ScheduleIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Sincronização Agendada
          </Typography>
          <Box sx={{ ml: 'auto' }}>
            {getStatusChip()}
          </Box>
        </Box>

        {/* Configurações */}
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                color="primary"
              />
            }
            label="Ativar Sincronização Automática"
          />
          
          <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4, mt: -1 }}>
            Quando ativo, motoristas com associação automática serão sincronizados periodicamente
          </Typography>
        </Box>

        {enabled && (
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Intervalo de Sincronização</InputLabel>
            <Select
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(e.target.value)}
              label="Intervalo de Sincronização"
            >
              {INTERVAL_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Informações */}
        {config && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Estatísticas:
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip 
                label={`Execuções: ${config.total_runs || 0}`} 
                size="small" 
                variant="outlined"
              />
              <Chip 
                label={`Sucesso: ${config.successful_runs || 0}`} 
                size="small" 
                variant="outlined"
                color="success"
              />
              <Chip 
                label={`Erros: ${config.failed_runs || 0}`} 
                size="small" 
                variant="outlined"
                color="error"
              />
            </Box>
            
            {config.last_run && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Última execução: {formatDate(config.last_run)}
              </Typography>
            )}
            
            {config.next_run && enabled && (
              <Typography variant="body2" color="text.secondary">
                Próxima execução: {formatDate(config.next_run)}
              </Typography>
            )}
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Botões de Ação */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : 'Salvar Configuração'}
          </Button>

          <Button
            variant="outlined"
            onClick={handleRunNow}
            disabled={running || !enabled}
            startIcon={running ? <CircularProgress size={20} /> : <PlayArrowIcon />}
          >
            {running ? 'Executando...' : 'Executar Agora'}
          </Button>
        </Box>

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

        {config?.error_message && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Último erro:</strong> {config.error_message}
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default SyncScheduleConfig;

