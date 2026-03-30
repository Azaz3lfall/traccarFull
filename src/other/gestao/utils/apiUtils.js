import { API_GESTAO_URL, apiConfig } from '../constants';
import { translateError } from '../../../common/utils/friendlyErrorMessages';
import { authManager } from './authManager';

// Funções utilitárias para API

export const makeApiRequest = async (endpoint, options = {}) => {
  try {
    // Usar o sistema de fallback que tenta gestão primeiro, depois Traccar
    return await authManager.makeRequestWithFallback(endpoint, options);
  } catch (error) {
    console.error('API request failed:', error);
    
    // Se o erro já foi traduzido, apenas re-throw
    if (error.message.startsWith('{')) {
      throw error;
    }
    
    // Caso contrário, traduzir o erro
    const friendlyError = translateError(error);
    throw new Error(JSON.stringify(friendlyError));
  }
};

export const getVehicles = async (userId = null, isAdmin = false) => {
  // Se for admin, buscar todos os veículos confirmados
  // Se for usuário normal, buscar apenas seus veículos
  const endpoint = isAdmin ? '/vehicles?confirmed=true' : `/vehicles?user_id=${userId}`;
  return makeApiRequest(endpoint);
};

export const getDrivers = async () => {
  return makeApiRequest('/drivers');
};

// Funções para gerenciar associações de veículos aos motoristas
export const getDriverVehicles = async (driverId) => {
  return makeApiRequest(`/drivers/${driverId}/vehicles`);
};

export const updateDriverVehicles = async (driverId, vehicleIds) => {
  return makeApiRequest(`/drivers/${driverId}/vehicles`, {
    method: 'PUT',
    body: JSON.stringify({ vehicle_ids: vehicleIds }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const getTrips = async (status = null) => {
  const endpoint = status ? `/trips?status=${status}` : '/trips';
  return makeApiRequest(endpoint);
};

export const getRefuels = async () => {
  return makeApiRequest('/abastecimentos/todos');
};

export const getExtraCosts = async () => {
  return makeApiRequest('/custos');
};

// Funções para gerenciar manutenções
export const getMaintenances = async (vehicleId = null) => {
  const endpoint = vehicleId ? `/maintenances?vehicle_id=${vehicleId}` : '/maintenances';
  return makeApiRequest(endpoint);
};

export const createMaintenance = async (maintenanceData) => {
  return makeApiRequest('/maintenances', {
    method: 'POST',
    body: JSON.stringify(maintenanceData),
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const updateMaintenance = async (maintenanceId, maintenanceData) => {
  return makeApiRequest(`/maintenances/${maintenanceId}`, {
    method: 'PUT',
    body: JSON.stringify(maintenanceData),
  });
};

export const deleteMaintenance = async (maintenanceId) => {
  return makeApiRequest(`/maintenances/${maintenanceId}`, {
    method: 'DELETE',
  });
};

export const createTrip = async (tripData) => {
  return makeApiRequest('/trips/iniciar', {
    method: 'POST',
    body: JSON.stringify(tripData),
  });
};

export const updateTrip = async (tripId, tripData) => {
  if (tripData.end_date) {
    // Finalizar viagem
    return makeApiRequest(`/trips/${tripId}/finalizar`, {
      method: 'PUT',
      body: JSON.stringify({ distancia_total: tripData.distance }),
    });
  } else {
    // Cancelar viagem
    return makeApiRequest(`/trips/${tripId}/cancelar`, {
      method: 'PUT',
    });
  }
};

export const deleteTrip = async (tripId) => {
  return makeApiRequest(`/trips/${tripId}/cancelar`, {
    method: 'PUT',
  });
};

export const createDriver = async (driverData) => {
  // Garantir que createInTraccar seja boolean (default: false)
  const payload = {
    ...driverData,
    createInTraccar: driverData.createInTraccar === true || driverData.createInTraccar === 'true'
  };
  
  return makeApiRequest('/drivers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateDriver = async (driverId, driverData) => {
  return makeApiRequest(`/drivers/${driverId}`, {
    method: 'PUT',
    body: JSON.stringify(driverData),
  });
};

export const completeDriver = async (driverId, driverData) => {
  return makeApiRequest(`/drivers/${driverId}/complete`, {
    method: 'PUT',
    body: JSON.stringify(driverData),
  });
};

export const updateDriverPassword = async (driverId, newPassword) => {
  return makeApiRequest(`/drivers/${driverId}/password`, {
    method: 'PUT',
    body: JSON.stringify({ new_password: newPassword }),
  });
};

export const deleteDriver = async (driverId) => {
  return makeApiRequest(`/drivers/${driverId}`, {
    method: 'DELETE',
  });
};

export const createRefuel = async (refuelData) => {
  return makeApiRequest('/refuelings', {
    method: 'POST',
    body: JSON.stringify(refuelData),
  });
};

export const updateRefuel = async (refuelId, refuelData) => {
  return makeApiRequest(`/abastecimentos/${refuelId}`, {
    method: 'PUT',
    body: JSON.stringify(refuelData),
  });
};

export const deleteRefuel = async (refuelId) => {
  return makeApiRequest(`/abastecimentos/${refuelId}`, {
    method: 'DELETE',
  });
};

export const createExtraCost = async (costData) => {
  // Sempre usar JSON - igual aos abastecimentos
  return makeApiRequest('/custos', {
    method: 'POST',
    body: JSON.stringify(costData),
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const updateExtraCost = async (costId, costData) => {
  return makeApiRequest(`/custos/${costId}`, {
    method: 'PUT',
    body: JSON.stringify(costData),
  });
};

export const deleteExtraCost = async (costId) => {
  return makeApiRequest(`/custos/${costId}`, {
    method: 'DELETE',
  });
};

export const getReports = async (type, filters = {}) => {
  const queryParams = new URLSearchParams(filters).toString();
  const endpoint = `/relatorios/${type}${queryParams ? `?${queryParams}` : ''}`;
  return makeApiRequest(endpoint);
};

// Funções específicas para relatórios
export const getCostReports = async (filters = {}) => {
  return makeApiRequest(`/relatorios/custos-extras?${new URLSearchParams(filters).toString()}`);
};

export const getTripCostReports = async (filters = {}) => {
  return makeApiRequest(`/relatorios/custos-por-viagem?${new URLSearchParams(filters).toString()}`);
};

export const getCategoryCostReports = async (filters = {}) => {
  return makeApiRequest(`/relatorios/custos-por-categoria?${new URLSearchParams(filters).toString()}`);
};

export const getConsumptionReports = async (filters = {}) => {
  return makeApiRequest(`/relatorios/consumo-medio?${new URLSearchParams(filters).toString()}`);
};

export const getRefuelingDistanceReports = async (filters = {}) => {
  return makeApiRequest(`/relatorios/distancia-abastecimentos?${new URLSearchParams(filters).toString()}`);
};

export const getRefuelingCostReports = async (filters = {}) => {
  return makeApiRequest(`/relatorios/custo-abastecimento-total?${new URLSearchParams(filters).toString()}`);
};

// Função para sincronizar veículos do Traccar com o sistema de gestão
export const syncVehiclesFromTraccar = async () => {
  return makeApiRequest('/vehicles/sync', {
    method: 'POST',
  });
};

// Função para confirmar um veículo
export const confirmVehicle = async (vehicleId, vehicleData) => {
  return makeApiRequest(`/vehicles/${vehicleId}/confirm`, {
    method: 'PUT',
    body: JSON.stringify(vehicleData),
  });
};

// Função para associar veículo a usuário
export const assignVehicleToUser = async (vehicleId, userId) => {
  return makeApiRequest(`/vehicles/${vehicleId}/assign`, {
    method: 'PUT',
    body: JSON.stringify({ userId }),
  });
};

// ===== FASE 2: Funções de Associação Híbrida =====

// Sincronizar todos os drivers com tipo de associação automática
export const syncDriverAssociations = async () => {
  return makeApiRequest('/drivers/sync-associations', {
    method: 'POST',
  });
};

// Alterar tipo de associação de um driver
export const updateDriverAssociationType = async (driverId, associationType, traccarUserId = null) => {
  return makeApiRequest(`/drivers/${driverId}/association-type`, {
    method: 'PUT',
    body: JSON.stringify({ 
      association_type: associationType,
      traccar_user_id: traccarUserId 
    }),
  });
};

// Sincronizar um driver específico
export const syncSingleDriver = async (driverId) => {
  return makeApiRequest(`/drivers/${driverId}/sync`, {
    method: 'POST',
  });
};

// Sincronizar todos os motoristas do Traccar para o SGF
export const syncDriversFromTraccar = async () => {
  return makeApiRequest('/drivers/sync', {
    method: 'POST',
  });
};

// Buscar estatísticas de associação
export const getAssociationStats = async () => {
  return makeApiRequest('/drivers/association-stats');
};

// ===== FASE 3: Funções Avançadas =====

// Histórico de Associações
export const getDriverHistory = async (driverId, limit = 50, offset = 0) => {
  return makeApiRequest(`/drivers/${driverId}/history?limit=${limit}&offset=${offset}`);
};

export const getAssociationHistory = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  return makeApiRequest(`/association-history?${params}`);
};

// Configuração de Agendamento
export const getSyncSchedule = async () => {
  return makeApiRequest('/sync-schedule');
};

export const updateSyncSchedule = async (enabled, intervalMinutes) => {
  return makeApiRequest('/sync-schedule', {
    method: 'PUT',
    body: JSON.stringify({ 
      enabled, 
      interval_minutes: intervalMinutes 
    }),
  });
};

export const runSyncNow = async () => {
  return makeApiRequest('/sync-schedule/run-now', {
    method: 'POST',
  });
};

export const getScheduledSyncLogs = async (limit = 20, offset = 0) => {
  return makeApiRequest(`/scheduled-sync-logs?limit=${limit}&offset=${offset}`);
};
