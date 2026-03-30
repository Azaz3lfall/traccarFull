import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
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
  Autocomplete
} from '@mui/material';
import {
  AddCircleOutline as AddCircleOutlineIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  FileDownload as FileDownloadIcon,
  CalendarToday as CalendarIcon,
  Speed as SpeedIcon,
  LocalGasStation as GasIcon,
  AttachMoney as MoneyIcon,
  Store as StoreIcon,
  LocationCity as CityIcon
} from '@mui/icons-material';
import { X, Plus, Fuel } from 'lucide-react';
import { InputAdornment } from '@mui/material';
import { formatDate, formatCurrency, isValidFloat } from '../utils/formatters';
import { exportData } from '../utils/exportUtils';

const RefuelsTab = ({
  vehicles,
  allRefuels,
  newStandaloneRefuel,
  setNewStandaloneRefuel,
  refuelFiles,
  handleFileChange,
  selectedRefuel,
  refuelEditData,
  setRefuelEditData,
  editRefuelModalOpen,
  setEditRefuelModalOpen,
  deleteRefuelDialogOpen,
  setDeleteRefuelDialogOpen,
  selectedRefuelToDelete,
  loadingRefuels,
  handleCreateRefuel,
  handleEditRefuel,
  handleSaveRefuelEdit,
  handleDeleteRefuel,
  handleConfirmDeleteRefuel
}) => {
  // Estados para upload de fotos na edição
  const [editRefuelFiles, setEditRefuelFiles] = useState({ foto_bomba: null, foto_odometro: null });
  
  // Estado para modal de visualização de fotos
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  // Debug dos dados chegam
  console.log('🔍 RefuelsTab - allRefuels (COMPLETO):', allRefuels);
  console.log('🔍 RefuelsTab - vehicles (COMPLETO):', vehicles);
  if (allRefuels && allRefuels.length > 0) {
    console.log('🔍 RefuelsTab - Primeiro refuel STRUCTURE:', Object.keys(allRefuels[0]));
    console.log('🔍 RefuelsTab - Primeiro refuel VALUES:', allRefuels[0]);
    console.log('🔍 RefuelsTab - Campos específicos testados:', {
      posto_nome: allRefuels[0].posto_nome,
      cidade: allRefuels[0].cidade, 
      liters_filled: allRefuels[0].liters_filled,
      odometer: allRefuels[0].odometer
    });
  }
  
  // Verificar se vehicles tem dados válidos
  if (vehicles && vehicles.length > 0) {
    console.log('🔍 RefuelsTab - Primeiro vehicle ID:', vehicles[0].id, 'Name:', vehicles[0].name);
  }

  // Função auxiliar para testar endpoint
  const testEndpoint = async (url) => {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        credentials: 'include'
      });
      return {
        url,
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      return {
        url,
        status: 'ERROR',
        ok: false,
        error: error.message
      };
    }
  };

  // Função para carregar imagem via API do backend de gestão
  const loadImageWithAuth = async (filename) => {
    try {
      console.log('🖼️ LOAD IMAGE - Iniciando carregamento:', filename);
      
      // Verificar se é uma imagem base64 (data:image/...)
      if (filename && filename.startsWith('data:image/')) {
        console.log('🖼️ LOAD IMAGE - Imagem base64 detectada, retornando diretamente');
        return filename; // Retorna a string base64 diretamente
      }
      
      // Extrair apenas o nome do arquivo (sem o caminho /uploads/)
      const cleanFilename = filename.replace(/^\/?uploads\//, '');
      
      console.log('🖼️ LOAD IMAGE - Arquivo limpo:', cleanFilename);
      
      // Lista de URLs para tentar (incluindo o caminho original)
      const urlsToTry = [
        `/gestao/abastecimentos/image/${cleanFilename}`,  // API específica
        `/gestao/abastecimentos/image?filename=${encodeURIComponent(cleanFilename)}`, // API com query param
        `/gestao/files/${cleanFilename}`,                 // Caminho files
        `/gestao/uploads/${cleanFilename}`,               // Caminho gestão
        `/gestao/static/${cleanFilename}`,                // Caminho static
        `/gestao/upload/${cleanFilename}`,                // Endpoint de upload
        `/gestao/image/${cleanFilename}`,                 // Endpoint genérico de imagem
        filename,                                         // Caminho original completo
        `/gestao${filename}`,                             // Caminho original com prefixo gestao
        `/uploads/${cleanFilename}`                       // Caminho direto (último, pois sabemos que falha)
      ];
      
      for (const imageUrl of urlsToTry) {
        try {
          console.log(`🖼️ LOAD IMAGE - Tentando URL: ${imageUrl}`);
          
          const response = await fetch(imageUrl, {
            credentials: 'include',
            headers: { 
              'Accept': 'image/*',
              'Cache-Control': 'no-cache'
            }
          });
          
          console.log(`🖼️ LOAD IMAGE - Resposta ${imageUrl}: ${response.status} ${response.statusText}`);
          
          if (response.ok) {
            const blob = await response.blob();
            console.log(`🖼️ LOAD IMAGE - Sucesso! Blob size: ${blob.size} bytes`);
            
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                console.log('🖼️ LOAD IMAGE - Imagem convertida para base64');
                resolve(reader.result);
              };
              reader.readAsDataURL(blob);
            });
          }
        } catch (urlError) {
          console.log(`🖼️ LOAD IMAGE - Erro ao tentar ${imageUrl}:`, urlError.message);
        }
      }
      
      console.log('🖼️ LOAD IMAGE - Todas as tentativas falharam');
      return null;
    } catch (error) {
      console.error('🖼️ LOAD IMAGE - Erro geral:', error);
      return null;
    }
  };

  // Função para abrir modal de fotos
  const handleOpenPhotoModal = async (refuel) => {
    console.log('🖼️ MODAL - Abrindo modal para refuel:', refuel.id);
    console.log('🖼️ MODAL - Foto bomba:', refuel.foto_bomba);
    console.log('🖼️ MODAL - Foto odômetro:', refuel.foto_odometro);
    
    setLoadingPhotos(true);
    setPhotoModalOpen(true);
    
    const photos = [];
    
    if (refuel.foto_bomba) {
      console.log('🖼️ MODAL - Carregando foto da bomba...');
      const imageData = await loadImageWithAuth(refuel.foto_bomba);
      
      // Tentar diferentes fallback URLs
      const fallbackUrls = [
        refuel.foto_bomba.startsWith('/') ? refuel.foto_bomba : `/${refuel.foto_bomba}`,
        `/gestao${refuel.foto_bomba}`,
        `/gestao/uploads/${refuel.foto_bomba.replace(/^\/?uploads\//, '')}`,
        `/gestao/files/${refuel.foto_bomba.replace(/^\/?uploads\//, '')}`
      ];
      
      photos.push({
        url: imageData || fallbackUrls[0],
        fallbackUrls: fallbackUrls,
        title: 'Foto da Bomba',
        type: 'bomba',
        filename: refuel.foto_bomba,
        loaded: !!imageData
      });
    }
    
    if (refuel.foto_odometro) {
      console.log('🖼️ MODAL - Carregando foto do odômetro...');
      const imageData = await loadImageWithAuth(refuel.foto_odometro);
      
      // Tentar diferentes fallback URLs
      const fallbackUrls = [
        refuel.foto_odometro.startsWith('/') ? refuel.foto_odometro : `/${refuel.foto_odometro}`,
        `/gestao${refuel.foto_odometro}`,
        `/gestao/uploads/${refuel.foto_odometro.replace(/^\/?uploads\//, '')}`,
        `/gestao/files/${refuel.foto_odometro.replace(/^\/?uploads\//, '')}`
      ];
      
      photos.push({
        url: imageData || fallbackUrls[0],
        fallbackUrls: fallbackUrls,
        title: 'Foto do Odômetro',
        type: 'odometro',
        filename: refuel.foto_odometro,
        loaded: !!imageData
      });
    }
    
    console.log('🖼️ MODAL - Fotos processadas:', photos);
    setSelectedPhotos(photos);
    setLoadingPhotos(false);
  };

  // Função para exportar abastecimentos
  const handleExportRefuels = (format = 'excel') => {
    const columns = [
      { field: 'vehicle_name', headerName: 'Veículo' },
      { field: 'refuel_date', headerName: 'Data' },
      { field: 'odometer', headerName: 'Odômetro (km)' },
      { field: 'liters_filled', headerName: 'Litros' },
      { field: 'total_cost', headerName: 'Valor' },
      { field: 'posto_nome', headerName: 'Posto' },
      { field: 'cidade', headerName: 'Cidade' },
      { field: 'is_full_tank', headerName: 'Tanque Cheio' }
    ];

    const sortedRefuels = [...allRefuels.filter(r => r && typeof r === 'object')].sort(
      (a, b) => new Date(b.refuel_date || 0).getTime() - new Date(a.refuel_date || 0).getTime()
    );
    const data = sortedRefuels.map(refuel => ({
      ...refuel,
      vehicle_name: vehicles.find(v => v.id === refuel.vehicle_id)?.name || 'N/A',
      refuel_date: formatDate(refuel.refuel_date),
      total_cost: formatCurrency(refuel.total_cost),
      is_full_tank: refuel.is_full_tank ? 'Sim' : 'Não'
    }));

    exportData(data, format, columns, `abastecimentos_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`);
  };

  // Função para lidar com upload de arquivos na edição
  const handleEditFileChange = (e) => {
    const { name, files } = e.target;
    setEditRefuelFiles(prev => ({
      ...prev,
      [name]: files[0] || null
    }));
  };
  return (
    <Box>
      <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
          <Fuel size={24} color="#3f51b5" />
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Registrar Abastecimento</Typography>
        </Box>
        
        <Box component="form" onSubmit={handleCreateRefuel}>
          <Grid container spacing={3}>
            {/* Linha 1: Identificação */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Autocomplete
                fullWidth
                size="small"
                options={vehicles}
                getOptionLabel={(option) => option.name || ''}
                value={vehicles.find(v => v.id === newStandaloneRefuel.vehicle_id) || null}
                onChange={(event, newValue) => {
                  setNewStandaloneRefuel(prev => ({ 
                    ...prev, 
                    vehicle_id: newValue ? newValue.id : '' 
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Veículo"
                    required
                    placeholder="Selecione o veículo"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <GasIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
                noOptionsText="Nenhum veículo encontrado"
                isOptionEqualToValue={(option, value) => option.id === value.id}
                componentsProps={{
                  popper: { style: { zIndex: 20001 } }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Data/Hora"
                type="datetime-local"
                value={newStandaloneRefuel.refuel_date}
                onChange={(e) => setNewStandaloneRefuel(prev => ({ ...prev, refuel_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Odômetro (km)"
                value={newStandaloneRefuel.odometer}
                onChange={(e) => setNewStandaloneRefuel(prev => ({ ...prev, odometer: e.target.value }))}
                error={!isValidFloat(newStandaloneRefuel.odometer)}
                helperText={!isValidFloat(newStandaloneRefuel.odometer) ? "Valor inválido" : ""}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SpeedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Linha 2: Valores e Local */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Litros"
                value={newStandaloneRefuel.liters_filled}
                onChange={(e) => setNewStandaloneRefuel(prev => ({ ...prev, liters_filled: e.target.value }))}
                error={!isValidFloat(newStandaloneRefuel.liters_filled)}
                required
                InputProps={{
                  endAdornment: <InputAdornment position="end">L</InputAdornment>,
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Valor Total"
                value={newStandaloneRefuel.total_cost}
                onChange={(e) => setNewStandaloneRefuel(prev => ({ ...prev, total_cost: e.target.value }))}
                error={!isValidFloat(newStandaloneRefuel.total_cost)}
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Nome do Posto"
                value={newStandaloneRefuel.posto_nome}
                onChange={(e) => setNewStandaloneRefuel(prev => ({ ...prev, posto_nome: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <StoreIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Cidade"
                value={newStandaloneRefuel.cidade}
                onChange={(e) => setNewStandaloneRefuel(prev => ({ ...prev, cidade: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CityIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Linha 3: Fotos e Opções */}
            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
              <Box sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={newStandaloneRefuel.is_full_tank}
                      onChange={(e) => setNewStandaloneRefuel(prev => ({ ...prev, is_full_tank: e.target.checked }))}
                    />
                  }
                  label="Tanque Cheio"
                />
              </Box>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 4, md: 5 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<ImageIcon />}
                fullWidth
                color={refuelFiles.foto_bomba ? "success" : "primary"}
                sx={{ height: '40px' }}
              >
                {refuelFiles.foto_bomba ? `Bomba: ${refuelFiles.foto_bomba.name.substring(0, 15)}...` : 'Foto da Bomba'}
                <input type="file" name="foto_bomba" accept="image/*" onChange={handleFileChange} hidden />
              </Button>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 4, md: 5 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<ImageIcon />}
                fullWidth
                color={refuelFiles.foto_odometro ? "success" : "primary"}
                sx={{ height: '40px' }}
              >
                {refuelFiles.foto_odometro ? `Odômetro: ${refuelFiles.foto_odometro.name.substring(0, 15)}...` : 'Foto do Odômetro'}
                <input type="file" name="foto_odometro" accept="image/*" onChange={handleFileChange} hidden />
              </Button>
            </Grid>

            {/* Linha 4: Ação */}
            <Grid size={{ xs: 12 }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<AddCircleOutlineIcon />}
                disabled={loadingRefuels}
                fullWidth
                size="large"
                sx={{ mt: 1, py: 1.5, fontWeight: 'bold' }}
              >
                {loadingRefuels ? <CircularProgress size={24} /> : 'Finalizar Registro de Abastecimento'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Lista de abastecimentos */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Histórico de Abastecimentos ({allRefuels.length})
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={() => handleExportRefuels('excel')}
              sx={{ mr: 1 }}
            >
              Excel
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={() => handleExportRefuels('pdf')}
              sx={{ mr: 1 }}
            >
              PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={() => handleExportRefuels('csv')}
            >
              CSV
            </Button>
          </Box>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Veículo</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Posto</TableCell>
                <TableCell>Cidade</TableCell>
                <TableCell>Hodômetro</TableCell>
                <TableCell>Litros</TableCell>
                <TableCell>Valor Total</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...allRefuels.filter(r => r && typeof r === 'object')]
                .sort((a, b) => new Date(b.refuel_date || 0).getTime() - new Date(a.refuel_date || 0).getTime())
                .map((refuel, index) => {
                console.log(`🔍 DEBUG - Refuel ${index}:`, refuel);
                console.log(`🔍 DEBUG - Vehicles disponíveis:`, vehicles.map(v => ({id: v.id, name: v.name})));
                
                // Buscar veículo de forma mais robusta
                let vehicleName = 'N/A';
                const vehicleId = refuel.vehicle_id;
                const matchingVehicle = vehicles.find(v => v.id === vehicleId);
                const directName = refuel.vehicle_name;
                
                if (matchingVehicle?.name) {
                  vehicleName = matchingVehicle.name;
                } else if (directName) {
                  vehicleName = directName;
                } else if (vehicleId) {
                  vehicleName = `Veículo ${vehicleId}`;
                }
                
                console.log(`🔍 DEBUG - Veículo ${vehicleId}: nome encontrado = ${vehicleName}`);
                console.log(`🔍 DEBUG - Posto: ${refuel.posto_nome || refuel.station_name}, Cidade: ${refuel.cidade || refuel.city}, Litros: ${refuel.liters_filled || refuel.liters}`);
                
                // Mapear dados da API de forma simplificada e direta
                console.log(`🔍 DEBUG RAW DATA Refuel ${index}:`, refuel);
                
                const posto = refuel.posto_nome || '-';
                const cidade = refuel.cidade || '-';
                const litros = refuel.liters_filled || '0';
                const hodometro = refuel.odometer || '-';
                
                console.log(`🔍 VALORES MAPEADOS para refuel ${index}:`, {posto, cidade, litros, hodometro});
                
                return (
                <TableRow key={refuel.id ?? `refuel-${index}`}>
                  <TableCell>{vehicleName}</TableCell>
                  <TableCell>{formatDate(refuel.refuel_date)}</TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {posto !== '-' ? posto : 'Sem posto'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {cidade !== '-' ? cidade : 'Sem cidade'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {hodometro !== '-' ? `${hodometro} km` : 'Sem odômetro'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {litros !== '0' && litros !== '-' ? `${litros} L` : litros}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatCurrency(refuel.total_cost || 0)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <IconButton
                        onClick={() => handleEditRefuel(refuel)}
                        color="primary"
                        size="small"
                        title="Editar"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteRefuel(refuel)}
                        color="error" 
                        size="small"
                        title="Excluir"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                      {(refuel.foto_bomba || refuel.foto_odometro) ? (
                        <Button
                          size="small"
                          startIcon={<ImageIcon />}
                          onClick={() => handleOpenPhotoModal(refuel)}
                          variant="outlined"
                          title="Ver Fotos"
                          sx={{ fontSize: '0.75rem', px: 1 }}
                        >
                          VER F
                        </Button>
                      ) : (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          Sem Fotos
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Modal para editar abastecimento */}
      <Dialog 
        open={editRefuelModalOpen} 
        onClose={() => setEditRefuelModalOpen(false)} 
        maxWidth="md" 
        fullWidth
        sx={{ zIndex: 11000 }}
      >
        <DialogTitle>Editar Abastecimento</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                fullWidth
                size="small"
                options={vehicles}
                getOptionLabel={(option) => option.name || ''}
                value={vehicles.find(v => v.id === refuelEditData.vehicle_id) || null}
                onChange={(event, newValue) => {
                  setRefuelEditData(prev => ({ 
                    ...prev, 
                    vehicle_id: newValue ? newValue.id : '' 
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Veículo"
                    required
                    placeholder="Digite para buscar..."
                  />
                )}
                noOptionsText="Nenhum veículo encontrado"
                isOptionEqualToValue={(option, value) => option.id === value.id}
                componentsProps={{
                  popper: {
                    style: { zIndex: 20001 }
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Data/Hora"
                type="datetime-local"
                value={refuelEditData.refuel_date}
                onChange={(e) => setRefuelEditData(prev => ({ ...prev, refuel_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Odômetro (km)"
                type="number"
                value={refuelEditData.odometer}
                onChange={(e) => setRefuelEditData(prev => ({ ...prev, odometer: e.target.value }))}
                inputProps={{ min: 0 }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Litros Abastecidos"
                type="number"
                value={refuelEditData.liters_filled}
                onChange={(e) => setRefuelEditData(prev => ({ ...prev, liters_filled: e.target.value }))}
                inputProps={{ min: 0, step: 0.1 }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Valor Total (R$)"
                type="number"
                value={refuelEditData.total_cost}
                onChange={(e) => setRefuelEditData(prev => ({ ...prev, total_cost: e.target.value }))}
                inputProps={{ min: 0, step: 0.01 }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nome do Posto"
                value={refuelEditData.posto_nome}
                onChange={(e) => setRefuelEditData(prev => ({ ...prev, posto_nome: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cidade"
                value={refuelEditData.cidade}
                onChange={(e) => setRefuelEditData(prev => ({ ...prev, cidade: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={refuelEditData.is_full_tank}
                    onChange={(e) => setRefuelEditData(prev => ({ ...prev, is_full_tank: e.target.checked }))}
                  />
                }
                label="Tanque Cheio"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<ImageIcon />}
                fullWidth
              >
                Foto da Bomba
                <input
                  type="file"
                  name="foto_bomba"
                  accept="image/*"
                  onChange={handleEditFileChange}
                  hidden
                />
              </Button>
              {editRefuelFiles.foto_bomba && (
                <Typography variant="caption" color="success">
                  {editRefuelFiles.foto_bomba.name}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<ImageIcon />}
                fullWidth
              >
                Foto do Odômetro
                <input
                  type="file"
                  name="foto_odometro"
                  accept="image/*"
                  onChange={handleEditFileChange}
                  hidden
                />
              </Button>
              {editRefuelFiles.foto_odometro && (
                <Typography variant="caption" color="success">
                  {editRefuelFiles.foto_odometro.name}
                </Typography>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditRefuelModalOpen(false)}>Cancelar</Button>
          <Button onClick={() => handleSaveRefuelEdit(editRefuelFiles)} variant="contained" disabled={loadingRefuels}>
            {loadingRefuels ? <CircularProgress size={20} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para confirmar exclusão */}
      <Dialog 
        open={deleteRefuelDialogOpen} 
        onClose={() => setDeleteRefuelDialogOpen(false)}
        sx={{ zIndex: 11000 }}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir este abastecimento? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteRefuelDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirmDeleteRefuel} variant="contained" color="error" disabled={loadingRefuels}>
            {loadingRefuels ? <CircularProgress size={20} /> : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para visualizar fotos */}
      <Dialog 
        open={photoModalOpen} 
        onClose={() => setPhotoModalOpen(false)} 
        maxWidth="md" 
        fullWidth
        sx={{ zIndex: 11000 }}
      >
        <DialogTitle>Fotos do Abastecimento</DialogTitle>
        <DialogContent>
          {loadingPhotos ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Carregando fotos...</Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {selectedPhotos.map((photo, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                      {photo.title}
                    </Typography>
                    {photo.loaded ? (
                      <img
                        src={photo.url}
                        alt={photo.title}
                        style={{
                          width: '100%',
                          maxHeight: '400px',
                          objectFit: 'contain',
                          border: '1px solid #ddd',
                          borderRadius: '8px'
                        }}
                      />
                    ) : (
                      <Box sx={{ 
                        border: '1px solid #ddd', 
                        borderRadius: '8px', 
                        p: 2, 
                        minHeight: '200px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column'
                      }}>
                        <Typography variant="body2" color="error" gutterBottom>
                          Imagem não disponível
                        </Typography>
                        <Typography variant="caption" color="text.secondary" gutterBottom>
                          Arquivo: {photo.filename}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                          O servidor não está configurado para servir arquivos estáticos
                        </Typography>
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={async () => {
                            const cleanFilename = photo.filename.replace(/^\/?uploads\//, '');
                            const urlsToTest = [
                              `/gestao/abastecimentos/image/${cleanFilename}`,
                              `/gestao/abastecimentos/image?filename=${encodeURIComponent(cleanFilename)}`,
                              `/gestao/files/${cleanFilename}`,
                              `/gestao/uploads/${cleanFilename}`,
                              `/gestao/static/${cleanFilename}`,
                              `/gestao/upload/${cleanFilename}`,
                              `/gestao/image/${cleanFilename}`,
                              photo.filename,
                              `/gestao${photo.filename}`,
                              `/uploads/${cleanFilename}`
                            ];
                            
                            console.log('🧪 TESTE - Testando todos os endpoints para:', cleanFilename);
                            for (const url of urlsToTest) {
                              const result = await testEndpoint(url);
                              console.log('🧪 TESTE - Resultado:', result);
                            }
                          }}
                          sx={{ mb: 2 }}
                        >
                          Testar Todos os Endpoints
                        </Button>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              const cleanFilename = photo.filename.replace(/^\/?uploads\//, '');
                              const apiUrl = `/gestao/abastecimentos/image/${cleanFilename}`;
                              console.log('🔗 Tentando abrir API:', apiUrl);
                              window.open(apiUrl, '_blank');
                            }}
                          >
                            API Gestão
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              const directUrl = photo.filename.startsWith('/') ? photo.filename : `/${photo.filename}`;
                              console.log('🔗 Tentando abrir URL direta:', directUrl);
                              window.open(directUrl, '_blank');
                            }}
                          >
                            URL Original
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              const gestaoUrl = `/gestao${photo.filename}`;
                              console.log('🔗 Tentando abrir URL gestão:', gestaoUrl);
                              window.open(gestaoUrl, '_blank');
                            }}
                          >
                            URL Gestão
                          </Button>
                          {photo.fallbackUrls && photo.fallbackUrls.map((fallbackUrl, index) => (
                            <Button
                              key={index}
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                console.log('🔗 Tentando fallback URL:', fallbackUrl);
                                window.open(fallbackUrl, '_blank');
                              }}
                            >
                              Fallback {index + 1}
                            </Button>
                          ))}
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, fontFamily: 'monospace', wordBreak: 'break-all', textAlign: 'center' }}>
                          {photo.filename}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPhotoModalOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RefuelsTab;


