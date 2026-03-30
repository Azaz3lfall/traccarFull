/**
 * Maps vehicle_type (string from fleet_core) to mapIconKey used by mapIcons.
 * Used when device.category is not available (e.g. no device) or as fallback.
 * @param {string} vehicleType - e.g. "Carro", "Caminhão", "Moto"
 * @returns {string} - mapIconKey: car, truck, motorcycle, van, bus, pickup, tractor, default
 */
export const vehicleTypeToIcon = (vehicleType) => {
  if (!vehicleType || typeof vehicleType !== 'string') return 'default';
  const normalized = vehicleType.trim().toLowerCase().replace(/\s+/g, '');
  const mapping = {
    carro: 'car',
    car: 'car',
    caminhão: 'truck',
    caminhao: 'truck',
    truck: 'truck',
    moto: 'motorcycle',
    motorcycle: 'motorcycle',
    motocicleta: 'motorcycle',
    van: 'van',
    ônibus: 'bus',
    onibus: 'bus',
    bus: 'bus',
    caminhonete: 'pickup',
    pickup: 'pickup',
    trator: 'tractor',
    tractor: 'tractor',
    bicicleta: 'bicycle',
    bicycle: 'bicycle',
    barco: 'boat',
    boat: 'boat',
    trem: 'train',
    train: 'train',
  };
  return mapping[normalized] || 'default';
};
