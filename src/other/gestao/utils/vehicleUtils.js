// Utilitários para identificação e filtragem de veículos

/**
 * Identifica se um dispositivo é um veículo confirmado
 * @param {Object} device - Dispositivo a ser verificado
 * @returns {boolean} - True se for um veículo confirmado
 */
export const isConfirmedVehicle = (device) => {
  // Verificar se tem placa (indicador mais confiável)
  const hasPlate = device.attributes?.dadosVeiculo?.placa && 
                  device.attributes.dadosVeiculo.placa.trim() !== '';
  
  // Verificar se tem categoria de veículo (incluindo a nova TAG)
  const isVehicleCategory = device.category === 'vehicle' || 
                           device.category === 'car' || 
                           device.category === 'truck' ||
                           device.category === 'van' ||
                           device.category === 'bus' ||
                           device.category === 'tag';
  
  // Verificar se tem atributo específico de veículo confirmado
  const isConfirmedVehicle = device.attributes?.isVehicle === true || 
                            device.attributes?.vehicleConfirmed === true;
  
  // Verificar se tem dados de veículo COMPLETOS (pelo menos placa + outro dado)
  const hasVehicleData = hasPlate && (
    device.attributes?.dadosVeiculo?.ano ||
    device.attributes?.dadosVeiculo?.marcaModelo ||
    device.attributes?.dadosVeiculo?.corPredominante
  );
  
  // Para ser considerado veículo confirmado, deve ter:
  // 1. Placa OU categoria de veículo OU atributo de confirmação
  // 2. E pelo menos um dado adicional de veículo (OU ser da categoria TAG)
  return (hasPlate || isVehicleCategory || isConfirmedVehicle) && 
         (hasVehicleData || isConfirmedVehicle || device.category === 'tag');
};

/**
 * Filtra veículos por usuário
 * @param {Array} vehicles - Lista de veículos
 * @param {number} userId - ID do usuário
 * @param {boolean} isAdmin - Se o usuário é administrador
 * @returns {Array} - Lista filtrada de veículos
 */
export const filterVehiclesByUser = (vehicles, userId, isAdmin) => {
  if (isAdmin) {
    // Administrador vê todos os veículos confirmados
    return vehicles.filter(vehicle => isConfirmedVehicle(vehicle));
  } else {
    // Usuário normal vê apenas seus veículos
    return vehicles.filter(vehicle => 
      vehicle.userId === userId || 
      vehicle.attributes?.assignedUserId === userId
    );
  }
};

/**
 * Converte dispositivo em veículo
 * @param {Object} device - Dispositivo a ser convertido
 * @param {Object} vehicleData - Dados do veículo
 * @returns {Object} - Dispositivo convertido em veículo
 */
export const convertDeviceToVehicle = (device, vehicleData) => {
  return {
    ...device,
    category: 'vehicle',
    attributes: {
      ...device.attributes,
      isVehicle: true,
      vehicleConfirmed: true,
      dadosVeiculo: {
        ...device.attributes?.dadosVeiculo,
        ...vehicleData
      }
    }
  };
};

/**
 * Valida se os dados do veículo estão completos
 * @param {Object} vehicleData - Dados do veículo
 * @returns {Object} - Resultado da validação
 */
export const validateVehicleData = (vehicleData) => {
  const errors = [];
  
  if (!vehicleData.placa || vehicleData.placa.trim() === '') {
    errors.push('Placa é obrigatória');
  }
  
  if (!vehicleData.marcaModelo || vehicleData.marcaModelo.trim() === '') {
    errors.push('Marca/Modelo é obrigatório');
  }
  
  if (!vehicleData.ano || vehicleData.ano < 1900 || vehicleData.ano > new Date().getFullYear() + 1) {
    errors.push('Ano deve ser válido');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
