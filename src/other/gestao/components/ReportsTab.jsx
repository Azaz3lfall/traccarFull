import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Tabs,
  Tab,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Autocomplete
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  FileDownload as FileDownloadIcon,
  DirectionsCar as DirectionsCarIcon,
  AttachMoney as AttachMoneyIcon,
  LocalGasStation as LocalGasStationIcon,
  Photo as PhotoIcon,
  Build as BuildIcon
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDate, formatCurrency, safeToFixed } from '../utils/formatters';
import { REPORT_PERIODS } from '../constants';
import { useReportExport } from '../hooks/useReportExport';
import { usePhotoModal } from '../hooks/usePhotoModal';
import SummaryCards from './common/SummaryCards';
import ReportTable from './common/ReportTable';
import PhotoModal from './common/PhotoModal';
import MultiPhotoModal from './common/MultiPhotoModal';

const ReportsTab = ({
  vehicles,
  drivers,
  reportPeriod,
  setReportPeriod,
  reportVehicle,
  setReportVehicle,
  reportDriver,
  setReportDriver,
  loadingReports,
  tripReport,
  extraCostReport,
  averageConsumption,
  categoryCostReport,
  handleGenerateReport,
  handleExportReport,
  // Dados específicos para relatório de consumo
  refuelingReportFilter,
  setRefuelingReportFilter,
  refuelingReportTotals,
  refuelingDistanceReport,
  loadingRefuelingReport,
  totalRefuelingCost,
  refuelingCostFilter,
  setRefuelingCostFilter,
  handleGenerateRefuelingReport,
  handleExportRefuelingReport,
  allMaintenances = []
}) => {
  const [reportType, setReportType] = useState('viagens'); // 'viagens', 'custos', 'consumo', 'manutencoes'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Estados para modais de foto
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [multiPhotoModalOpen, setMultiPhotoModalOpen] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  
  const safeDrivers = Array.isArray(drivers) ? drivers : [];

  // Ref para garantir sincronização dos filtros
  const filtersRef = useRef({ reportVehicle, reportDriver, reportPeriod, startDate, endDate });
  
  // Atualizar ref quando os filtros mudarem
  useEffect(() => {
    filtersRef.current = { reportVehicle, reportDriver, reportPeriod, startDate, endDate };
  }, [reportVehicle, reportDriver, reportPeriod, startDate, endDate]);
  
  // Debug: Log dos valores atuais dos filtros
  useEffect(() => {
    console.log('🔍 ReportsTab - Estado dos filtros:', {
      reportType,
      reportPeriod,
      reportVehicle,
      reportVehicleType: typeof reportVehicle,
      vehiclesLength: vehicles?.length || 0,
      startDate,
      endDate
    });
  }, [reportType, reportPeriod, reportVehicle, startDate, endDate, vehicles]);
  
  // Hooks customizados
  const { exportSpecificReport } = useReportExport(vehicles);

  // Função para filtrar dados por veículo no frontend
  const filterByVehicle = (data) => {
    if (!data || !Array.isArray(data)) return [];
    if (reportVehicle === 'all' || !reportVehicle) return data;
    const vehicleIdStr = String(reportVehicle);
    return data.filter(item => String(item.vehicle_id) === vehicleIdStr);
  };

  // Função para filtrar custos por motorista
  const filterByDriver = (data) => {
    if (!data || !Array.isArray(data)) return [];
    if (reportDriver === 'all' || !reportDriver) return data;
    const driverIdStr = String(reportDriver);
    return data.filter(item => item.driver_id && String(item.driver_id) === driverIdStr);
  };

  // Helper para obter intervalo de datas conforme REPORT_PERIODS
  const getDateRangeForPeriod = React.useCallback(() => {
    const now = new Date();
    let start, end;
    if (reportPeriod === REPORT_PERIODS.PERSONALIZADO && startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else if (reportPeriod === REPORT_PERIODS.SEMANAL) {
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      start = new Date(now.getFullYear(), now.getMonth(), diff);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (reportPeriod === REPORT_PERIODS.ANUAL) {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (reportPeriod === REPORT_PERIODS.MES_ANTERIOR) {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else {
      // MENSAL (default)
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    return { start, end };
  }, [reportPeriod, startDate, endDate]);

  // Aplicar filtros aos dados
  const filteredTripReport = filterByVehicle(tripReport);
  const filteredExtraCostReport = React.useMemo(() => {
    const byVehicle = filterByVehicle(extraCostReport);
    return filterByDriver(byVehicle);
  }, [extraCostReport, reportVehicle, reportDriver]);
  const filteredRefuelingReport = filterByVehicle(refuelingDistanceReport);

  // Relatório de manutenções: filtrar por veículo e período (dados já em memória)
  const filteredMaintenanceReport = React.useMemo(() => {
    const byVehicle = filterByVehicle(allMaintenances || []);
    if (reportPeriod === REPORT_PERIODS.PERSONALIZADO && (!startDate || !endDate)) {
      return byVehicle;
    }
    const { start, end } = getDateRangeForPeriod();
    return byVehicle.filter((m) => {
      const mDate = new Date(m.maintenance_date);
      return mDate >= start && mDate <= end;
    });
  }, [allMaintenances, reportVehicle, reportPeriod, startDate, endDate, getDateRangeForPeriod]);

  // Função para carregar imagem via API do backend de gestão
  const loadImageWithAuth = async (filename) => {
    try {
      const cleanFilename = filename.replace(/^\/?uploads\//, '');
      const apiUrl = `/gestao/abastecimentos/image/${cleanFilename}`;
      
      const response = await fetch(apiUrl, {
        credentials: 'include',
        headers: { 'Accept': 'image/*' }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }
      
      // Fallback para URLs diretas
      const imageUrl = filename.startsWith('/') ? filename : `/gestao/uploads/${filename}`;
      try {
        const fallbackResponse = await fetch(imageUrl, {
          credentials: 'include',
          headers: { 'Accept': 'image/*' }
        });
        
        if (fallbackResponse.ok) {
          const blob = await fallbackResponse.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        }
      } catch (urlError) {
        console.log('Erro ao tentar fallback:', urlError.message);
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao carregar imagem:', error);
      return null;
    }
  };

  // Função para abrir modal de foto única (custos extras)
  const handleOpenPhotoModal = async (photoPath) => {
    if (!photoPath) return;
    
    // Tentar carregar a imagem com autenticação
    const imageData = await loadImageWithAuth(photoPath);
    
    // Se conseguir carregar com autenticação, usar os dados
    // Senão, usar o caminho original como fallback
    const finalPhotoPath = imageData || (photoPath.startsWith('/') ? photoPath : `/gestao/uploads/${photoPath}`);
    
    setSelectedPhoto(finalPhotoPath);
    setPhotoModalOpen(true);
  };

  const handleClosePhotoModal = () => {
    setPhotoModalOpen(false);
    setSelectedPhoto(null);
  };

  // Função para abrir modal de múltiplas fotos (abastecimentos)
  const handleOpenMultiPhotoModal = async (refuel) => {
    setLoadingPhotos(true);
    setMultiPhotoModalOpen(true);
    
    const photos = [];
    
    if (refuel.foto_bomba) {
      const imageData = await loadImageWithAuth(refuel.foto_bomba);
      const fallbackUrl = refuel.foto_bomba.startsWith('/') 
        ? refuel.foto_bomba 
        : `/gestao/uploads/${refuel.foto_bomba}`;
      
      photos.push({
        url: imageData || fallbackUrl,
        title: 'Foto da Bomba',
        type: 'bomba',
        filename: refuel.foto_bomba,
        loaded: !!imageData
      });
    }
    
    if (refuel.foto_odometro) {
      const imageData = await loadImageWithAuth(refuel.foto_odometro);
      const fallbackUrl = refuel.foto_odometro.startsWith('/') 
        ? refuel.foto_odometro 
        : `/gestao/uploads/${refuel.foto_odometro}`;
      
      photos.push({
        url: imageData || fallbackUrl,
        title: 'Foto do Odômetro',
        type: 'odometro',
        filename: refuel.foto_odometro,
        loaded: !!imageData
      });
    }
    
    setSelectedPhotos(photos);
    setLoadingPhotos(false);
  };

  const handleCloseMultiPhotoModal = () => {
    setMultiPhotoModalOpen(false);
    setSelectedPhotos([]);
  };

  // Função para limpar datas quando mudar o período
  const handlePeriodChange = (newPeriod) => {
    console.log('🔍 handlePeriodChange chamado com:', newPeriod);
    setReportPeriod(newPeriod);
    if (newPeriod !== REPORT_PERIODS.PERSONALIZADO) {
      setStartDate('');
      setEndDate('');
    }
    // Sincronizar com refuelingReportFilter quando o tipo é consumo
    if (reportType === 'consumo') {
      setRefuelingReportFilter(prev => ({
        ...prev,
        periodo: newPeriod,
        startDate: newPeriod !== REPORT_PERIODS.PERSONALIZADO ? '' : prev.startDate,
        endDate: newPeriod !== REPORT_PERIODS.PERSONALIZADO ? '' : prev.endDate
      }));
    }
  };

  // Função para sincronizar filtros quando mudar veículo
  const handleDriverChange = (newDriver) => {
    const driverValue = newDriver === 'all' ? 'all' : String(newDriver);
    setReportDriver(driverValue);
  };

  const handleVehicleChange = (newVehicle) => {
    console.log('🔍 handleVehicleChange chamado com:', newVehicle, 'tipo:', typeof newVehicle);
    const vehicleValue = newVehicle === 'all' ? 'all' : String(newVehicle);
    setReportVehicle(vehicleValue);
    // Sincronizar com refuelingReportFilter quando o tipo é consumo
    if (reportType === 'consumo') {
      setRefuelingReportFilter(prev => ({
        ...prev,
        vehicleId: vehicleValue
      }));
    }
  };

  // Função para sincronizar datas quando mudar período personalizado
  const handleStartDateChange = (newDate) => {
    setStartDate(newDate);
    if (reportType === 'consumo') {
      setRefuelingReportFilter(prev => ({
        ...prev,
        startDate: newDate
      }));
    }
  };

  const handleEndDateChange = (newDate) => {
    setEndDate(newDate);
    if (reportType === 'consumo') {
      setRefuelingReportFilter(prev => ({
        ...prev,
        endDate: newDate
      }));
    }
  };

  // Função wrapper para gerar relatório de consumo com sincronização
  const handleGenerateConsumptionReport = () => {
    // Usar valores do ref para garantir que estamos usando os valores mais recentes
    const currentFilters = filtersRef.current;
    
    // Sincronizar todos os filtros antes de gerar
    const updatedFilter = {
      vehicleId: currentFilters.reportVehicle,
      periodo: currentFilters.reportPeriod,
      startDate: currentFilters.reportPeriod === REPORT_PERIODS.PERSONALIZADO ? currentFilters.startDate : '',
      endDate: currentFilters.reportPeriod === REPORT_PERIODS.PERSONALIZADO ? currentFilters.endDate : ''
    };
    
    setRefuelingReportFilter(updatedFilter);
    
    // Aguardar um tick para garantir que o estado foi atualizado antes de chamar a função
    setTimeout(() => {
      handleGenerateRefuelingReport();
    }, 0);
  };

  // Sincronizar filtros quando mudar o tipo de relatório para consumo
  useEffect(() => {
    if (reportType === 'consumo') {
      setRefuelingReportFilter(prev => ({
        ...prev,
        vehicleId: reportVehicle,
        periodo: reportPeriod,
        startDate: reportPeriod === REPORT_PERIODS.PERSONALIZADO ? startDate : '',
        endDate: reportPeriod === REPORT_PERIODS.PERSONALIZADO ? endDate : ''
      }));
    }
  }, [reportType, reportVehicle, reportPeriod, startDate, endDate]);

  // Função para exportar relatório específico
  const handleExportSpecificReport = (type, format = 'pdf') => {
    const data = type === 'viagens' ? filteredTripReport : 
                 type === 'custos' ? filteredExtraCostReport : 
                 type === 'consumo' ? filteredRefuelingReport : 
                 type === 'manutencoes' ? filteredMaintenanceReport : 
                 [];
    exportSpecificReport(type, data, format);
  };
  return (
    <Box>
      {/* Seleção de tipo de relatório */}
      <Box sx={{ mb: 3 }}>
        <Tabs 
          value={reportType} 
          onChange={(e, newValue) => setReportType(newValue)}
          variant="fullWidth"
        >
          <Tab 
            icon={<DirectionsCarIcon />} 
            label="Viagens" 
            value="viagens"
            iconPosition="start"
          />
          <Tab 
            icon={<AttachMoneyIcon />} 
            label="Custos Extras" 
            value="custos"
            iconPosition="start"
          />
          <Tab 
            icon={<LocalGasStationIcon />} 
            label="Consumo" 
            value="consumo"
            iconPosition="start"
          />
          <Tab 
            icon={<BuildIcon />} 
            label="Manutenções" 
            value="manutencoes"
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Filtros únicos para todos os relatórios */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2, 
          mb: 3,
          position: 'relative',
          zIndex: 1,
          '& .MuiFormControl-root': {
            position: 'relative',
            zIndex: 2,
          },
          '& .MuiSelect-root': {
            position: 'relative',
            zIndex: 2,
          }
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          {reportType === 'viagens' ? 'Relatórios de Viagens' : 
           reportType === 'custos' ? 'Relatórios de Custos Extras' : 
           reportType === 'consumo' ? 'Relatórios de Consumo' : 
           'Relatórios de Manutenções'}
        </Typography>
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid item xs={12} sm={5} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Período</InputLabel>
              <Select
                value={reportPeriod || REPORT_PERIODS.MENSAL}
                label="Período"
                onChange={(e) => {
                  console.log('🔍 Select Período onChange - valor recebido:', e.target.value);
                  handlePeriodChange(e.target.value);
                }}
                MenuProps={{
                  disablePortal: false,
                  style: { zIndex: 10010 },
                  PaperProps: {
                    style: {
                      zIndex: 10010,
                      maxHeight: 300,
                    }
                  }
                }}
              >
                <MenuItem value={REPORT_PERIODS.MENSAL}>Mensal</MenuItem>
                <MenuItem value={REPORT_PERIODS.SEMANAL}>Semanal</MenuItem>
                <MenuItem value={REPORT_PERIODS.ANUAL}>Anual</MenuItem>
                <MenuItem value={REPORT_PERIODS.MES_ANTERIOR}>Mês Anterior</MenuItem>
                <MenuItem value={REPORT_PERIODS.PERSONALIZADO}>Personalizado</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Autocomplete
              fullWidth
              size="small"
              sx={{
                minWidth: 220,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'background.paper',
                  '&:hover': { backgroundColor: 'action.hover' },
                  '&.Mui-focused': { backgroundColor: 'background.paper' }
                }
              }}
              options={[
                { id: 'all', name: 'Todos os Veículos' },
                ...(vehicles && Array.isArray(vehicles) ? vehicles : [])
              ]}
              getOptionLabel={(option) => option?.name || ''}
              value={
                reportVehicle === 'all' || !reportVehicle
                  ? null
                  : (vehicles || []).find((v) => String(v.id) === String(reportVehicle)) || null
              }
              onChange={(event, newValue) => {
                handleVehicleChange(newValue?.id || 'all');
              }}
              isOptionEqualToValue={(option, value) =>
                String(option?.id) === String(value?.id)
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Veículo"
                  placeholder="Todos os Veículos (digite para pesquisar)"
                  sx={{ '& .MuiInputBase-root': { minHeight: 44, fontSize: '0.95rem' } }}
                />
              )}
              noOptionsText="Nenhum veículo encontrado"
              componentsProps={{
                popper: { style: { zIndex: 10010 } }
              }}
            />
          </Grid>
          {reportType === 'custos' && (
            <Grid item xs={12} sm={5} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Motorista</InputLabel>
                <Select
                  value={reportDriver || 'all'}
                  label="Motorista"
                  onChange={(e) => handleDriverChange(e.target.value)}
                  MenuProps={{
                    disablePortal: false,
                    style: { zIndex: 10010 },
                    PaperProps: {
                      style: {
                        zIndex: 10010,
                        maxHeight: 300,
                      }
                    }
                  }}
                >
                  <MenuItem value="all">Todos os Motoristas</MenuItem>
                  {safeDrivers.length > 0 ? safeDrivers.map((driver) => (
                    <MenuItem key={driver.id} value={String(driver.id)}>
                      {driver.name}
                    </MenuItem>
                  )) : (
                    <MenuItem disabled>Nenhum motorista disponível</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
          )}
          
          {/* Campos de data para período personalizado */}
          {reportPeriod === REPORT_PERIODS.PERSONALIZADO && (
            <>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Data Início"
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Data Fim"
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: startDate }}
                  error={!!(endDate && startDate && new Date(endDate) < new Date(startDate))}
                  helperText={endDate && startDate && new Date(endDate) < new Date(startDate) ? 'Data fim deve ser posterior à data início' : ''}
                />
              </Grid>
            </>
          )}
          <Grid item xs={12} sm={12} md={reportPeriod === REPORT_PERIODS.PERSONALIZADO ? 2 : 6}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<AssessmentIcon />}
                onClick={reportType === 'consumo' ? handleGenerateConsumptionReport : reportType === 'manutencoes' ? undefined : handleGenerateReport}
                disabled={reportType === 'manutencoes' || loadingReports || loadingRefuelingReport || (reportPeriod === REPORT_PERIODS.PERSONALIZADO && (!startDate || !endDate || new Date(endDate) < new Date(startDate)))}
                size="small"
                sx={{ minWidth: 140 }}
              >
                {(loadingReports || loadingRefuelingReport) ? <CircularProgress size={16} /> : 'GERAR RELATÓRIO'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={() => handleExportSpecificReport(reportType, 'pdf')}
              disabled={loadingReports}
                size="small"
                sx={{ minWidth: 80 }}
            >
                PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
                onClick={() => handleExportSpecificReport(reportType, 'excel')}
                disabled={loadingReports}
                size="small"
                sx={{ minWidth: 80 }}
              >
                EXCEL
            </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Renderizar relatório específico baseado na seleção */}
      {reportType === 'viagens' && (() => {
        return (
        <>
      {/* Cards de resumo */}
          <SummaryCards 
            cards={[
              {
                title: 'Total de Viagens',
                value: filteredTripReport.length,
                color: 'primary'
              },
              {
                title: 'Consumo Médio',
                value: `${safeToFixed(averageConsumption, 2)} km/L`,
                color: 'success.main'
              },
              {
                title: 'Total Custos Extras',
                value: formatCurrency(filteredExtraCostReport.reduce((sum, cost) => sum + cost.valor, 0)),
                color: 'warning.main'
              },
              {
                title: 'Total Abastecimentos',
                value: filteredTripReport.reduce((sum, trip) => sum + (trip.refuels || 0), 0),
                color: 'info.main'
              }
            ]}
          />

      {/* Gráfico de custos por categoria */}
      {categoryCostReport.length > 0 && (
        <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 2 }}>
            Custos por Categoria
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryCostReport} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="categoria" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="valor" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {/* Tabela de viagens */}
          <ReportTable
            title="Relatório de Custos por Viagem"
            columns={[
              { field: 'vehicle_name', headerName: 'Veículo', type: 'vehicle' },
              { field: 'origem', headerName: 'Origem' },
              { field: 'destino', headerName: 'Destino' },
              { field: 'ida_volta', headerName: 'Ida/Volta' },
              { field: 'finalizada_em', headerName: 'Finalizada em', type: 'date' },
              { field: 'distancia_km', headerName: 'Distância (km)', type: 'distance' },
              { field: 'consumo_km_l', headerName: 'Consumo (Km/L)', type: 'consumption' },
              { field: 'custo_total', headerName: 'Custo Total', type: 'currency' }
            ]}
            data={filteredTripReport.map(trip => ({
              vehicle_name: vehicles.find(v => v.id === trip.vehicle_id)?.name || 'N/A',
              origem: trip.start_city,
              destino: trip.end_city,
              ida_volta: trip.is_round_trip ? 'Sim' : 'Não',
              finalizada_em: trip.end_date,
              distancia_km: trip.distance,
              consumo_km_l: trip.consumption,
              custo_total: (trip.fuel_cost || 0) + (trip.extra_costs || 0)
            }))}
            stickyHeader={true}
            maxHeight={400}
          />

      {/* Tabela de custos extras */}
          <ReportTable
            title="Histórico de Custos Extras"
            columns={[
              { field: 'vehicle_name', headerName: 'Veículo', type: 'vehicle' },
              { field: 'data', headerName: 'Data', type: 'date' },
              { field: 'descricao', headerName: 'Descrição' },
              { field: 'tipo', headerName: 'Tipo' },
              { field: 'valor', headerName: 'Valor', type: 'currency' }
            ]}
            data={filteredExtraCostReport.map(cost => ({
              vehicle_name: vehicles.find(v => v.id === cost.vehicle_id)?.name || 'N/A',
              data: cost.data_custo || cost.created_at,
              descricao: cost.descricao,
              tipo: cost.tipo_custo,
              valor: cost.valor
            }))}
            stickyHeader={true}
            maxHeight={400}
          />
        </>
        );
      })()}

      {/* Relatório de Custos Extras */}
      {reportType === 'custos' && (
        <ReportTable
          title="Relatório de Custos Extras"
          columns={[
            { field: 'vehicle_name', headerName: 'Veículo', type: 'vehicle' },
            { field: 'driver_name', headerName: 'Motorista' },
            { field: 'tipo_custo', headerName: 'Tipo', type: 'chip' },
            { field: 'descricao', headerName: 'Descrição' },
            { field: 'valor', headerName: 'Valor', type: 'currency' },
            { field: 'data_custo', headerName: 'Data', type: 'date' },
            { field: 'foto_path', headerName: 'Foto', type: 'photo' }
          ]}
          data={filteredExtraCostReport.map(cost => ({
            vehicle_name: vehicles.find(v => v.id === cost.vehicle_id)?.name || cost.vehicle_name || 'N/A',
            driver_name: cost.driver_name || safeDrivers.find(d => d.id === cost.driver_id)?.name || '-',
            tipo_custo: cost.tipo_custo,
            descricao: cost.descricao,
            valor: cost.valor,
            data_custo: cost.data_custo || cost.created_at,
            foto_path: cost.foto_path
          }))}
          onPhotoClick={handleOpenPhotoModal}
        />
      )}

      {/* Relatório de Consumo - EXATAMENTE IGUAL AO RefuelingReportsTab */}
      {reportType === 'consumo' && (() => {
        return (
        <>

          {/* Cards de resumo */}
          <SummaryCards 
            cards={[
              {
                title: 'Total Abastecimentos',
                value: filteredRefuelingReport?.length || 0,
                color: 'primary'
              },
              {
                title: 'Quilometragem Total',
                value: `${filteredRefuelingReport?.reduce((sum, refuel) => sum + Number(refuel.distancia_percorrida || 0), 0) || 0} km`,
                color: 'success.main'
              },
              {
                title: 'Total Litros',
                value: `${safeToFixed(filteredRefuelingReport?.reduce((sum, refuel) => sum + Number(refuel.liters_filled || 0), 0) || 0, 1)} L`,
                color: 'info.main'
              },
              {
                title: 'Custo Total',
                value: formatCurrency(filteredRefuelingReport?.reduce((sum, refuel) => sum + Number(refuel.total_cost || 0), 0) || 0),
                color: 'warning.main'
              }
            ]}
          />

          {/* Tabela de abastecimentos */}
          <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 2 }}>
              Relatório de Abastecimento
            </Typography>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Veículo</TableCell>
                    <TableCell>Data</TableCell>
                    <TableCell>Posto</TableCell>
                    <TableCell>Cidade</TableCell>
                    <TableCell>Hodômetro Anterior</TableCell>
                    <TableCell>Hodômetro Atual</TableCell>
                    <TableCell>Distância</TableCell>
                    <TableCell>Litros</TableCell>
                    <TableCell>Consumo (Km/L)</TableCell>
                    <TableCell align="center">Fotos</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(filteredRefuelingReport || []).map((refuel, index) => {
                    const hasPhotos = refuel.foto_bomba || refuel.foto_odometro;
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {vehicles.find(v => v.id === refuel.vehicle_id)?.name || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatDate(refuel.refuel_date)}</TableCell>
                        <TableCell>{refuel.posto_nome || '-'}</TableCell>
                        <TableCell>{refuel.cidade || '-'}</TableCell>
                        <TableCell>{refuel.odometer_anterior || '-'}</TableCell>
                        <TableCell>{refuel.odometer_atual || '-'}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="primary.main" fontWeight="medium">
                            {refuel.distancia_percorrida ? `${safeToFixed(refuel.distancia_percorrida, 1)} km` : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>{safeToFixed(refuel.liters_filled, 2)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="success.main" fontWeight="medium">
                            {refuel.consumo_por_trecho ? `${safeToFixed(refuel.consumo_por_trecho, 2)} km/L` : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {hasPhotos ? (
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleOpenMultiPhotoModal(refuel)}
                              title="Ver fotos"
                            >
                              <PhotoIcon />
                            </IconButton>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              Sem fotos
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
        );
      })()}

      {/* Relatório de Manutenções */}
      {reportType === 'manutencoes' && (
        <>
          <SummaryCards 
            cards={[
              {
                title: 'Total de Manutenções',
                value: filteredMaintenanceReport?.length || 0,
                color: 'primary'
              },
              {
                title: 'Custo Total',
                value: formatCurrency(filteredMaintenanceReport?.reduce((sum, m) => sum + Number(m.cost || 0), 0) || 0),
                color: 'warning.main'
              }
            ]}
          />
          <ReportTable
            title="Relatório de Manutenções"
            columns={[
              { field: 'vehicle_name', headerName: 'Veículo', type: 'vehicle' },
              { field: 'maintenance_date', headerName: 'Data', type: 'date' },
              { field: 'description', headerName: 'Descrição' },
              { field: 'cost', headerName: 'Custo', type: 'currency' },
              { field: 'odometer', headerName: 'Odômetro (km)' },
              { field: 'provider_name', headerName: 'Fornecedor' }
            ]}
            data={filteredMaintenanceReport.map(m => ({
              vehicle_name: vehicles.find(v => v.id === m.vehicle_id)?.name || m.vehicle_name || 'N/A',
              maintenance_date: m.maintenance_date,
              description: m.description || '-',
              cost: m.cost,
              odometer: m.odometer ? `${m.odometer}` : '-',
              provider_name: m.provider_name || '-'
            }))}
            stickyHeader={true}
            maxHeight={400}
          />
        </>
      )}
      
      {/* Modal para exibir foto única (custos extras) */}
      <PhotoModal
        open={photoModalOpen}
        onClose={handleClosePhotoModal}
        photoPath={selectedPhoto}
        title="Foto do Custo"
      />

      {/* Modal para exibir múltiplas fotos (abastecimentos) */}
      <MultiPhotoModal
        open={multiPhotoModalOpen}
        onClose={handleCloseMultiPhotoModal}
        photos={selectedPhotos}
        title="Fotos do Abastecimento"
        loading={loadingPhotos}
      />
    </Box>
  );
};

export default ReportsTab;
