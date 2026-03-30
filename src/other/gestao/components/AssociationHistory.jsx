import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Pagination,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon,
  AutoMode as AutoModeIcon,
  TouchApp as TouchAppIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { getDriverHistory, getAssociationHistory } from '../utils/apiUtils';
import { formatDate } from '../utils/formatters';

const AssociationHistory = ({ driverId = null }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    days: 30,
    action: '',
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);

  const itemsPerPage = 10;

  useEffect(() => {
    loadHistory();
  }, [driverId, filters, page]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const offset = (page - 1) * itemsPerPage;
      
      if (driverId) {
        // Histórico de um motorista específico
        const data = await getDriverHistory(driverId, itemsPerPage, offset);
        setHistory(data);
        setTotal(data.length);
      } else {
        // Histórico geral
        const params = {
          days: filters.days,
          action: filters.action,
          limit: itemsPerPage,
          offset: offset,
        };
        
        const data = await getAssociationHistory(params);
        setHistory(data.history || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
      setError('Erro ao carregar histórico de associações');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    if (action === 'added') {
      return <AddIcon />;
    }
    return <RemoveIcon />;
  };

  const getActionColor = (action) => {
    if (action === 'added') {
      return 'success';
    }
    return 'error';
  };

  const getActionText = (action) => {
    if (action === 'added') {
      return 'Adicionado';
    }
    return 'Removido';
  };

  const getTypeIcon = (type) => {
    if (type === 'auto') {
      return <AutoModeIcon fontSize="small" />;
    }
    return <TouchAppIcon fontSize="small" />;
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  if (loading && history.length === 0) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <HistoryIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Histórico de Associações
          </Typography>
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            <Button
              size="small"
              onClick={loadHistory}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            >
              Atualizar
            </Button>
          </Box>
        </Box>

        {/* Filtros */}
        {!driverId && (
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Período</InputLabel>
              <Select
                value={filters.days}
                onChange={(e) => {
                  setFilters({ ...filters, days: e.target.value });
                  setPage(1);
                }}
                label="Período"
              >
                <MenuItem value={7}>Últimos 7 dias</MenuItem>
                <MenuItem value={15}>Últimos 15 dias</MenuItem>
                <MenuItem value={30}>Últimos 30 dias</MenuItem>
                <MenuItem value={60}>Últimos 60 dias</MenuItem>
                <MenuItem value={90}>Últimos 90 dias</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Ação</InputLabel>
              <Select
                value={filters.action}
                onChange={(e) => {
                  setFilters({ ...filters, action: e.target.value });
                  setPage(1);
                }}
                label="Ação"
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="added">Adicionado</MenuItem>
                <MenuItem value="removed">Removido</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}

        {/* Mensagens */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {history.length === 0 && !loading && (
          <Alert severity="info">
            Nenhum registro de mudança encontrado no período selecionado.
          </Alert>
        )}

        {/* Lista de Histórico */}
        {history.length > 0 && (
          <>
            <List sx={{ width: '100%' }}>
              {history.map((item, index) => (
                <React.Fragment key={item.id}>
                  <ListItem
                    alignItems="flex-start"
                    sx={{
                      bgcolor: 'background.paper',
                      mb: 1,
                      borderRadius: 1,
                      border: 1,
                      borderColor: 'divider',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    {/* Ícone de Ação */}
                    <ListItemIcon sx={{ minWidth: 56 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: item.action === 'added' ? 'success.light' : 'error.light',
                          color: item.action === 'added' ? 'success.dark' : 'error.dark',
                        }}
                      >
                        {getActionIcon(item.action)}
                      </Box>
                    </ListItemIcon>

                    {/* Conteúdo */}
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                          <Chip
                            label={getActionText(item.action)}
                            size="small"
                            color={getActionColor(item.action)}
                          />
                          <Chip
                            icon={getTypeIcon(item.association_type)}
                            label={item.association_type === 'auto' ? 'Auto' : 'Manual'}
                            size="small"
                            variant="outlined"
                            color={item.association_type === 'auto' ? 'primary' : 'secondary'}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(item.changed_at)} às {new Date(item.changed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.primary">
                            <strong>{item.driver_name || `Motorista #${item.driver_id}`}</strong>
                            {' → '}
                            {item.vehicle_name || `Veículo #${item.vehicle_id}`}
                          </Typography>
                          {item.sync_source && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                              Origem: {item.sync_source === 'auto_sync' ? 'Sincronização Automática' : 
                                       item.sync_source === 'manual' ? 'Ação Manual' : item.sync_source}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < history.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>

            {/* Paginação */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(e, value) => setPage(value)}
                  color="primary"
                  showFirstButton
                  showLastButton
                />
              </Box>
            )}

            {/* Informações */}
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Mostrando {history.length} de {total} registros
              </Typography>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AssociationHistory;

