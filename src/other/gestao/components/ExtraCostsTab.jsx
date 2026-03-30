import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete
} from '@mui/material';
import {
  AddCircleOutline as AddCircleOutlineIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  Image as ImageIcon,
  DirectionsCar as CarIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
  Description as DescriptionIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import { InputAdornment } from '@mui/material';
import { DollarSign } from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/formatters';
import { COST_TYPES } from '../constants';
import { useThemeColors } from '../../../common/components/ThemeProvider';

const ExtraCostsTab = ({
  vehicles,
  drivers,
  allExtraCosts,
  newExtraCostForm,
  setNewExtraCostForm,
  selectedExtraCost,
  editExtraCostModalOpen,
  setEditExtraCostModalOpen,
  deleteExtraCostDialogOpen,
  setDeleteExtraCostDialogOpen,
  loadingExtraCosts,
  handleCreateExtraCost,
  handleEditExtraCost,
  handleSaveExtraCostEdit,
  handleDeleteExtraCost,
  handleConfirmDeleteExtraCost
}) => {
  const colors = useThemeColors();
  const [filterType, setFilterType] = React.useState('all');

  // Garantir que vehicles e drivers sejam sempre arrays válidos
  const safeVehicles = React.useMemo(() => Array.isArray(vehicles) ? vehicles : [], [vehicles]);
  const safeDrivers = React.useMemo(() => Array.isArray(drivers) ? drivers : [], [drivers]);
  const safeExtraCosts = React.useMemo(() => Array.isArray(allExtraCosts) ? allExtraCosts : [], [allExtraCosts]);

  // Debug para verificar dados recebidos
  React.useEffect(() => {
    console.log('🔍 ExtraCostsTab - Dados recebidos:', {
      vehicles: safeVehicles.length,
      drivers: safeDrivers.length,
      extraCosts: safeExtraCosts.length,
      vehiclesSample: safeVehicles.slice(0, 2),
      driversSample: safeDrivers.slice(0, 2)
    });
  }, [safeVehicles, safeDrivers, safeExtraCosts]);

  const isDriverCostType = (tipo) => ['Salário', 'Comissão'].includes(tipo);

  // Filtrar custos baseado no tipo selecionado
  const filteredCosts = React.useMemo(() => {
    if (filterType === 'all') return safeExtraCosts;
    if (filterType === 'avulsos') return safeExtraCosts.filter(cost => !cost.viagem_id);
    if (filterType === 'viagem') return safeExtraCosts.filter(cost => cost.viagem_id);
    if (filterType === 'motorista') return safeExtraCosts.filter(cost => isDriverCostType(cost.tipo_custo));
    return safeExtraCosts;
  }, [safeExtraCosts, filterType]);
  return (
    <Box>
      {/* Formulário para adicionar custo extra */}
      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
          <DollarSign size={24} color="#3f51b5" />
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Registrar Custo Extra</Typography>
        </Box>
        <Box component="form" onSubmit={handleCreateExtraCost} sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Autocomplete
                fullWidth
                size="small"
                options={safeDrivers}
                getOptionLabel={(option) => option?.name || ''}
                value={safeDrivers.find(d => d?.id === newExtraCostForm.driver_id) || null}
                onChange={(event, newValue) => {
                  setNewExtraCostForm(prev => ({ 
                    ...prev, 
                    driver_id: newValue ? newValue.id : '' 
                  }));
                }}
                componentsProps={{
                  popper: {
                    style: { zIndex: 20001 },
                    sx: {
                      '& .MuiAutocomplete-paper': {
                        backgroundColor: colors.surface,
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                      },
                      '& .MuiAutocomplete-option': {
                        color: colors.text,
                        '&:hover': {
                          backgroundColor: colors.hover,
                        },
                        '&[aria-selected="true"]': {
                          backgroundColor: `${colors.primary}20`,
                          color: colors.primary,
                        },
                      },
                    },
                  },
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Motorista"
                    placeholder={safeDrivers.length === 0 ? "Carregando motoristas..." : "Selecione o motorista"}
                    required={isDriverCostType(newExtraCostForm.tipo_custo)}
                    error={safeDrivers.length === 0 || (isDriverCostType(newExtraCostForm.tipo_custo) && !newExtraCostForm.driver_id)}
                    helperText={safeDrivers.length === 0 ? "Nenhum motorista disponível" : (isDriverCostType(newExtraCostForm.tipo_custo) && !newExtraCostForm.driver_id ? "Obrigatório para Salário e Comissão" : "")}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: colors.secondary,
                        color: colors.text,
                        '& fieldset': {
                          borderColor: colors.border,
                        },
                        '&:hover fieldset': {
                          borderColor: colors.primary,
                        },
                        '&.Mui-focused fieldset': {
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
                )}
                renderOption={(props, option) => {
                  const { key, ...restProps } = props;
                  return (
                    <li key={key} {...restProps} style={{ color: colors.text }}>
                      {option?.name || ''}
                    </li>
                  );
                }}
                noOptionsText={safeDrivers.length === 0 ? "Carregando motoristas..." : "Nenhum motorista encontrado"}
                isOptionEqualToValue={(option, value) => option?.id === value?.id}
                disabled={safeDrivers.length === 0}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Autocomplete
                fullWidth
                size="small"
                options={safeVehicles}
                getOptionLabel={(option) => option?.name || ''}
                value={safeVehicles.find(v => v?.id === newExtraCostForm.vehicle_id) || null}
                onChange={(event, newValue) => {
                  setNewExtraCostForm(prev => ({ 
                    ...prev, 
                    vehicle_id: newValue ? newValue.id : '' 
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Veículo"
                    placeholder={safeVehicles.length === 0 ? "Carregando veículos..." : "Selecione o veículo"}
                    error={safeVehicles.length === 0}
                    helperText={safeVehicles.length === 0 ? "Nenhum veículo disponível" : ""}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <CarIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
                noOptionsText={safeVehicles.length === 0 ? "Carregando veículos..." : "Nenhum veículo encontrado"}
                isOptionEqualToValue={(option, value) => option?.id === value?.id}
                disabled={safeVehicles.length === 0}
                componentsProps={{
                  popper: { style: { zIndex: 20001 } }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Tipo de Custo"
                value={newExtraCostForm.tipo_custo}
                onChange={(e) => setNewExtraCostForm(prev => ({ ...prev, tipo_custo: e.target.value }))}
                SelectProps={{ native: true }}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CategoryIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              >
                <option value="">Selecione</option>
                {COST_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Valor (R$)"
                type="number"
                value={newExtraCostForm.valor}
                onChange={(e) => setNewExtraCostForm(prev => ({ ...prev, valor: e.target.value }))}
                inputProps={{ min: 0, step: 0.01 }}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MoneyIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Descrição"
                value={newExtraCostForm.descricao}
                onChange={(e) => setNewExtraCostForm(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder={newExtraCostForm.tipo_custo === 'Salário' ? 'Ex: Salário Janeiro 2025' : newExtraCostForm.tipo_custo === 'Comissão' ? 'Ex: Comissão viagem X' : undefined}
                helperText={newExtraCostForm.tipo_custo === 'Salário' ? 'Ex: Salário Janeiro 2025, 13º parcela' : newExtraCostForm.tipo_custo === 'Comissão' ? 'Ex: Comissão viagem X, Comissão mês/2025' : undefined}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <DescriptionIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<ImageIcon />}
                fullWidth
                color={newExtraCostForm.foto ? "success" : "primary"}
                sx={{ height: '40px' }}
              >
                {newExtraCostForm.foto ? `Foto: ${newExtraCostForm.foto.name.substring(0, 20)}...` : 'Foto do Custo (Opcional)'}
                <input
                  id="foto-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewExtraCostForm(prev => ({ 
                    ...prev, 
                    foto: e.target.files[0] 
                  }))}
                  hidden
                />
              </Button>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<AddCircleOutlineIcon />}
                disabled={loadingExtraCosts}
                fullWidth
                size="large"
                sx={{ mt: 1, py: 1.5, fontWeight: 'bold' }}
              >
                {loadingExtraCosts ? <CircularProgress size={24} /> : 'Finalizar Registro de Custo Extra'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Lista de custos extras */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Custos Extras e Avulsos ({filteredCosts.length} de {safeExtraCosts.length})
            </Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filtrar por tipo</InputLabel>
            <Select
              value={filterType}
              label="Filtrar por tipo"
              onChange={(e) => setFilterType(e.target.value)}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="avulsos">Custos Avulsos</MenuItem>
              <MenuItem value="viagem">Custos de Viagem</MenuItem>
              <MenuItem value="motorista">Por motorista</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><CarIcon fontSize="small" /> Veículo</Box></TableCell>
                <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><PersonIcon fontSize="small" /> Motorista</Box></TableCell>
                <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><CategoryIcon fontSize="small" /> Tipo</Box></TableCell>
                <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><DescriptionIcon fontSize="small" /> Descrição</Box></TableCell>
                <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><MoneyIcon fontSize="small" /> Valor</Box></TableCell>
                <TableCell>Origem</TableCell>
                <TableCell>Viagem</TableCell>
                <TableCell><Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><CalendarIcon fontSize="small" /> Data</Box></TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCosts.map((cost) => (
                <TableRow key={cost.id}>
                  <TableCell>
                    {cost.vehicle_name || safeVehicles.find(v => v?.id === cost.vehicle_id)?.name || '-'}
                  </TableCell>
                  <TableCell>
                    {cost.driver_name || safeDrivers.find(d => d?.id === cost.driver_id)?.name || '-'}
                  </TableCell>
                  <TableCell>{cost.tipo_custo}</TableCell>
                  <TableCell>{cost.descricao}</TableCell>
                  <TableCell>{formatCurrency(cost.valor)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={cost.tipo_origem || (cost.viagem_id ? 'Custo de Viagem' : 'Custo Avulso')} 
                      color={cost.viagem_id ? 'primary' : 'secondary'} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    {cost.viagem_id ? (
                      <Typography variant="body2" color="text.secondary">
                        {cost.start_city && cost.end_city ? `${cost.start_city} → ${cost.end_city}` : `Viagem #${cost.viagem_id}`}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(cost.data_custo || cost.created_at)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <IconButton
                        onClick={() => handleEditExtraCost(cost)}
                        color="primary"
                        size="small"
                        title="Editar"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteExtraCost(cost)}
                        color="error"
                        size="small"
                        title="Excluir"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                      {cost.foto && (
                        <IconButton
                          onClick={() => {
                            // TODO: Implementar visualização de foto
                          }}
                          color="info"
                          size="small"
                          title="Ver Foto"
                        >
                          <ImageIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Modal para editar custo extra */}
      <Dialog 
        open={editExtraCostModalOpen} 
        onClose={() => setEditExtraCostModalOpen(false)}
        sx={{ zIndex: 11000 }}
      >
        <DialogTitle>Editar Custo Extra</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                fullWidth
                size="small"
                options={safeDrivers}
                getOptionLabel={(option) => option?.name || ''}
                value={safeDrivers.find(d => d?.id === selectedExtraCost?.driver_id) || null}
                onChange={(event, newValue) => {
                  const updatedData = { 
                    ...selectedExtraCost, 
                    driver_id: newValue ? newValue.id : '' 
                  };
                  handleSaveExtraCostEdit(updatedData);
                }}
                componentsProps={{
                  popper: {
                    style: { zIndex: 20001 },
                    sx: {
                      '& .MuiAutocomplete-paper': {
                        backgroundColor: colors.surface,
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                      },
                      '& .MuiAutocomplete-option': {
                        color: colors.text,
                        '&:hover': {
                          backgroundColor: colors.hover,
                        },
                        '&[aria-selected="true"]': {
                          backgroundColor: `${colors.primary}20`,
                          color: colors.primary,
                        },
                      },
                    },
                  },
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Motorista"
                    placeholder={safeDrivers.length === 0 ? "Carregando motoristas..." : "Selecione o motorista"}
                    required={selectedExtraCost && isDriverCostType(selectedExtraCost.tipo_custo)}
                    error={selectedExtraCost && isDriverCostType(selectedExtraCost.tipo_custo) && !selectedExtraCost.driver_id}
                    helperText={selectedExtraCost && isDriverCostType(selectedExtraCost.tipo_custo) && !selectedExtraCost.driver_id ? "Obrigatório para Salário e Comissão" : ""}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: colors.secondary,
                        color: colors.text,
                        '& fieldset': {
                          borderColor: colors.border,
                        },
                        '&:hover fieldset': {
                          borderColor: colors.primary,
                        },
                        '&.Mui-focused fieldset': {
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
                )}
                renderOption={(props, option) => {
                  const { key, ...restProps } = props;
                  return (
                    <li key={key} {...restProps} style={{ color: colors.text }}>
                      {option?.name || ''}
                    </li>
                  );
                }}
                noOptionsText={safeDrivers.length === 0 ? "Carregando motoristas..." : "Nenhum motorista encontrado"}
                isOptionEqualToValue={(option, value) => option?.id === value?.id}
                disabled={safeDrivers.length === 0}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                fullWidth
                size="small"
                options={safeVehicles}
                getOptionLabel={(option) => option?.name || ''}
                value={safeVehicles.find(v => v?.id === selectedExtraCost?.vehicle_id) || null}
                onChange={(event, newValue) => {
                  const updatedData = { 
                    ...selectedExtraCost, 
                    vehicle_id: newValue ? newValue.id : '' 
                  };
                  handleSaveExtraCostEdit(updatedData);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Veículo"
                    placeholder={safeVehicles.length === 0 ? "Carregando veículos..." : "Selecione o veículo"}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <CarIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
                noOptionsText={safeVehicles.length === 0 ? "Carregando veículos..." : "Nenhum veículo encontrado"}
                isOptionEqualToValue={(option, value) => option?.id === value?.id}
                disabled={safeVehicles.length === 0}
                componentsProps={{
                  popper: { style: { zIndex: 20001 } }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="Tipo de Custo"
                value={selectedExtraCost?.tipo_custo || ''}
                onChange={(e) => {
                  const updatedData = { ...selectedExtraCost, tipo_custo: e.target.value };
                  handleSaveExtraCostEdit(updatedData);
                }}
                SelectProps={{ native: true }}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CategoryIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              >
                <option value="">Selecione</option>
                {COST_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Valor (R$)"
                type="number"
                value={selectedExtraCost?.valor || ''}
                onChange={(e) => {
                  const updatedData = { ...selectedExtraCost, valor: e.target.value };
                  handleSaveExtraCostEdit(updatedData);
                }}
                inputProps={{ min: 0, step: 0.01 }}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MoneyIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Descrição"
                value={selectedExtraCost?.descricao || ''}
                onChange={(e) => {
                  const updatedData = { ...selectedExtraCost, descricao: e.target.value };
                  handleSaveExtraCostEdit(updatedData);
                }}
                placeholder={selectedExtraCost?.tipo_custo === 'Salário' ? 'Ex: Salário Janeiro 2025' : selectedExtraCost?.tipo_custo === 'Comissão' ? 'Ex: Comissão viagem X' : undefined}
                helperText={selectedExtraCost?.tipo_custo === 'Salário' ? 'Ex: Salário Janeiro 2025, 13º parcela' : selectedExtraCost?.tipo_custo === 'Comissão' ? 'Ex: Comissão viagem X, Comissão mês/2025' : undefined}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <DescriptionIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditExtraCostModalOpen(false)}>Cancelar</Button>
          <Button onClick={() => setEditExtraCostModalOpen(false)} variant="contained" disabled={loadingExtraCosts}>
            {loadingExtraCosts ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para confirmar exclusão */}
      <Dialog 
        open={deleteExtraCostDialogOpen} 
        onClose={() => setDeleteExtraCostDialogOpen(false)}
        sx={{ zIndex: 11000 }}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir este custo extra? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteExtraCostDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirmDeleteExtraCost} variant="contained" color="error" disabled={loadingExtraCosts}>
            {loadingExtraCosts ? <CircularProgress size={20} /> : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExtraCostsTab;
