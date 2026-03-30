import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  AutoMode as AutoModeIcon,
  TouchApp as TouchAppIcon,
} from '@mui/icons-material';
import { syncDriverAssociations, getAssociationStats } from '../utils/apiUtils';
import { formatDate } from '../utils/formatters';

const AssociationDashboard = ({ onSyncComplete }) => {
  const [stats, setStats] = useState({
    totalDrivers: 0,
    autoAssociationDrivers: 0,
    manualAssociationDrivers: 0,
    pendingSync: 0,
    lastGlobalSync: null,
  });
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState(null);

  const loadStats = async () => {
    try {
      const statsData = await getAssociationStats();
      setStats(statsData);
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleGlobalSync = async () => {
    setSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const result = await syncDriverAssociations();
      setSyncResult(result);
      await loadStats();
      
      if (onSyncComplete) {
        onSyncComplete(result);
      }
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
      setError('Erro ao sincronizar associações. Tente novamente.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Box sx={{ mb: 4 }}>
      {/* Cards de Estatísticas */}
    <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Total de Motoristas
                </Typography>
              </Box>
              <Typography variant="h4">{stats.totalDrivers}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AutoModeIcon sx={{ mr: 1 }} />
                <Typography variant="subtitle2">
                  Associação Automática
                </Typography>
              </Box>
              <Typography variant="h4">
                {stats.autoAssociationDrivers}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ bgcolor: 'secondary.light', color: 'secondary.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TouchAppIcon sx={{ mr: 1 }} />
                <Typography variant="subtitle2">
                  Associação Manual
                </Typography>
              </Box>
              <Typography variant="h4">
                {stats.manualAssociationDrivers}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ bgcolor: stats.pendingSync > 0 ? 'warning.light' : 'success.light' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <WarningIcon sx={{ mr: 1 }} />
                <Typography variant="subtitle2">
                  Pendentes de Sync
                </Typography>
              </Box>
              <Typography variant="h4">
                {stats.pendingSync}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Card de Sincronização Global */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                Sincronização Global
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Última sincronização: {stats.lastGlobalSync ? formatDate(stats.lastGlobalSync) : 'Nunca'}
              </Typography>
              {stats.autoAssociationDrivers === 0 && (
                <Typography variant="caption" color="warning.main" display="block" sx={{ mt: 1 }}>
                  Nenhum motorista configurado para sincronização automática
                </Typography>
              )}
            </Box>
            <Button
              variant="contained"
              onClick={handleGlobalSync}
              disabled={syncing || stats.autoAssociationDrivers === 0}
              startIcon={syncing ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
            >
              {syncing ? 'Sincronizando...' : 'Sincronizar Tudo'}
            </Button>
          </Box>

          {/* Mensagens de Resultado */}
          {syncResult && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Sincronização concluída com sucesso!
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={`${syncResult.synced_drivers || 0} motoristas sincronizados`}
                  size="small"
                  color="success"
                  variant="outlined"
                />
                <Chip
                  label={`${syncResult.created_associations || 0} associações criadas`}
                  size="small"
                  color="info"
                  variant="outlined"
                />
                <Chip
                  label={`${syncResult.removed_associations || 0} associações removidas`}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              </Box>
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AssociationDashboard;

