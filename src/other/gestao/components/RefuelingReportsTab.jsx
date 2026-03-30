import React from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  FileDownload as FileDownloadIcon,
  DirectionsCar as CarIcon,
  Speed as SpeedIcon,
  LocalGasStation as GasIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { formatDate, formatCurrency, safeToFixed } from '../utils/formatters';
import { REPORT_PERIODS } from '../constants';
import { exportData } from '../utils/exportUtils';

const RefuelingReportsTab = ({
  vehicles,
  refuelingReportFilter,
  setRefuelingReportFilter,
  refuelingReportTotals,
  refuelingDistanceReport,
  loadingRefuelingReport,
  totalRefuelingCost,
  refuelingCostFilter,
  setRefuelingCostFilter,
  handleGenerateRefuelingReport,
  handleExportRefuelingReport
}) => {

  // Debug dos dados
  console.log('🔍 RefuelingReportsTab - vehicles:', vehicles);
  console.log('🔍 RefuelingReportsTab - refuelingDistanceReport:', refuelingDistanceReport);
  console.log('🔍 RefuelingReportsTab - refuelingReportTotals:', refuelingReportTotals);

  // Função para obter o nome do veículo
  const getVehicleName = (vehicleId, vehicleName) => {
    console.log(`🔍 getVehicleName input: vehicleId=${vehicleId}, vehicleName=${vehicleName}`);
    console.log(`🔍 vehicles disponíveis:`, vehicles?.map(v => ({id: v.id, name: v.name})) || []);
    
    if (vehicleName) {
      console.log(`✅ Usando nome direto: ${vehicleName}`);
      return vehicleName;
    }
    
    const vehicle = vehicles.find(v => v.id === vehicleId);
    console.log(`🔍 veículo encontrado:`, vehicle);
    
    if (vehicle && vehicle.name) {
      console.log(`✅ Nome do veículo encontrado: ${vehicle.name}`);
      return vehicle.name;
    }
    
    console.log(`⚠️ Nome não encontrado, usando fallback: Veículo ${vehicleId}`);
    return `Veículo ${vehicleId}` || 'N/A';
  };

  // Função para exportar relatório de consumo
  const handleExportRefuelingReportData = (format = 'excel') => {
    const columns = [
      { field: 'vehicle_name', headerName: 'Veículo' },
      { field: 'refuel_date', headerName: 'Data' },
      { field: 'odometer_anterior', headerName: 'Odômetro Anterior (km)' },
      { field: 'odometer_atual', headerName: 'Odômetro Atual (km)' },
      { field: 'distancia_percorrida', headerName: 'Distância Percorrida (km)' },
      { field: 'liters_filled', headerName: 'Litros' },
      { field: 'total_cost', headerName: 'Valor' },
      { field: 'price_per_liter', headerName: 'Valor/Litro' },
      { field: 'posto_nome', headerName: 'Posto' },
      { field: 'cidade', headerName: 'Cidade' },
      { field: 'consumo_por_trecho', headerName: 'Consumo (km/L)' }
    ];

    const data = (refuelingDistanceReport || []).map(refuel => ({
      ...refuel,
      vehicle_name: getVehicleName(refuel.vehicle_id, refuel.vehicle_name),
      refuel_date: formatDate(refuel.refuel_date),
      total_cost: formatCurrency(refuel.total_cost),
      price_per_liter: refuel.total_cost && refuel.liters_filled && Number(refuel.total_cost) > 0 && Number(refuel.liters_filled) > 0 
        ? formatCurrency(Number(refuel.total_cost) / Number(refuel.liters_filled))
        : 'R$ 0,00',
      consumption: safeToFixed(refuel.consumption, 2) || 'N/A'
    }));

    exportData(data, format, columns, `relatorio_abastecimento_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`);
  };
  return (
    <Box>
      {/* Filtros do relatório de consumo */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Relatórios de Consumo</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Veículo</InputLabel>
              <Select
                value={refuelingReportFilter.vehicleId}
                label="Veículo"
                onChange={(e) => setRefuelingReportFilter(prev => ({ ...prev, vehicleId: e.target.value }))}
              >
                <MenuItem value="all">Todos os Veículos</MenuItem>
                {vehicles.map((vehicle) => (
                  <MenuItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Período</InputLabel>
              <Select
                value={refuelingReportFilter.periodo}
                label="Período"
                onChange={(e) => setRefuelingReportFilter(prev => ({ ...prev, periodo: e.target.value }))}
              >
                <MenuItem value={REPORT_PERIODS.MENSAL}>Mensal</MenuItem>
                <MenuItem value={REPORT_PERIODS.SEMANAL}>Semanal</MenuItem>
                <MenuItem value={REPORT_PERIODS.ANUAL}>Anual</MenuItem>
                <MenuItem value={REPORT_PERIODS.MES_ANTERIOR}>Mês Anterior</MenuItem>
                <MenuItem value={REPORT_PERIODS.PERSONALIZADO}>Personalizado</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {refuelingReportFilter.periodo === REPORT_PERIODS.PERSONALIZADO && (
            <>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  label="Data Início"
                  type="date"
                  value={refuelingReportFilter.startDate}
                  onChange={(e) => setRefuelingReportFilter(prev => ({ ...prev, startDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  label="Data Fim"
                  type="date"
                  value={refuelingReportFilter.endDate}
                  onChange={(e) => setRefuelingReportFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </>
          )}
          <Grid item xs={12} sm={6} md={2}>
            <Button
              variant="contained"
              startIcon={<AssessmentIcon />}
              onClick={handleGenerateRefuelingReport}
              disabled={loadingRefuelingReport}
              fullWidth
            >
              {loadingRefuelingReport ? <CircularProgress size={20} /> : 'Gerar Relatório'}
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={() => handleExportRefuelingReportData('pdf')}
              disabled={loadingRefuelingReport || !refuelingDistanceReport.length}
              fullWidth
              sx={{ mr: 1 }}
            >
              PDF
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={() => handleExportRefuelingReportData('excel')}
              disabled={loadingRefuelingReport || !refuelingDistanceReport.length}
              fullWidth
            >
              Excel
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Cards de resumo */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Abastecimentos
              </Typography>
              <Typography variant="h4">
                {refuelingDistanceReport.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Quilometragem Total
              </Typography>
              <Typography variant="h4">
                {refuelingReportTotals.km_percorrido} km
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Litros
              </Typography>
              <Typography variant="h4">
                {safeToFixed(refuelingDistanceReport?.reduce((sum, refuel) => sum + Number(refuel.liters_filled || 0), 0) || 0, 1)} L
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Custo Total
              </Typography>
              <Typography variant="h4">
                {formatCurrency(totalRefuelingCost)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>


      {/* Tabela de abastecimentos */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Relatório de Consumo</Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Veículo</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Posto</TableCell>
                <TableCell>Cidade</TableCell>
                <TableCell>Em Viagem?</TableCell>
                <TableCell>Hodômetro Anterior</TableCell>
                <TableCell>Hodômetro Atual</TableCell>
                <TableCell>Distância</TableCell>
                <TableCell>Litros</TableCell>
                <TableCell>Consumo (Km/L)</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(refuelingDistanceReport || []).map((refuel, index) => {
                console.log('🔍 Item da tabela - Index:', index, 'Total Cost:', refuel.total_cost, 'Type:', typeof refuel.total_cost, 'Raw data:', refuel);
                return (
                <TableRow key={index}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {getVehicleName(refuel.vehicle_id, refuel.vehicle_name)}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatDate(refuel.refuel_date)}</TableCell>
                  <TableCell>{refuel.posto_nome || 'N/A'}</TableCell>
                  <TableCell>{refuel.cidade || 'N/A'}</TableCell>
                  <TableCell>Não</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {refuel.odometer_anterior ? `${safeToFixed(refuel.odometer_anterior, 1)}` : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {safeToFixed(refuel.odometer_atual, 1)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="primary.main" fontWeight="medium">
                      {refuel.distancia_percorrida ? safeToFixed(refuel.distancia_percorrida, 1) : '0.00'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {refuel.liters_filled ? safeToFixed(refuel.liters_filled, 2) : '0.00'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="success.main" fontWeight="medium">
                      {(refuel.consumo_por_trecho || refuel.consumption) ? safeToFixed(refuel.consumo_por_trecho || refuel.consumption, 2) : '0.00'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      Sem Fotos
                    </Typography>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default RefuelingReportsTab;
