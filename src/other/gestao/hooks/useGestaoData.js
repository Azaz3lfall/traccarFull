import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { 
  getVehicles, 
  getDrivers, 
  getTrips, 
  getRefuels, 
  getCostReports,
  getMaintenances,
  syncVehiclesFromTraccar
} from '../utils/apiUtils';
import { filterVehiclesByUser } from '../utils/vehicleUtils';
import { TRIP_STATUS } from '../constants';
import { useFriendlyNotifications } from '../../../common/hooks/useFriendlyNotifications';
import { useAdministrator } from '../../../common/util/permissions';
import { authManager } from '../utils/authManager';

// Hook para gerenciar dados principais da gestão
export const useGestaoData = () => {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [openTrips, setOpenTrips] = useState([]);
  const [closedTrips, setClosedTrips] = useState([]);
  const [allRefuels, setAllRefuels] = useState([]);
  const [allExtraCosts, setAllExtraCosts] = useState([]);
  const [allMaintenances, setAllMaintenances] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { showError, showNetworkError } = useFriendlyNotifications();
  
  // Obter informações do usuário atual
  const user = useSelector((state) => state.session.user);
  const isAdmin = useAdministrator();
  
  // DEBUG: Log das informações do usuário
  console.log('🔍 DEBUG useGestaoData - Usuário:', user);
  console.log('🔍 DEBUG useGestaoData - isAdmin:', isAdmin);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Buscando dados da gestão...', { userId: user?.id, isAdmin });

      // Verificar autenticação antes de fazer requisições
      const isAuthenticated = await authManager.checkAuthentication();
      if (!isAuthenticated) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }

      // SIMPLIFICADO: Buscar veículos diretamente da API de gestão como o código original
      let vehiclesData = [];
      try {
        // CORREÇÃO: Para usuários não-admin, usar endpoint mais específico
        const endpoint = isAdmin 
          ? '/vehicles?confirmed=true' 
          : `/vehicles?user_id=${user?.id}&confirmed=true`;
        
        console.log('🔗 Buscando veículos de:', endpoint);
        console.log('🔍 Usuário:', { id: user?.id, isAdmin, name: user?.name });
        
        let allVehicles = [];
        try {
          allVehicles = await authManager.makeRequestWithFallback(endpoint);
          console.log('✅ Veículos obtidos da API:', allVehicles.length);
        } catch (reqError) {
          console.error('❌ Erro ao buscar veículos via fallback:', reqError.message);
          allVehicles = [];
        }

        // Quando a gestão retorna veículos (fleet_core), usar apenas essa lista – não misturar com equipamentos (devices)
        if (allVehicles.length > 0) {
          vehiclesData = allVehicles;
        } else {
          // Fallback: gestão retornou 0 veículos – usar dispositivos do Traccar para não quebrar a tela
          const traccarResponse = await fetch('/api/devices', { credentials: 'include' });
          if (traccarResponse.ok) {
            const traccarDevices = await traccarResponse.json();
            console.log(`📱 API de Gestão sem veículos. Fallback: ${traccarDevices.length} dispositivos do Traccar.`);
            vehiclesData = traccarDevices.length > 0 ? traccarDevices : [];
          } else {
            vehiclesData = [];
          }
        }
        
      } catch (apiError) {
        console.warn('⚠️ API de gestão não disponível, usando fallback do Traccar:', apiError.message);
        
        // CORREÇÃO: Fallback melhorado para usuários cliente
        const traccarResponse = await fetch('/api/devices', { credentials: 'include' });
        if (traccarResponse.ok) {
          const allDevices = await traccarResponse.json();
          console.log('📱 Dispositivos obtidos do Traccar:', allDevices.length);
          console.log('🔍 Usuário atual no fallback:', { id: user?.id, isAdmin, name: user?.name });
          
          // DEBUG: Verificar se há dispositivos e como estão associados
          console.log('🔍 DEBUG: TODOS os dispositivos do Traccar:', allDevices.map(d => ({
            id: d.id,
            name: d.name,
            userId: d.userId,
            groupId: d.groupId,
            attributes: {
              assignedUserId: d.attributes?.assignedUserId,
              ownerId: d.attributes?.ownerId,
              userId: d.attributes?.userId,
              owner: d.attributes?.owner,
              dadosVeiculo: d.attributes?.dadosVeiculo
            }
          })));
          
          // Log completo do primeiro dispositivo para análise
          if (allDevices.length > 0) {
            console.log('🔍 DEBUG: Estrutura completa do primeiro dispositivo do Traccar:', allDevices[0]);
          }
          
          // CORREÇÃO: Filtrar dispositivos que são veículos E pertencem ao usuário
          // Menos restritivo para garantir que a lista não fique vazia
          const allVehicles = allDevices.filter(device => {
            // Se tiver TAG, incluímos como veículo (novo pedido)
            if (device.category === 'tag') return true;
            
            // Se tiver placa, é veículo
            if (device.attributes?.dadosVeiculo?.placa) return true;
            
            // Se tiver categoria de veículo, é veículo
            if (device.category === 'car' || device.category === 'truck' || device.category === 'motorcycle' || device.category === 'bus' || device.category === 'van' || device.category === 'vehicle') return true;
            
            // Se tiver atributos específicos do sistema de gestão
            if (device.attributes?.isVehicle || device.attributes?.vehicleConfirmed) return true;
            
            // EM MODO FALLBACK: Se não encontrou nenhum critério, mas o dispositivo existe, incluir como candidato
            // para evitar lista vazia se os atributos não estiverem configurados
            return true; 
          });
          
          console.log('🚗 Veículos identificados no Traccar:', allVehicles.length);
          
          // Aplicar filtro de usuário no fallback do Traccar
          if (!isAdmin) {
            console.log('🔍 Usuário normal: usando dispositivos retornados pelo Traccar (já filtrados por permissão)');
            vehiclesData = allVehicles;
          } else {
            vehiclesData = allVehicles;
            console.log('👑 Admin: todos os veículos do Traccar:', vehiclesData.length);
          }
        }
      }

      const [driversData, tripsData, refuelsData, extraCostsData, maintenancesData] = await Promise.all([
        getDrivers(),
        getTrips(),
        getRefuels(),
        getCostReports(),
        getMaintenances()
      ]);

      // DEBUG Independente do tipo de usuário
      console.log('🔍 REFULES SOUÇÃO - Dados retornados pela API:');
      console.log('🔍 REFULES SÀRIO - refuelsData arr:', refuelsData);
      console.log('🔍 REFULES ARIA - refuelsData comp:', Array.isArray(refuelsData) ? `${refuelsData.length} registros` : 'Dados não array');
      if (refuelsData && refuelsData.length > 0) {
        console.log('🔍 REFULES sanmpl 1:', refuelsData[0]);
      }

      console.log('🔍 DEBUG - Definindo veículos:', vehiclesData.length, 'veículos');
      console.log('🔍 DEBUG - Primeiro veículo antes de definir:', vehiclesData[0]);
      setVehicles(vehiclesData);
      
      // EXIBIR TODOS OS MOTORISTAS RETORNADOS PELO BACKEND (que já estão filtrados por permissão)
      console.log(`👤 Motoristas recebidos da API: ${driversData.length}`);
      setDrivers(driversData);
      
      // FILTRAR VIAGENS: Apenas dos veículos do usuário
      let filteredTrips = tripsData;
      if (!isAdmin && user?.id) {
        // Obter IDs dos veículos do usuário
        const userVehicleIds = vehiclesData.map(v => v.id);
        console.log(`🚗 IDs dos veículos do usuário:`, userVehicleIds);
        
        filteredTrips = tripsData.filter(trip => {
          // Verificar se a viagem é de um veículo do usuário
          const isUserVehicle = userVehicleIds.includes(trip.vehicleId) || 
                               userVehicleIds.includes(trip.vehicle_id) ||
                               (trip.vehicle && userVehicleIds.includes(trip.vehicle.id));
          
          if (isUserVehicle) {
            console.log(`✅ Viagem ${trip.id} pertence ao usuário (veículo: ${trip.vehicleId || trip.vehicle_id})`);
          } else {
            console.log(`❌ Viagem ${trip.id} NÃO pertence ao usuário (veículo: ${trip.vehicleId || trip.vehicle_id})`);
          }
          
          return isUserVehicle;
        });
        console.log(`👤 Viagens filtradas por usuário: ${filteredTrips.length} de ${tripsData.length}`);
      } else {
        console.log(`👑 Admin: todas as viagens (${tripsData.length})`);
      }
      
      // Separar viagens abertas e fechadas baseado no status
      // Viagens abertas: sem end_date OU com status "Em Andamento" OU sem status definido
      const open = filteredTrips.filter(trip => 
        !trip.end_date || 
        trip.status === TRIP_STATUS.EM_ANDAMENTO || 
        !trip.status ||
        trip.status === null
      );
      // Viagens fechadas: com end_date E status finalizado/cancelado
      const closed = filteredTrips.filter(trip => 
        trip.end_date && 
        trip.status && 
        (trip.status === TRIP_STATUS.FINALIZADA || trip.status === TRIP_STATUS.CANCELADA)
      );
      setOpenTrips(open);
      setClosedTrips(closed);
      
      // SIMPLIFICADO: Como implementação funcional do commit 66d2e217
      // Remove toda lógica complexa de filtros e usa diretamente os dados da API
      console.log(`📦 REFUELS - Dados de abastecimentos recebidos: ${(refuelsData || []).length}`);
      console.log(`🔍 REFUELS - Primeira amostra de dados:`, (refuelsData || []).slice(0, 1));
      console.log(`🔍 ADMIN STATUS - isAdmin: ${isAdmin}, user: ${user?.id}, administrator: ${user?.administrator}`);
      
      setAllRefuels(refuelsData || []);
      
      // FILTRAR CUSTOS EXTRAS: Apenas dos veículos do usuário
      let filteredExtraCosts = extraCostsData;
      if (!isAdmin && user?.id) {
        const userVehicleIds = vehiclesData.map(v => v.id);
        console.log(`🚗 IDs dos veículos do usuário para custos extras:`, userVehicleIds);
        
        filteredExtraCosts = extraCostsData.filter(cost => {
          // Verificar se o custo é de um veículo do usuário
          const isUserVehicle = userVehicleIds.includes(cost.vehicleId) || 
                               userVehicleIds.includes(cost.vehicle_id) ||
                               (cost.vehicle && userVehicleIds.includes(cost.vehicle.id));
          
          if (isUserVehicle) {
            console.log(`✅ Custo extra ${cost.id} pertence ao usuário (veículo: ${cost.vehicleId || cost.vehicle_id})`);
          } else {
            console.log(`❌ Custo extra ${cost.id} NÃO pertence ao usuário (veículo: ${cost.vehicleId || cost.vehicle_id})`);
          }
          
          return isUserVehicle;
        });
        console.log(`👤 Custos extras filtrados por usuário: ${filteredExtraCosts.length} de ${extraCostsData.length}`);
      } else {
        console.log(`👑 Admin: todos os custos extras (${extraCostsData.length})`);
      }
      setAllExtraCosts(filteredExtraCosts);
      
      // FILTRAR MANUTENÇÕES: Apenas dos veículos do usuário
      let filteredMaintenances = maintenancesData || [];
      if (!isAdmin && user?.id) {
        const userVehicleIds = vehiclesData.map(v => v.id);
        console.log(`🚗 IDs dos veículos do usuário para manutenções:`, userVehicleIds);
        
        filteredMaintenances = (maintenancesData || []).filter(maintenance => {
          // Verificar se a manutenção é de um veículo do usuário
          const isUserVehicle = userVehicleIds.includes(maintenance.vehicleId) || 
                               userVehicleIds.includes(maintenance.vehicle_id) ||
                               (maintenance.vehicle && userVehicleIds.includes(maintenance.vehicle.id));
          
          if (isUserVehicle) {
            console.log(`✅ Manutenção ${maintenance.id} pertence ao usuário (veículo: ${maintenance.vehicleId || maintenance.vehicle_id})`);
          } else {
            console.log(`❌ Manutenção ${maintenance.id} NÃO pertence ao usuário (veículo: ${maintenance.vehicleId || maintenance.vehicle_id})`);
          }
          
          return isUserVehicle;
        });
        console.log(`👤 Manutenções filtradas por usuário: ${filteredMaintenances.length} de ${(maintenancesData || []).length}`);
      } else {
        console.log(`👑 Admin: todas as manutenções (${(maintenancesData || []).length})`);
      }
      setAllMaintenances(filteredMaintenances);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      
      // Tentar extrair erro amigável
      try {
        const friendlyError = JSON.parse(err.message);
        setError(friendlyError.message);
        showError(friendlyError.message, friendlyError.title, friendlyError.details);
      } catch {
        // Se não conseguir parsear, usar erro genérico
        setError('Erro ao carregar dados');
        showNetworkError();
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, isAdmin, showError, showNetworkError]);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin]); // Removido fetchData das dependências para evitar loops

  const refreshData = useCallback(() => {
    console.log('🔄 Refreshing data...');
    fetchData();
  }, [fetchData]);

  const syncVehicles = useCallback(async () => {
    try {
      setLoading(true);
      await syncVehiclesFromTraccar();
      await fetchData(); // Recarregar dados após sincronização
    } catch (err) {
      console.error('Erro ao sincronizar veículos:', err);
      showError('Erro ao sincronizar veículos com o Traccar');
    } finally {
      setLoading(false);
    }
  }, [fetchData, showError]);

  return {
    vehicles,
    drivers,
    openTrips,
    closedTrips,
    allRefuels,
    allExtraCosts,
    allMaintenances,
    loading,
    setLoading,
    error,
    setError,
    refreshData,
    syncVehicles,
    setVehicles,
    setDrivers,
    setOpenTrips,
    setClosedTrips,
    setAllRefuels,
    setAllExtraCosts,
    setAllMaintenances,
    admin: isAdmin,
    manager: false, // Por enquanto, usar apenas admin
    user
  };
};
