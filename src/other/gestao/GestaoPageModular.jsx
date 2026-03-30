import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Alert
} from '@mui/material';
import { useSelector } from 'react-redux';
import { authManager } from './utils/authManager';

// Importar hooks customizados
import {
  useGestaoData,
  useTrips,
  useDrivers,
  useRefuels,
  useExtraCosts,
  useMaintenances
} from './hooks';

// Importar utilitários de exportação
import { exportData } from './utils/exportUtils';

// Importar componentes modulares
import {
  TripsTab,
  UnifiedTripsTab,
  DriversTab,
  VehiclesTab,
  RefuelsTab,
  ExtraCostsTab,
  MaintenancesTab,
  ReportsTab,
  RefuelingReportsTab
} from './components';

// Importar constantes e utilitários
import { REPORT_PERIODS } from './constants';
import { 
  getCostReports,
  getTripCostReports,
  getCategoryCostReports,
  getConsumptionReports,
  getRefuelingDistanceReports,
  getRefuelingCostReports,
  getRefuels
} from './utils';

const GestaoPageModular = () => {
  // DEBUG - Confirmar que componentes funciona
  console.log('🎯 GESTAOMODULAR - Componente carregado!');
  
  // Usar o usuário do Redux store do Traccar
  const user = useSelector((state) => state.session.user);
  
  // Estados principais
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState(null);
  
  // DEBUG - Usuario e estado
  console.log('🔍 GESTAOMODULAR - Usuário atual:', user);

  // Hook para dados principais
  const {
    vehicles,
    drivers,
    openTrips,
    closedTrips,
    allRefuels,
    allExtraCosts,
    allMaintenances,
    loading,
    setLoading,
    refreshData,
    setVehicles,
    setDrivers,
    setOpenTrips,
    setClosedTrips,
    setAllRefuels,
    setAllExtraCosts,
    setAllMaintenances
  } = useGestaoData();

  // Hook para viagens
  const tripsHook = useTrips(openTrips, setOpenTrips, closedTrips, setClosedTrips);

  // Hook para motoristas
  const driversHook = useDrivers(drivers, setDrivers);

  // Hook para abastecimentos
  const refuelsHook = useRefuels(allRefuels, setAllRefuels);

  // Hook para custos extras
  const extraCostsHook = useExtraCosts(allExtraCosts, setAllExtraCosts);

  // Hook para manutenções
  const maintenancesHook = useMaintenances(allMaintenances, setAllMaintenances);

  // Estados para relatórios
  const [reportPeriod, setReportPeriod] = useState(REPORT_PERIODS.MENSAL);
  const [reportVehicle, setReportVehicle] = useState('all');
  const [reportDriver, setReportDriver] = useState('all');
  const [loadingReports, setLoadingReports] = useState(false);
  const [tripReport, setTripReport] = useState([]);
  const [extraCostReport, setExtraCostReport] = useState([]);
  const [averageConsumption, setAverageConsumption] = useState(0);
  const [categoryCostReport, setCategoryCostReport] = useState([]);

  // Debug dos estados dos relatórios (removido para evitar loops - usar apenas quando necessário)
  // useEffect(() => {
  //   console.log('🔍 RELATÓRIOS DEBUG - Estados atuais:', {
  //     reportPeriod,
  //     reportVehicle,
  //     loadingReports,
  //     tripReportLength: tripReport.length,
  //     extraCostReportLength: extraCostReport.length,
  //     averageConsumption,
  //     categoryCostReportLength: categoryCostReport.length
  //   });
  // }, [reportPeriod, reportVehicle, loadingReports, tripReport, extraCostReport, averageConsumption, categoryCostReport]);

  // Estados para relatórios de abastecimento
  const [refuelingReportFilter, setRefuelingReportFilter] = useState({
    vehicleId: 'all',
    periodo: REPORT_PERIODS.MENSAL,
    startDate: '',
    endDate: ''
  });
  const [refuelingReportTotals, setRefuelingReportTotals] = useState({ km_percorrido: 0 });
  const [refuelingDistanceReport, setRefuelingDistanceReport] = useState([]);
  const [loadingRefuelingReport, setLoadingRefuelingReport] = useState(false);
  const [refuelingCostFilter, setRefuelingCostFilter] = useState({
    vehicleId: 'all',
    periodo: REPORT_PERIODS.MENSAL
  });
  const [totalRefuelingCost, setTotalRefuelingCost] = useState(0);

  // Estados para veículos
  const [editVehicleModalOpen, setEditVehicleModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicleEditData, setVehicleEditData] = useState({
    plate: '',
    nickname: '',
    tank_capacity: '',
    initial_odometer: '',
    installation_details: ''
  });

  // DEBUG - Log dos dados de abastecimentos que estão chegando
  useEffect(() => {
    console.log(`🔍 GESTAOMODULAR - Abastecimentos recebidos:`, allRefuels && allRefuels.length);
    console.log(`🔍 GESTAOMODULAR - Lista todos refuels:`, allRefuels);
    if (allRefuels && allRefuels.length > 0) {
      console.log(`🔍 GESTAOMODULAR - Primeiro refuel structure:`, allRefuels[0]);
    }
  }, [allRefuels]);

  // Funções para relatórios
  const handleGenerateReport = async () => {
    setLoadingReports(true);
    setError(null);
    
    try {
      console.log('📊 Gerando relatório com filtros:', {
        reportPeriod,
        reportVehicle,
        timestamp: new Date().toISOString()
      });
      
      const filters = {
        periodo: reportPeriod,
        deviceId: reportVehicle === 'all' ? 'all' : reportVehicle,
        // Adicionar timestamp para evitar cache
        _t: Date.now()
      };
      
      console.log('🔍 Filtros aplicados:', filters);
      
      const [trips, extraCosts, consumption, categories] = await Promise.all([
        getTripCostReports(filters).catch(err => {
          console.error('❌ Erro ao buscar dados de viagens:', err);
          return [];
        }),
        getCostReports(filters).catch(err => {
          console.error('❌ Erro ao buscar custos extras:', err);
          return [];
        }),
        getConsumptionReports(filters).catch(err => {
          console.error('❌ Erro ao buscar consumo médio:', err);
          return { average: 0 };
        }),
        getCategoryCostReports(filters).catch(err => {
          console.error('❌ Erro ao buscar relatório por categoria:', err);
          return [];
        })
      ]);

      console.log('📊 Dados obtidos dos relatórios:', {
        tripsLength: trips ? trips.length : 0,
        extraCostsLength: extraCosts ? extraCosts.length : 0,
        consumption: consumption ? consumption.average : 0,
        categoriesLength: categories ? categories.length : 0
      });

      setTripReport(Array.isArray(trips) ? trips : []);
      setExtraCostReport(Array.isArray(extraCosts) ? extraCosts : []);
      setAverageConsumption(consumption?.average || 0);
      setCategoryCostReport(Array.isArray(categories) ? categories : []);
      
      console.log('✅ Relatório gerado com sucesso');
    } catch (error) {
      console.error('❌ Erro completo na geração do relatório:', error);
      setError('Erro ao gerar relatório: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoadingReports(false);
    }
  };

  const handleExportReport = () => {
    // Implementar exportação
    console.log('Exportar relatório');
  };

  const handleGenerateRefuelingReport = async () => {
    setLoadingRefuelingReport(true);
    setError(null);
    
    try {
      const filters = {
        periodo: refuelingReportFilter.periodo,
        deviceId: refuelingReportFilter.vehicleId === 'all' ? 'all' : refuelingReportFilter.vehicleId,
        startDate: refuelingReportFilter.startDate,
        endDate: refuelingReportFilter.endDate,
        _t: Date.now()
      };
      
      // ⭐️ Chama a rota otimizada do Backend (Backend devolve o cálculo pronto!)
      const reportData = await getRefuelingDistanceReports(filters); 
      
      // O Backend retorna 'distancia_percorrida' e 'consumo_por_trecho' calculados.
      setRefuelingDistanceReport(Array.isArray(reportData) ? reportData : []);
      
      // Calcula TOTAIS a partir dos dados retornados
      const totalKm = reportData.reduce((sum, item) => sum + (Number(item.distancia_percorrida) || 0), 0);
      const totalCost = reportData.reduce((sum, item) => sum + (Number(item.total_cost) || 0), 0);
      
      setRefuelingReportTotals({ km_percorrido: totalKm });
      setTotalRefuelingCost(totalCost);
      
    } catch (error) {
      console.error('❌ Erro no relatório de abastecimento:', error);
      setError('Erro ao gerar relatório de consumo: ' + (error.response?.data?.error || error.message || 'Erro desconhecido'));
    } finally {
      setLoadingRefuelingReport(false);
    }
  };

  const handleExportRefuelingReport = (format = 'pdf') => {
    if (!refuelingDistanceReport || refuelingDistanceReport.length === 0) {
      alert('Nenhum dado disponível para exportar. Gere o relatório primeiro.');
      return;
    }

    try {
      console.log('📤 Iniciando exportação do relatório de abastecimento em formato:', format);
      console.log('📊 Dados a serem exportados:', refuelingDistanceReport.length, 'registros');

      // Preparar dados para exportação
      const exportData = refuelingDistanceReport.map(refuel => {
        const vehicleName = vehicles.find(v => v.id === refuel.vehicle_id)?.name || refuel.vehicle_name || `Veículo ${refuel.vehicle_id}`;
        
        return {
          'Veículo': vehicleName,
          'Data': new Date(refuel.refuel_date).toLocaleDateString('pt-BR'),
          'Odômetro Anterior': `${refuel.odometer_anterior || 0} km`,
          'Odômetro Atual': `${refuel.odometer_atual || refuel.odometer || 0} km`,
          'Distância Percorrida': `${refuel.distancia_percorrida || 0} km`,
          'Litros': `${refuel.liters_filled || 0} L`,
          'Valor': `R$ ${Number(refuel.total_cost || 0).toFixed(2).replace('.', ',')}`,
          'Posto': refuel.posto_nome || '-',
          'Cidade': refuel.cidade || '-',
          'Consumo': `${Number(refuel.consumption || refuel.consumo_por_trecho || 0).toFixed(2)} km/L`,
          'Tanque Cheio': refuel.is_full_tank ? 'Sim' : 'Não'
        };
      });

      // Definir colunas para PDF
      const columns = [
        { field: 'Veículo', headerName: 'Veículo' },
        { field: 'Data', headerName: 'Data' },
        { field: 'Odômetro Anterior', headerName: 'Odômetro Anterior' },
        { field: 'Odômetro Atual', headerName: 'Odômetro Atual' },
        { field: 'Distância Percorrida', headerName: 'Distância Percorrida' },
        { field: 'Litros', headerName: 'Litros' },
        { field: 'Valor', headerName: 'Valor' },
        { field: 'Posto', headerName: 'Posto' },
        { field: 'Cidade', headerName: 'Cidade' },
        { field: 'Consumo', headerName: 'Consumo' },
        { field: 'Tanque Cheio', headerName: 'Tanque Cheio' }
      ];

      // Gerar nome do arquivo com data
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `relatorio-consumo-${dateStr}.${format === 'excel' ? 'xlsx' : format}`;

      // Usar função de exportação
      exportData(exportData, format, columns, filename);
      console.log('✅ Exportação iniciada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao exportar relatório:', error);
      setError('Erro ao exportar relatório: ' + (error.message || 'Erro desconhecido'));
    }
  };

  // Funções para veículos
  const handleSyncVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar autenticação primeiro
      const isAuthenticated = await authManager.checkAuthentication();
      if (!isAuthenticated) {
        setError('❌ Você precisa estar logado no Traccar para sincronizar veículos. Faça login primeiro.');
        setLoading(false);
        return;
      }
      
      console.log('🔄 Iniciando sincronização de veículos...');
      
      // Sincronizar com a API de gestão usando GET (como definido no backend)
      const syncResponse = await fetch('/gestao/vehicles/sync', {
        method: 'GET',
        credentials: 'include'
      });
      
      // Verificar se a resposta é JSON antes de fazer parse
      const contentType = syncResponse.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      
      if (syncResponse.ok) {
        if (isJson) {
          const result = await syncResponse.json();
          console.log('✅ Sincronização de veículos concluída:', result);
          
          // Mostrar resultado da sincronização
          if (result.new_vehicles || result.updated_vehicles) {
            alert(`✅ Sincronização concluída!\nNovos veículos: ${result.new_vehicles || 0}\nVeículos atualizados: ${result.updated_vehicles || 0}\nTotal no Traccar: ${result.total_traccar || 0}`);
          } else {
            alert('✅ Sincronização concluída! Nenhum veículo novo encontrado.');
          }
          
          console.log('🔄 Chamando refreshData após sincronização...');
          refreshData();
          console.log('✅ refreshData chamado com sucesso');
        } else {
          // Se não for JSON, pode ser HTML (página de erro)
          const textResponse = await syncResponse.text();
          console.error('❌ Resposta não é JSON:', textResponse.substring(0, 200));
          setError('❌ Erro ao sincronizar veículos: O servidor retornou uma resposta inválida. Verifique se o endpoint de sincronização está configurado corretamente.');
        }
      } else {
        // Tratar erro da resposta
        let errorMessage = 'Erro desconhecido';
        
        if (isJson) {
          try {
            const errorData = await syncResponse.json();
            errorMessage = errorData.error || errorData.message || `Erro ${syncResponse.status}: ${syncResponse.statusText}`;
          } catch (jsonError) {
            console.error('❌ Erro ao fazer parse do JSON de erro:', jsonError);
            errorMessage = `Erro ${syncResponse.status}: ${syncResponse.statusText}`;
          }
        } else {
          // Se não for JSON, tentar ler como texto
          const textResponse = await syncResponse.text();
          console.error('❌ Resposta de erro não é JSON:', textResponse.substring(0, 200));
          
          if (syncResponse.status === 404) {
            errorMessage = 'Endpoint de sincronização não encontrado. Verifique se o backend está configurado corretamente.';
          } else if (syncResponse.status === 401 || syncResponse.status === 403) {
            errorMessage = 'Erro de autenticação: Você precisa estar logado no Traccar. Faça login e tente novamente.';
          } else {
            errorMessage = `Erro ${syncResponse.status}: ${syncResponse.statusText}`;
          }
        }
        
        console.error('❌ Erro na sincronização:', errorMessage);
        setError('❌ Erro ao sincronizar veículos: ' + errorMessage);
      }
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      
      // Tratar diferentes tipos de erro
      let errorMessage = error.message;
      
      if (error.message.includes('Unexpected token')) {
        errorMessage = 'O servidor retornou uma resposta inválida (HTML em vez de JSON). Verifique se o endpoint de sincronização está configurado corretamente no backend.';
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = 'Erro de conexão. Verifique sua conexão com a internet e se o servidor está acessível.';
      }
      
      setError('❌ Erro ao sincronizar veículos: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncDrivers = async () => {
    try {
      const syncResponse = await fetch('/gestao/drivers/sync', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (syncResponse.ok) {
        const result = await syncResponse.json();
        console.log('✅ Sincronização de motoristas concluída:', result);
        alert(`Sincronização concluída!\nNovos motoristas: ${result.new_drivers}\nMotoristas atualizados: ${result.updated_drivers}\nTotal no Traccar: ${result.total_traccar}`);
        refreshData();
      } else {
        const errorData = await syncResponse.json();
        setError('Erro ao sincronizar motoristas: ' + (errorData.error || 'Erro desconhecido'));
      }
    } catch (error) {
      setError('Erro ao sincronizar motoristas: ' + error.message);
    }
  };

  const handleEditVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setVehicleEditData({
      plate: vehicle.plate || vehicle.name || '',
      nickname: vehicle.nickname || '',
      tank_capacity: vehicle.tank_capacity ?? '',
      initial_odometer: vehicle.initial_odometer ?? '',
      installation_details: vehicle.installation_details || ''
    });
    setEditVehicleModalOpen(true);
  };

  const handleSaveVehicleEdit = async () => {
    if (!selectedVehicle) return;
    
    try {
      const response = await fetch(`/gestao/vehicles/${selectedVehicle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(vehicleEditData)
      });
      
      if (response.ok) {
        setEditVehicleModalOpen(false);
        refreshData();
      } else {
        const errorData = await response.json();
        setError('Erro ao editar veículo: ' + (errorData.error || 'Erro desconhecido'));
      }
    } catch (error) {
      setError('Erro ao editar veículo: ' + error.message);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Se não houver usuário, mostrar loading (o App.jsx já gerencia isso)
  if (!user) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Carregando...
        </Typography>
      </Container>
    );
  }

  // Se estiver carregando, mostrar spinner
  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Carregando dados da gestão...
        </Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 2, mb: 2, px: 3 }}>
      {/* Exibir erro se houver */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs de navegação */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
          <Tab label="Viagens" />
          <Tab label="Veículos" />
          <Tab label="Motoristas" />
          <Tab label="Abastecimentos" />
          <Tab label="Custos Extras" />
          <Tab label="Manutenções" />
          <Tab label="Relatório de Frota" />
        </Tabs>
      </Box>

      {/* Conteúdo das tabs */}
      {activeTab === 0 && (
        <UnifiedTripsTab
          openTrips={openTrips}
          closedTrips={closedTrips}
          vehicles={vehicles}
          drivers={drivers}
          {...tripsHook}
        />
      )}

      {activeTab === 1 && (
        <VehiclesTab
          vehicles={vehicles}
          setVehicles={setVehicles}
          editVehicleModalOpen={editVehicleModalOpen}
          setEditVehicleModalOpen={setEditVehicleModalOpen}
          selectedVehicle={selectedVehicle}
          vehicleEditData={vehicleEditData}
          setVehicleEditData={setVehicleEditData}
          loading={loading}
          handleSyncVehicles={handleSyncVehicles}
          handleEditVehicle={handleEditVehicle}
          handleSaveVehicleEdit={handleSaveVehicleEdit}
        />
      )}

      {activeTab === 2 && (
        <DriversTab
          drivers={drivers}
          vehicles={vehicles}
          {...driversHook}
          handleReloadDrivers={refreshData}
          createDriverModalOpen={driversHook.createDriverModalOpen}
          setCreateDriverModalOpen={driversHook.setCreateDriverModalOpen}
        />
      )}

      {activeTab === 3 && (
        <>
          {console.log('🔍 GESTAOMODULAR - Renderizando aba abastecimentos:', { vehicles: vehicles.length, allRefuels: allRefuels?.length, rawRefuels: allRefuels })}
          <RefuelsTab
            vehicles={vehicles}
            allRefuels={allRefuels}
            {...refuelsHook}
          />
        </>
      )}

      {activeTab === 4 && (
        <ExtraCostsTab
          vehicles={Array.isArray(vehicles) ? vehicles : []}
          drivers={Array.isArray(drivers) ? drivers : []}
          allExtraCosts={Array.isArray(allExtraCosts) ? allExtraCosts : []}
          {...extraCostsHook}
        />
      )}

      {activeTab === 5 && (
        <MaintenancesTab
          vehicles={Array.isArray(vehicles) ? vehicles : []}
          allMaintenances={Array.isArray(allMaintenances) ? allMaintenances : []}
          {...maintenancesHook}
        />
      )}

      {activeTab === 6 && (
        <ReportsTab
          vehicles={vehicles || []}
          drivers={drivers || []}
          reportPeriod={reportPeriod}
          setReportPeriod={setReportPeriod}
          reportVehicle={reportVehicle}
          setReportVehicle={setReportVehicle}
          reportDriver={reportDriver}
          setReportDriver={setReportDriver}
          loadingReports={loadingReports}
          tripReport={tripReport || []}
          extraCostReport={extraCostReport || []}
          averageConsumption={averageConsumption || 0}
          categoryCostReport={categoryCostReport || []}
          handleGenerateReport={handleGenerateReport}
          handleExportReport={handleExportReport}
          // Props adicionais para relatórios de consumo
          refuelingReportFilter={refuelingReportFilter || { vehicleId: 'all', periodo: REPORT_PERIODS.MENSAL, startDate: '', endDate: '' }}
          setRefuelingReportFilter={setRefuelingReportFilter}
          refuelingReportTotals={refuelingReportTotals || { km_percorrido: 0 }}
          refuelingDistanceReport={refuelingDistanceReport || []}
          loadingRefuelingReport={loadingRefuelingReport}
          totalRefuelingCost={totalRefuelingCost || 0}
          refuelingCostFilter={refuelingCostFilter || { vehicleId: 'all', periodo: REPORT_PERIODS.MENSAL }}
          setRefuelingCostFilter={setRefuelingCostFilter}
          handleGenerateRefuelingReport={handleGenerateRefuelingReport}
          handleExportRefuelingReport={handleExportRefuelingReport}
          allMaintenances={allMaintenances || []}
        />
      )}

    </Container>
  );
};

export default GestaoPageModular;
