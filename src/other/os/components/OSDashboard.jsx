import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Box,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Autocomplete,
} from '@mui/material';
import { 
  Eye, Clock, CheckCircle2, AlertCircle, Calendar, User, 
  Truck, FileText, Image as ImageIcon, Check, X, 
  Edit, Save, Plus, Trash2, Camera
} from 'lucide-react';
import { 
  getWorkOrders, getWorkOrderDetails, updateWorkOrder, updateWorkOrderStatus, 
  getUsers, getClients, saveWorkOrderChecklist, uploadWorkOrderPhotos,
  deleteWorkOrder, getAvailableDevices, getLinkedDevices
} from '../utils/api';
import { OS_STATUS, OS_STATUS_LABELS } from '../constants';

const EQUIPMENT_TYPES = ['GSM', 'Satelital', 'Tag', 'Camera'];

const LOCK_TYPES = ['GSM/SMS', 'Troia', 'Antijammer', 'Sem Bloqueio'];

const StatusCard = ({ title, count, icon: Icon, color }) => (
  <Card sx={{ height: '100%', borderLeft: `6px solid ${color}` }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography color="text.secondary" variant="overline" sx={{ fontWeight: 'bold' }}>
            {title}
          </Typography>
          <Typography variant="h4">{count}</Typography>
        </Box>
        <Box sx={{ p: 1, borderRadius: '50%', backgroundColor: `${color}15` }}>
          <Icon color={color} size={32} />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const OSDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [clientsMap, setClientsMap] = useState({});
  const [usersMap, setUsersMap] = useState({});
  const [usersList, setUsersList] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Detail Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingVehiclePhoto, setUploadingVehiclePhoto] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [linkedDevices, setLinkedDevices] = useState([]);
  const fileInputRef = useRef(null);
  const vehiclePhotoInputRef = useRef(null);

  const osType = (editData.type || selectedOrder?.type || 'INSTALACAO').toUpperCase();
  const isInstalacao = osType === 'INSTALACAO';
  const isManutencao = osType === 'MANUTENCAO';
  const isRemocao = osType === 'REMOCAO';

  useEffect(() => {
    if (!detailModalOpen) return;
    const t = (editData.type || 'INSTALACAO').toUpperCase();
    if ((t === 'MANUTENCAO' || t === 'REMOCAO') && editData.vehicle_plate && editData.customer_id) {
      getLinkedDevices(editData.vehicle_plate, editData.customer_id).then((devs) => setLinkedDevices(Array.isArray(devs) ? devs : [])).catch(() => setLinkedDevices([]));
    } else {
      setLinkedDevices([]);
    }
  }, [detailModalOpen, editData.type, editData.vehicle_plate, editData.customer_id]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const [ordersRes, clientsRes, usersRes] = await Promise.all([
        getWorkOrders(),
        getClients(),
        getUsers()
      ]);
      setOrders(ordersRes.data);
      const clientsData = Array.isArray(clientsRes.data) ? clientsRes.data : [];
      const usersData = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.users || []);
      const cm = {};
      clientsData.forEach(c => { cm[c.id] = c.name || c.email || 'N/A'; });
      const um = {};
      usersData.forEach(u => { um[u.id] = u.name || u.email || `User ${u.id}`; });
      setClientsMap(cm);
      setUsersMap(um);
      setClientsList(clientsData);
      setUsersList(usersData);
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err);
      setError('Não foi possível carregar os dados do dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (orderId) => {
    setDetailModalOpen(true);
    setLoadingDetails(true);
    setIsEditing(false);
    try {
      const [response, devicesRes] = await Promise.all([
        getWorkOrderDetails(orderId),
        getAvailableDevices().catch(() => [])
      ]);
      setAvailableDevices(Array.isArray(devicesRes) ? devicesRes : []);
      const data = response.data;
      setSelectedOrder(data);
      
      // Migrar equipment_items: usar se existir, senão construir a partir dos campos legados
      let equipmentItems = Array.isArray(data.equipment_items) ? data.equipment_items : [];
      if (equipmentItems.length === 0 && data.device_imei) {
        const eqType = Array.isArray(data.equipment_type) ? data.equipment_type[0] : (data.equipment_type || '');
        const lkType = Array.isArray(data.lock_type) ? data.lock_type : (data.lock_type ? [data.lock_type] : []);
        equipmentItems = [{
          equipment_type: eqType || 'GSM',
          device_id: null,
          device_imei: data.device_imei,
          equipment_model: data.equipment_model || '',
          equipment_serial: data.equipment_serial || data.device_imei || '',
          chip_number: data.chip_number || '',
          lock_type: lkType
        }];
      }
      // Garantir estrutura de cada item
      equipmentItems = equipmentItems.map((it) => ({
        equipment_type: it.equipment_type || 'GSM',
        device_id: it.device_id ?? null,
        device_imei: it.device_imei || '',
        equipment_model: it.equipment_model || '',
        equipment_serial: it.equipment_serial || it.device_imei || '',
        chip_number: it.chip_number || '',
        lock_type: Array.isArray(it.lock_type) ? it.lock_type : (it.lock_type ? [it.lock_type] : [])
      }));

      const devicesToRemove = Array.isArray(data.devices_to_remove) ? data.devices_to_remove : [];
      setEditData({
        customer_id: data.customer_id,
        technician_id: data.technician_id,
        type: data.type || 'INSTALACAO',
        description: data.description || '',
        vehicle_plate: data.vehicle_plate || '',
        vehicle_model: data.vehicle_model || '',
        vehicle_photo_path: data.vehicle_photo_path || '',
        equipment_items: equipmentItems,
        devices_to_remove: devicesToRemove,
        delete_vehicle_if_empty: Boolean(data.delete_vehicle_if_empty),
        technician_notes: data.checklist?.technician_notes || data.installation_details || '',
        checklist_items: Array.isArray(data.checklist?.items) ? data.checklist.items : []
      });
    } catch (err) {
      console.error('Erro ao buscar detalhes da OS:', err);
      alert('Não foi possível carregar os detalhes desta Ordem de Serviço.');
      setDetailModalOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseDetails = () => {
    setDetailModalOpen(false);
    setSelectedOrder(null);
    setIsEditing(false);
  };

  const handleToggleEdit = () => {
    setIsEditing(!isEditing);
  };

  const addEquipmentItem = () => {
    setEditData((prev) => ({
      ...prev,
      equipment_items: [...(prev.equipment_items || []), {
        equipment_type: 'GSM',
        device_id: null,
        device_imei: '',
        equipment_model: '',
        equipment_serial: '',
        chip_number: '',
        lock_type: []
      }]
    }));
  };

  const removeEquipmentItem = (index) => {
    setEditData((prev) => ({
      ...prev,
      equipment_items: (prev.equipment_items || []).filter((_, i) => i !== index)
    }));
  };

  const updateEquipmentItem = (index, field, value) => {
    setEditData((prev) => {
      const items = [...(prev.equipment_items || [])];
      if (!items[index]) return prev;
      items[index] = { ...items[index], [field]: value };
      return { ...prev, equipment_items: items };
    });
  };

  const toggleDeviceToRemove = (deviceId) => {
    setEditData((prev) => {
      const current = prev.devices_to_remove || [];
      const has = current.includes(deviceId);
      const next = has ? current.filter((id) => id !== deviceId) : [...current, deviceId];
      return { ...prev, devices_to_remove: next };
    });
  };

  const onDeviceSelect = (index, device) => {
    if (!device) return;
    const imei = device.uniqueId || '';
    const model = device.model || device.name || '';
    const chip = device.phone || device.attributes?.phone || '';
    setEditData((prev) => {
      const items = [...(prev.equipment_items || [])];
      if (!items[index]) return prev;
      items[index] = {
        ...items[index],
        device_id: device.id,
        device_imei: imei,
        equipment_model: model,
        equipment_serial: imei,
        chip_number: chip || ''
      };
      return { ...prev, equipment_items: items };
    });
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      const mainFieldsChanged =
        editData.customer_id !== selectedOrder.customer_id ||
        editData.technician_id !== selectedOrder.technician_id ||
        editData.type !== selectedOrder.type ||
        editData.description !== selectedOrder.description ||
        editData.vehicle_plate !== selectedOrder.vehicle_plate ||
        editData.vehicle_model !== selectedOrder.vehicle_model;

      if (mainFieldsChanged) {
        await updateWorkOrder(selectedOrder.id, {
          customer_id: editData.customer_id,
          technician_id: editData.technician_id,
          type: editData.type,
          description: editData.description,
          vehicle_plate: editData.vehicle_plate,
          vehicle_model: editData.vehicle_model
        });
      }

      await saveWorkOrderChecklist({
        work_order_id: selectedOrder.id,
        items: editData.checklist_items,
        technician_notes: editData.technician_notes,
        equipment_items: editData.equipment_items,
        vehicle_photo_path: editData.vehicle_photo_path || null,
        devices_to_remove: editData.devices_to_remove || [],
        delete_vehicle_if_empty: editData.delete_vehicle_if_empty || false
      });

      const response = await getWorkOrderDetails(selectedOrder.id);
      setSelectedOrder(response.data);
      setIsEditing(false);
      fetchOrders();
    } catch (err) {
      console.error('Erro ao salvar edição:', err);
      const msg = err?.response?.data?.details || err?.response?.data?.error || err?.message || 'Erro ao salvar as alterações.';
      alert(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  const handlePhotoUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhotos(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('photos', files[i]);
    }
    formData.append('type', 'PHOTO');

    try {
      await uploadWorkOrderPhotos(selectedOrder.id, formData);
      // Recarrega detalhes
      const response = await getWorkOrderDetails(selectedOrder.id);
      setSelectedOrder(response.data);
    } catch (err) {
      console.error('Erro ao subir fotos:', err);
      const msg = err?.response?.data?.details || err?.response?.data?.error || err?.message || 'Erro ao enviar fotos.';
      alert(msg);
    } finally {
      setUploadingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleVehiclePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingVehiclePhoto(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/vehicles/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      if (res.ok) {
        const { filePath } = await res.json();
        setEditData((prev) => ({ ...prev, vehicle_photo_path: filePath }));
      } else {
        throw new Error('Falha no upload da foto');
      }
    } catch (err) {
      console.error('Erro ao subir foto do veículo:', err);
      alert(err?.message || 'Erro ao enviar foto do veículo.');
    } finally {
      setUploadingVehiclePhoto(false);
      if (vehiclePhotoInputRef.current) vehiclePhotoInputRef.current.value = '';
    }
  };

  const handleRemoveVehiclePhoto = () => {
    setEditData((prev) => ({ ...prev, vehicle_photo_path: '' }));
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    const action = newStatus === OS_STATUS.COMPLETED ? 'finalizar' : 'cancelar';
    if (!window.confirm(`Tem certeza que deseja ${action} esta Ordem de Serviço?`)) return;

    try {
      await updateWorkOrderStatus(orderId, newStatus);
      fetchOrders();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      alert('Erro ao atualizar o status da OS.');
    }
  };

  const handleDelete = async (orderId) => {
    if (!window.confirm(`Tem certeza que deseja EXCLUIR permanentemente a Ordem de Serviço #${orderId}? Esta ação não pode ser desfeita.`)) return;

    try {
      await deleteWorkOrder(orderId);
      fetchOrders();
    } catch (err) {
      console.error('Erro ao excluir OS:', err);
      alert('Não foi possível excluir a Ordem de Serviço.');
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const stats = useMemo(() => {
    const counts = {
      [OS_STATUS.PENDING]: 0,
      [OS_STATUS.IN_PROGRESS]: 0,
      [OS_STATUS.COMPLETED]: 0,
    };
    orders.forEach(order => {
      if (counts[order.status] !== undefined) {
        counts[order.status]++;
      }
    });
    return counts;
  }, [orders]);

  const getStatusColor = (status) => {
    switch (status) {
      case OS_STATUS.PENDING: return '#ed6c02';
      case OS_STATUS.IN_PROGRESS: return '#0288d1';
      case OS_STATUS.COMPLETED: return '#2e7d32';
      case OS_STATUS.CANCELLED: return '#d32f2f';
      default: return '#757575';
    }
  };

  if (loading && orders.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Resumo Estatístico */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatusCard
            title="Pendentes"
            count={stats[OS_STATUS.PENDING]}
            icon={AlertCircle}
            color="#ed6c02"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatusCard
            title="Em Andamento"
            count={stats[OS_STATUS.IN_PROGRESS]}
            icon={Clock}
            color="#0288d1"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatusCard
            title="Concluídas"
            count={stats[OS_STATUS.COMPLETED]}
            icon={CheckCircle2}
            color="#2e7d32"
          />
        </Grid>
      </Grid>

      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Ordens de Serviço Recentes</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Protocolo</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Técnico</TableCell>
              <TableCell>Veículo</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell>#{order.id}</TableCell>
                  <TableCell>{clientsMap[order.customer_id] || usersMap[order.customer_id] || 'N/A'}</TableCell>
                  <TableCell>{usersMap[order.technician_id] || 'Não atribuído'}</TableCell>
                  <TableCell>{order.vehicle_plate} ({order.vehicle_model})</TableCell>
                  <TableCell>
                    <Chip
                      label={OS_STATUS_LABELS[order.status]}
                      size="small"
                      sx={{
                        backgroundColor: `${getStatusColor(order.status)}20`,
                        color: getStatusColor(order.status),
                        fontWeight: 'bold',
                        border: `1px solid ${getStatusColor(order.status)}`
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <IconButton 
                        size="small" 
                        color="primary" 
                        title="Ver Detalhes"
                        onClick={() => handleOpenDetails(order.id)}
                      >
                        <Eye size={18} />
                      </IconButton>

                      {order.status !== OS_STATUS.COMPLETED && order.status !== OS_STATUS.CANCELLED && (
                        <>
                          <IconButton 
                            size="small" 
                            sx={{ color: '#2e7d32' }} 
                            title="Dar Baixa (Concluir)"
                            onClick={() => handleUpdateStatus(order.id, OS_STATUS.COMPLETED)}
                          >
                            <Check size={18} />
                          </IconButton>
                          
                          <IconButton 
                            size="small" 
                            color="error" 
                            title="Cancelar OS"
                            onClick={() => handleUpdateStatus(order.id, OS_STATUS.CANCELLED)}
                          >
                            <X size={18} />
                          </IconButton>
                        </>
                      )}

                      <IconButton 
                        size="small" 
                        color="error" 
                        title="Excluir OS"
                        onClick={() => handleDelete(order.id)}
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Nenhuma ordem de serviço encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal de Detalhes e Edição */}
      <Dialog 
        open={detailModalOpen} 
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
        sx={{ zIndex: 20001 }}
        disableEnforceFocus
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            Detalhes da OS {selectedOrder && `#${selectedOrder.id}`}
            {selectedOrder && (
              <Chip 
                label={OS_STATUS_LABELS[selectedOrder.status]} 
                size="small"
                sx={{ 
                  backgroundColor: `${getStatusColor(selectedOrder.status)}20`,
                  color: getStatusColor(selectedOrder.status),
                  fontWeight: 'bold'
                }} 
              />
            )}
          </Box>
          {!isEditing && selectedOrder?.status !== OS_STATUS.CANCELLED && (
            <Button 
              startIcon={<Edit size={18} />} 
              onClick={handleToggleEdit}
              variant="outlined"
              size="small"
            >
              Editar
            </Button>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {loadingDetails ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : selectedOrder ? (
            <Grid container spacing={3}>
              {/* Informações do Cliente e Veículo */}
              <Grid size={{ xs: 12, md: 6 }}>
                {isEditing ? (
                  <>
                    <Autocomplete
                      options={clientsList}
                      getOptionLabel={(opt) => `${opt.name}${opt.email ? ` (${opt.email})` : ''}`}
                      value={clientsList.find(c => c.id === editData.customer_id) || null}
                      onChange={(e, v) => setEditData({ ...editData, customer_id: v?.id ?? '' })}
                      renderInput={(params) => <TextField {...params} label="Cliente" size="small" />}
                      slotProps={{ popper: { style: { zIndex: 20002 } } }}
                    />
                    <Box sx={{ mt: 2 }}>
                      <Autocomplete
                        options={usersList.filter(u => u.is_technician || u.attributes?.is_technician)}
                        getOptionLabel={(opt) => opt.name || opt.email}
                        value={usersList.find(u => u.id === editData.technician_id) || null}
                        onChange={(e, v) => setEditData({ ...editData, technician_id: v?.id ?? '' })}
                        renderInput={(params) => <TextField {...params} label="Técnico" size="small" />}
                        slotProps={{ popper: { style: { zIndex: 20002 } } }}
                      />
                    </Box>
                  </>
                ) : (
                  <>
                    <Typography variant="subtitle2" color="text.secondary">Cliente</Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>{clientsMap[selectedOrder.customer_id] || usersMap[selectedOrder.customer_id] || 'N/A'}</Typography>
                    <Typography variant="subtitle2" color="text.secondary">Técnico Responsável</Typography>
                    <Typography variant="body1">{usersMap[selectedOrder.technician_id] || 'Não atribuído'}</Typography>
                  </>
                )}
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                {isEditing ? (
                  <>
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                      <InputLabel id="os-type-label">Tipo de Serviço</InputLabel>
                      <Select
                        labelId="os-type-label"
                        value={editData.type || 'INSTALACAO'}
                        onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                        label="Tipo de Serviço"
                        MenuProps={{
                          disableScrollLock: true,
                          slotProps: { root: { sx: { zIndex: 20002 } } },
                          PaperProps: { sx: { zIndex: 20002 } }
                        }}
                      >
                        <MenuItem value="INSTALACAO">Instalação</MenuItem>
                        <MenuItem value="MANUTENCAO">Manutenção</MenuItem>
                        <MenuItem value="REMOCAO">Remoção</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      fullWidth
                      size="small"
                      label="Placa"
                      value={editData.vehicle_plate}
                      onChange={(e) => setEditData({ ...editData, vehicle_plate: e.target.value })}
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Modelo do Veículo"
                      value={editData.vehicle_model}
                      onChange={(e) => setEditData({ ...editData, vehicle_model: e.target.value })}
                    />
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>Foto do veículo (opcional)</Typography>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      ref={vehiclePhotoInputRef}
                      onChange={handleVehiclePhotoUpload}
                    />
                    {(editData.vehicle_photo_path || selectedOrder?.vehicle_photo_path) ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Box
                          component="img"
                          src={`/api/vehicles/image/${(editData.vehicle_photo_path || selectedOrder?.vehicle_photo_path || '').replace(/^\/?uploads\//, '')}`}
                          alt="Foto do veículo"
                          sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                        />
                        <Box>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={uploadingVehiclePhoto ? <CircularProgress size={16} /> : <Camera size={16} />}
                            onClick={() => vehiclePhotoInputRef.current?.click()}
                            disabled={uploadingVehiclePhoto}
                          >
                            Alterar foto
                          </Button>
                          <Button size="small" color="error" onClick={handleRemoveVehiclePhoto} sx={{ ml: 1 }}>
                            Remover
                          </Button>
                        </Box>
                      </Box>
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={uploadingVehiclePhoto ? <CircularProgress size={16} /> : <Camera size={16} />}
                        onClick={() => vehiclePhotoInputRef.current?.click()}
                        disabled={uploadingVehiclePhoto}
                      >
                        Adicionar foto
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Typography variant="subtitle2" color="text.secondary">Veículo</Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>{selectedOrder.vehicle_plate} - {selectedOrder.vehicle_model}</Typography>
                    <Typography variant="subtitle2" color="text.secondary">Foto do veículo</Typography>
                    {selectedOrder?.vehicle_photo_path ? (
                      <Box
                        component="img"
                        src={`/api/vehicles/image/${selectedOrder.vehicle_photo_path.replace(/^\/?uploads\//, '')}`}
                        alt="Foto do veículo"
                        sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider', mt: 1 }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Nenhuma foto do veículo adicionada.</Typography>
                    )}
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Data de Criação</Typography>
                    <Typography variant="body1">{new Date(selectedOrder.created_at).toLocaleString('pt-BR')}</Typography>
                  </>
                )}
              </Grid>

              <Grid size={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>

              {/* Seção: Dispositivos a remover (Manutenção / Remoção) */}
              {(isManutencao || isRemocao) && (
                <Grid size={12}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Dispositivos a remover</Typography>
                  {linkedDevices.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Nenhum dispositivo vinculado ao veículo. Verifique a placa e o cliente.
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {linkedDevices.map((d) => (
                        <Box key={d.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {isEditing ? (
                            <Checkbox
                              checked={(editData.devices_to_remove || []).includes(d.id)}
                              onChange={() => toggleDeviceToRemove(d.id)}
                              size="small"
                            />
                          ) : (
                            <Checkbox checked={(editData.devices_to_remove || []).includes(d.id)} disabled size="small" />
                          )}
                          <Typography variant="body2">
                            {d.uniqueId || d.name || `ID ${d.id}`}
                            {d.name && d.uniqueId ? ` (${d.name})` : ''}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                  {isRemocao && linkedDevices.length > 0 && (
                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                      {isEditing ? (
                        <Checkbox
                          checked={!!editData.delete_vehicle_if_empty}
                          onChange={(e) => setEditData({ ...editData, delete_vehicle_if_empty: e.target.checked })}
                          disabled={linkedDevices.length !== (editData.devices_to_remove || []).length}
                          size="small"
                        />
                      ) : (
                        <Checkbox checked={!!editData.delete_vehicle_if_empty} disabled size="small" />
                      )}
                      <Typography variant="body2" color={linkedDevices.length === (editData.devices_to_remove || []).length ? 'text.primary' : 'text.secondary'}>
                        Excluir veículo da base ao remover todos os dispositivos
                        {linkedDevices.length !== (editData.devices_to_remove || []).length && ' (marque todos os dispositivos para habilitar)'}
                      </Typography>
                    </Box>
                  )}
                </Grid>
              )}

              {/* Seção Editável: Equipamento (Instalação / Manutenção) */}
              {(isInstalacao || isManutencao) && (
              <Grid size={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    {isManutencao ? 'Novos dispositivos' : 'Informações do Equipamento'}
                  </Typography>
                  {isEditing && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Plus size={16} />}
                      onClick={addEquipmentItem}
                    >
                      Adicionar dispositivo
                    </Button>
                  )}
                </Box>
                {(editData.equipment_items || selectedOrder?.equipment_items || []).length === 0 ? (
                  !isEditing ? (
                    <Typography variant="body2" color="text.secondary">Nenhum equipamento cadastrado.</Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Clique em &quot;Adicionar dispositivo&quot; para incluir equipamentos.
                    </Typography>
                  )
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {(editData.equipment_items || []).map((item, idx) => (
                      <Paper key={idx} variant="outlined" sx={{ p: 2, position: 'relative' }}>
                        {isEditing && (
                          <IconButton
                            size="small"
                            onClick={() => removeEquipmentItem(idx)}
                            sx={{ position: 'absolute', top: 8, right: 8 }}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        )}
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            {isEditing ? (
                              <FormControl fullWidth size="small">
                                <InputLabel id={`equipment-type-label-${idx}`}>Tipo de Equipamento</InputLabel>
                                <Select
                                  labelId={`equipment-type-label-${idx}`}
                                  value={item.equipment_type || 'GSM'}
                                  onChange={(e) => updateEquipmentItem(idx, 'equipment_type', e.target.value)}
                                  label="Tipo de Equipamento"
                                  MenuProps={{
                                    disableScrollLock: true,
                                    slotProps: { root: { sx: { zIndex: 20002 } } },
                                    PaperProps: { sx: { zIndex: 20002 } }
                                  }}
                                >
                                  {EQUIPMENT_TYPES.map((name) => (
                                    <MenuItem key={name} value={name}>{name}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            ) : (
                              <>
                                <Typography variant="caption" color="text.secondary">Tipo de Equipamento</Typography>
                                <Typography variant="body2">{item.equipment_type || 'N/A'}</Typography>
                              </>
                            )}
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            {isEditing ? (
                              <Autocomplete
                                freeSolo
                                options={availableDevices}
                                getOptionLabel={(opt) => (typeof opt === 'string' ? opt : `${opt?.uniqueId || opt?.name || ''}`.trim() || '')}
                                value={
                                  item.device_id
                                    ? availableDevices.find((d) => d.id === item.device_id) || null
                                    : (item.device_imei ? item.device_imei : null)
                                }
                                onChange={(_, val) => {
                                  if (typeof val === 'string') {
                                    setEditData((prev) => {
                                      const items = [...(prev.equipment_items || [])];
                                      if (!items[idx]) return prev;
                                      items[idx] = {
                                        ...items[idx],
                                        device_id: null,
                                        device_imei: val,
                                        equipment_model: '',
                                        equipment_serial: val,
                                        chip_number: ''
                                      };
                                      return { ...prev, equipment_items: items };
                                    });
                                  } else if (val) {
                                    onDeviceSelect(idx, val);
                                  } else {
                                    setEditData((prev) => {
                                      const items = [...(prev.equipment_items || [])];
                                      if (!items[idx]) return prev;
                                      items[idx] = {
                                        ...items[idx],
                                        device_id: null,
                                        device_imei: '',
                                        equipment_model: '',
                                        equipment_serial: '',
                                        chip_number: ''
                                      };
                                      return { ...prev, equipment_items: items };
                                    });
                                  }
                                }}
                                slotProps={{ popper: { style: { zIndex: 20002 } } }}
                                renderInput={(params) => (
                                  <TextField {...params} label="IMEI do Dispositivo" size="small" placeholder="Selecione ou digite o IMEI" />
                                )}
                                isOptionEqualToValue={(opt, val) =>
                                  (opt?.id != null && val?.id != null && opt.id === val.id) ||
                                  (typeof val === 'string' && (opt?.uniqueId || '') === val)
                                }
                                noOptionsText="Nenhum dispositivo disponível. Digite o IMEI manualmente."
                              />
                            ) : (
                              <>
                                <Typography variant="caption" color="text.secondary">IMEI do Dispositivo</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{item.device_imei || 'N/A'}</Typography>
                              </>
                            )}
                          </Grid>
                          <Grid size={{ xs: 12, sm: 4 }}>
                            <Typography variant="caption" color="text.secondary">Modelo do Rastreador</Typography>
                            <TextField fullWidth size="small" value={item.equipment_model || ''} InputProps={{ readOnly: true }} sx={{ mt: 0.5 }} />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 4 }}>
                            <Typography variant="caption" color="text.secondary">Nº Serial</Typography>
                            <TextField fullWidth size="small" value={item.equipment_serial || ''} InputProps={{ readOnly: true }} sx={{ mt: 0.5 }} />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 4 }}>
                            <Typography variant="caption" color="text.secondary">Número do Chip</Typography>
                            <TextField fullWidth size="small" value={item.chip_number || ''} InputProps={{ readOnly: true }} sx={{ mt: 0.5 }} />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            {isEditing ? (
                              <FormControl fullWidth size="small">
                                <InputLabel id={`lock-type-label-${idx}`}>Tipo de Bloqueio</InputLabel>
                                <Select
                                  labelId={`lock-type-label-${idx}`}
                                  multiple
                                  value={item.lock_type || []}
                                  onChange={(e) => updateEquipmentItem(idx, 'lock_type', e.target.value)}
                                  input={<OutlinedInput label="Tipo de Bloqueio" />}
                                  renderValue={(selected) => selected.join(', ')}
                                  MenuProps={{
                                    disableScrollLock: true,
                                    slotProps: { root: { sx: { zIndex: 20002 } } },
                                    PaperProps: { sx: { zIndex: 20002 } }
                                  }}
                                >
                                  {LOCK_TYPES.map((name) => (
                                    <MenuItem key={name} value={name}>
                                      <Checkbox checked={(item.lock_type || []).indexOf(name) > -1} />
                                      <ListItemText primary={name} />
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            ) : (
                              <>
                                <Typography variant="caption" color="text.secondary">Tipo de Bloqueio</Typography>
                                <Typography variant="body2">{(item.lock_type || []).join(', ') || 'N/A'}</Typography>
                              </>
                            )}
                          </Grid>
                        </Grid>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Grid>
              )}

              <Grid size={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>

              {/* Descrição e Notas */}
              <Grid size={12}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Descrição do Serviço Solicitado</Typography>
                {isEditing ? (
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    size="small"
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    sx={{ mb: 2 }}
                  />
                ) : (
                  <Typography variant="body2" sx={{ mb: 3, p: 1.5, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 1 }}>
                    {selectedOrder.description}
                  </Typography>
                )}

                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Observações do Técnico / Detalhes de Instalação</Typography>
                {isEditing ? (
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    placeholder="Descreva detalhes da instalação, posição do rastreador, etc..."
                    value={editData.technician_notes}
                    onChange={(e) => setEditData({ ...editData, technician_notes: e.target.value })}
                  />
                ) : (
                  <Typography variant="body2" sx={{ 
                    p: 1.5, 
                    borderRadius: 1, 
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0,0,0,0.04)',
                    borderLeft: '4px solid',
                    borderColor: 'primary.main',
                    fontStyle: 'italic',
                    minHeight: 40
                  }}>
                    {selectedOrder.checklist?.technician_notes || selectedOrder.installation_details || 'Nenhuma observação registrada.'}
                  </Typography>
                )}
              </Grid>

              {/* Fotos e Anexos */}
              <Grid size={12}>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ImageIcon size={18} style={{ marginRight: 8 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Anexos e Fotos</Typography>
                  </Box>
                  <Box>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      style={{ display: 'none' }}
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                    />
                    <Button 
                      startIcon={uploadingPhotos ? <CircularProgress size={16} /> : <Camera size={18} />} 
                      size="small"
                      onClick={() => fileInputRef.current.click()}
                      disabled={uploadingPhotos || selectedOrder.status === OS_STATUS.CANCELLED}
                    >
                      Adicionar Fotos
                    </Button>
                  </Box>
                </Box>
                
                <Grid container spacing={2}>
                  {selectedOrder.attachments && selectedOrder.attachments.map((attachment, index) => {
                    const imgUrl = attachment.file_path.replace('/var/www/os_system/uploads/', '/os-uploads/');
                    return (
                      <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
                        <Box 
                          component="img"
                          src={imgUrl}
                          sx={{ 
                            width: '100%', 
                            height: 120, 
                            objectFit: 'cover', 
                            borderRadius: 1,
                            cursor: 'pointer',
                            border: '1px solid #ddd',
                            '&:hover': { opacity: 0.8 }
                          }}
                          onClick={() => window.open(imgUrl, '_blank')}
                        />
                      </Grid>
                    );
                  })}
                  {(!selectedOrder.attachments || selectedOrder.attachments.length === 0) && (
                    <Grid size={12}>
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                        Nenhuma foto anexada.
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Grid>

              {/* Assinatura */}
              {selectedOrder.checklist?.client_signature_path && (
                <Grid size={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Assinatura do Cliente:</Typography>
                  <Box 
                    component="img" 
                    src={selectedOrder.checklist.client_signature_path.replace('/var/www/os_system/uploads/', '/os-uploads/')}
                    sx={{ maxHeight: 120, border: '1px solid #ddd', p: 1, borderRadius: 1 }}
                  />
                </Grid>
              )}
            </Grid>
          ) : (
            <Typography>Dados não encontrados.</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Box>
            {isEditing && (
              <Button 
                onClick={handleToggleEdit} 
                color="inherit"
                disabled={savingEdit}
              >
                Cancelar Edição
              </Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={handleCloseDetails} disabled={savingEdit}>Fechar</Button>
            {isEditing && (
              <Button 
                onClick={handleSaveEdit} 
                variant="contained" 
                startIcon={savingEdit ? <CircularProgress size={16} /> : <Save size={18} />}
                disabled={savingEdit}
              >
                Salvar Alterações
              </Button>
            )}
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OSDashboard;

