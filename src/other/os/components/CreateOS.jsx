import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Button,
  Paper,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { Send } from 'lucide-react';
import { getUsers, getClients, getVehicles, createWorkOrder } from '../utils/api';
import ClientCreateModal from './ClientCreateModal';
import VehicleRegisterModal from '../../../components/management/VehicleRegisterModal';

const CreateOS = () => {
  const [clients, setClients] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [clientMode, setClientMode] = useState('existente');
  const [vehicleMode, setVehicleMode] = useState('existente');
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    customer_id: '',
    technician_id: '',
    type: 'INSTALACAO',
    description: '',
    vehicle_plate: '',
    vehicle_model: '',
  });

  const fetchClients = async () => {
    try {
      const clientsRes = await getClients();
      const clientsData = Array.isArray(clientsRes.data) ? clientsRes.data : [];
      setClients(clientsData);
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingUsers(true);
        const [clientsRes, usersRes, vehiclesRes] = await Promise.all([
          getClients(),
          getUsers(),
          getVehicles().catch(() => []),
        ]);
        const clientsData = Array.isArray(clientsRes.data) ? clientsRes.data : [];
        const userData = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.users || []);
        setClients(clientsData);
        setTechnicians(userData.filter(u =>
          u.is_technician === true ||
          u.attributes?.is_technician === true ||
          u.attributes?.is_technician === 'true'
        ));
        setVehicles(Array.isArray(vehiclesRes) ? vehiclesRes : []);
      } catch (err) {
        console.error('Erro ao buscar clientes/técnicos:', err);
        setError('Erro ao carregar lista de clientes e técnicos.');
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchData();
  }, []);

  // Garantir que o menu do Select apareça acima do Popover (z-index)
  const menuProps = {
    style: { zIndex: 20001 },
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await createWorkOrder(formData);
      setSuccess(true);
      setFormData({
        customer_id: '',
        technician_id: '',
        type: 'INSTALACAO',
        description: '',
        vehicle_plate: '',
        vehicle_model: '',
      });
    } catch (err) {
      console.error('Erro ao criar OS:', err);
      setError('Erro ao enviar Ordem de Serviço. Verifique os dados e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUsers) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h6" gutterBottom>
        Nova Ordem de Serviço
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>Ordem de Serviço criada com sucesso!</Alert>}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Cliente
            </Typography>
            <ToggleButtonGroup
              value={clientMode}
              exclusive
              onChange={(_, v) => v != null && setClientMode(v)}
              size="small"
              sx={{ mb: 1 }}
            >
              <ToggleButton value="existente">Cliente existente</ToggleButton>
              <ToggleButton value="novo">Cliente novo</ToggleButton>
            </ToggleButtonGroup>
            {clientMode === 'existente' ? (
              <Autocomplete
                options={clients}
                getOptionLabel={(option) => `${option.name}${option.email ? ` (${option.email})` : ''}`}
                value={clients.find(c => c.id === formData.customer_id) || null}
                onChange={(event, newValue) => {
                  setFormData(prev => ({ ...prev, customer_id: newValue ? newValue.id : '' }));
                }}
                slotProps={{
                  popper: { style: { zIndex: 20001 } }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Cliente"
                    required
                    fullWidth
                  />
                )}
              />
            ) : (
              <Button
                variant="outlined"
                fullWidth
                onClick={() => setClientModalOpen(true)}
              >
                Cadastrar novo cliente
              </Button>
            )}
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Autocomplete
              options={technicians}
              getOptionLabel={(option) => option.name}
              value={technicians.find(t => t.id === formData.technician_id) || null}
              onChange={(event, newValue) => {
                setFormData(prev => ({ ...prev, technician_id: newValue ? newValue.id : '' }));
              }}
              noOptionsText="Nenhum técnico disponível"
              slotProps={{
                popper: { style: { zIndex: 20001 } }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Técnico"
                  required
                  fullWidth
                />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth required>
              <InputLabel>Tipo de Serviço</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                label="Tipo de Serviço"
                MenuProps={menuProps}
              >
                <MenuItem value="INSTALACAO">Instalação</MenuItem>
                <MenuItem value="MANUTENCAO">Manutenção</MenuItem>
                <MenuItem value="REMOCAO">Remoção</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Veículo
            </Typography>
            {!formData.customer_id ? (
              <Alert severity="info" sx={{ py: 1 }}>
                Selecione o cliente antes de escolher o veículo.
              </Alert>
            ) : (
              <>
                <ToggleButtonGroup
                  value={vehicleMode}
                  exclusive
                  onChange={(_, v) => v != null && setVehicleMode(v)}
                  size="small"
                  sx={{ mb: 1 }}
                >
                  <ToggleButton value="existente">Veículo existente</ToggleButton>
                  <ToggleButton value="novo">Veículo novo</ToggleButton>
                </ToggleButtonGroup>
                {vehicleMode === 'existente' ? (
                  <Autocomplete
                    options={vehicles.filter(v => v.client_id === formData.customer_id)}
                    getOptionLabel={(v) => `${v.plate || ''} - ${v.model || v.make || 'N/A'}`}
                    value={
                      vehicles.find(
                        v =>
                          v.client_id === formData.customer_id &&
                          (v.plate || '') === (formData.vehicle_plate || '').trim()
                      ) || null
                    }
                    onChange={(event, newValue) => {
                      setFormData(prev => ({
                        ...prev,
                        vehicle_plate: newValue?.plate || '',
                        vehicle_model: newValue?.model || newValue?.make || '',
                      }));
                    }}
                    slotProps={{
                      popper: { style: { zIndex: 20001 } }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Placa / Modelo"
                        required
                        fullWidth
                      />
                    )}
                  />
                ) : (
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => setVehicleModalOpen(true)}
                  >
                    Cadastrar novo veículo
                  </Button>
                )}
                {(formData.vehicle_plate || formData.vehicle_model) && (
                  <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                      size="small"
                      label="Placa"
                      value={formData.vehicle_plate}
                      onChange={(e) => setFormData(prev => ({ ...prev, vehicle_plate: e.target.value }))}
                      sx={{ minWidth: 120 }}
                    />
                    <TextField
                      size="small"
                      label="Modelo"
                      value={formData.vehicle_model}
                      onChange={(e) => setFormData(prev => ({ ...prev, vehicle_model: e.target.value }))}
                      sx={{ minWidth: 160 }}
                    />
                  </Box>
                )}
              </>
            )}
          </Grid>

          <Grid size={12}>
            <TextField
              fullWidth
              label="Descrição do Problema / Serviço"
              name="description"
              value={formData.description}
              onChange={handleChange}
              multiline
              rows={4}
              required
            />
          </Grid>

          <Grid size={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Send size={20} />}
              disabled={submitting}
            >
              {submitting ? 'Enviando...' : 'Criar Ordem de Serviço'}
            </Button>
          </Grid>
        </Grid>
      </form>

      <ClientCreateModal
        open={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onSuccess={async (client) => {
          await fetchClients();
          if (client?.id) {
            setFormData(prev => ({ ...prev, customer_id: client.id }));
            setClients(prev => (prev.some(c => c.id === client.id) ? prev : [...prev, client]));
          }
        }}
      />

      <VehicleRegisterModal
        open={vehicleModalOpen}
        onClose={() => setVehicleModalOpen(false)}
        initialClientId={formData.customer_id || undefined}
        onSuccess={(vehicle) => {
          setFormData(prev => ({
            ...prev,
            vehicle_plate: vehicle?.plate || '',
            vehicle_model: vehicle?.model || vehicle?.make || '',
          }));
          setVehicleModalOpen(false);
        }}
      />
    </Paper>
  );
};

export default CreateOS;

