import { useCallback } from 'react';
import { formatDate, formatCurrency, safeToFixed } from '../utils/formatters';
import { exportData } from '../utils/exportUtils';

export const useReportExport = (vehicles) => {
  // Função para obter o nome do veículo
  const getVehicleName = useCallback((vehicleId, vehicleName) => {
    if (vehicleName) return vehicleName;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? vehicle.name : `Veículo ${vehicleId}`;
  }, [vehicles]);

  // Função para exportar relatório de viagens
  const exportTripReport = useCallback((tripReport, format = 'pdf') => {
    const columns = [
      { field: 'vehicle_name', headerName: 'Veículo' },
      { field: 'route', headerName: 'Rota' },
      { field: 'start_date', headerName: 'Data Início' },
      { field: 'end_date', headerName: 'Data Fim' },
      { field: 'distance', headerName: 'Distância (km)' },
      { field: 'consumption', headerName: 'Consumo (km/L)' },
      { field: 'fuel_cost', headerName: 'Custo Combustível' },
      { field: 'extra_costs', headerName: 'Custos Extras' },
      { field: 'total', headerName: 'Total' }
    ];

    const data = (tripReport || []).map(trip => ({
      vehicle_name: getVehicleName(trip.vehicle_id, trip.vehicle_name),
      route: `${trip.start_city} → ${trip.end_city}`,
      start_date: formatDate(trip.start_date),
      end_date: formatDate(trip.end_date),
      distance: trip.distance || 0,
      consumption: safeToFixed(trip.consumption, 2) || 'N/A',
      fuel_cost: formatCurrency(trip.fuel_cost || 0),
      extra_costs: formatCurrency(trip.extra_costs || 0),
      total: formatCurrency((trip.fuel_cost || 0) + (trip.extra_costs || 0))
    }));

    exportData(data, format, columns, `relatorio_viagens_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`);
  }, [getVehicleName]);

  // Função para exportar relatório de custos extras
  const exportExtraCostReport = useCallback((extraCostReport, format = 'pdf') => {
    const columns = [
      { field: 'vehicle_name', headerName: 'Veículo' },
      { field: 'driver_name', headerName: 'Motorista' },
      { field: 'tipo_custo', headerName: 'Tipo' },
      { field: 'descricao', headerName: 'Descrição' },
      { field: 'valor', headerName: 'Valor' },
      { field: 'data_custo', headerName: 'Data' },
      { field: 'foto', headerName: 'Foto' }
    ];

    const data = (extraCostReport || []).map(cost => ({
      vehicle_name: getVehicleName(cost.vehicle_id, cost.vehicle_name),
      driver_name: cost.driver_name || '-',
      tipo_custo: cost.tipo_custo || 'N/A',
      descricao: cost.descricao || 'N/A',
      valor: formatCurrency(cost.valor || 0),
      data_custo: formatDate(cost.data_custo || cost.created_at),
      foto: cost.foto_path ? 'Sim' : 'Não'
    }));

    exportData(data, format, columns, `relatorio_custos_extras_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`);
  }, [getVehicleName]);

  // Função para exportar relatório de consumo
  const exportConsumptionReport = useCallback((refuelingDistanceReport, format = 'pdf') => {
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
      vehicle_name: getVehicleName(refuel.vehicle_id, refuel.vehicle_name),
      refuel_date: formatDate(refuel.refuel_date),
      odometer_anterior: refuel.odometer_anterior ? safeToFixed(refuel.odometer_anterior, 1) : '-',
      odometer_atual: safeToFixed(refuel.odometer_atual, 1),
      distancia_percorrida: refuel.distancia_percorrida ? safeToFixed(refuel.distancia_percorrida, 1) : '-',
      liters_filled: refuel.liters_filled ? safeToFixed(refuel.liters_filled, 2) : '0,00',
      total_cost: formatCurrency(refuel.total_cost || 0),
      price_per_liter: refuel.total_cost && refuel.liters_filled && Number(refuel.total_cost) > 0 && Number(refuel.liters_filled) > 0 
        ? formatCurrency(Number(refuel.total_cost) / Number(refuel.liters_filled))
        : 'R$ 0,00',
      posto_nome: refuel.posto_nome || 'N/A',
      cidade: refuel.cidade || 'N/A',
      consumo_por_trecho: (refuel.consumo_por_trecho || refuel.consumption) ? safeToFixed(refuel.consumo_por_trecho || refuel.consumption, 2) : 'N/A'
    }));

    exportData(data, format, columns, `relatorio_consumo_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`);
  }, [getVehicleName]);

  // Função para exportar relatório de manutenções
  const exportMaintenanceReport = useCallback((maintenanceReport, format = 'pdf') => {
    const columns = [
      { field: 'vehicle_name', headerName: 'Veículo' },
      { field: 'maintenance_date', headerName: 'Data' },
      { field: 'description', headerName: 'Descrição' },
      { field: 'cost', headerName: 'Custo' },
      { field: 'odometer', headerName: 'Odômetro (km)' },
      { field: 'provider_name', headerName: 'Fornecedor' }
    ];

    const data = (maintenanceReport || []).map(m => ({
      vehicle_name: getVehicleName(m.vehicle_id, m.vehicle_name),
      maintenance_date: formatDate(m.maintenance_date),
      description: m.description || '-',
      cost: formatCurrency(m.cost || 0),
      odometer: m.odometer ? `${m.odometer}` : '-',
      provider_name: m.provider_name || '-'
    }));

    exportData(data, format, columns, `relatorio_manutencoes_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`);
  }, [getVehicleName]);

  // Função para exportar relatório específico
  const exportSpecificReport = useCallback((type, data, format = 'pdf') => {
    switch (type) {
      case 'viagens':
        exportTripReport(data, format);
        break;
      case 'custos':
        exportExtraCostReport(data, format);
        break;
      case 'consumo':
        exportConsumptionReport(data, format);
        break;
      case 'manutencoes':
        exportMaintenanceReport(data, format);
        break;
      default:
        console.error('Tipo de relatório não suportado:', type);
    }
  }, [exportTripReport, exportExtraCostReport, exportConsumptionReport, exportMaintenanceReport]);

  return {
    getVehicleName,
    exportTripReport,
    exportExtraCostReport,
    exportConsumptionReport,
    exportMaintenanceReport,
    exportSpecificReport
  };
};








