// URLs da API
export const API_TRACCAR_URL = '/api/devices';
export const API_GESTAO_URL = '/gestao';

// Configuração da API
export const apiConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
};

// Estilos para modais
export const styleModal = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

// Opções de período para relatórios
export const REPORT_PERIODS = {
  MENSAL: 'mensal',
  SEMANAL: 'semanal',
  ANUAL: 'anual',
  MES_ANTERIOR: 'mes_anterior',
  PERSONALIZADO: 'personalizado'
};

// Tipos de custo
export const COST_TYPES = [
  'Combustível',
  'Manutenção',
  'Pedágio',
  'Estacionamento',
  'Multa',
  'Outros',
  'Salário',
  'Comissão'
];

export const MAINTENANCE_TYPES = [
  { value: 'oil', label: 'Troca de Óleo' },
  { value: 'tire', label: 'Troca de Pneu' },
  { value: 'belt', label: 'Troca de Correia' },
  { value: 'battery', label: 'Troca de Bateria' },
  { value: 'filter', label: 'Troca de Filtro' },
  { value: 'brake', label: 'Freio' },
  { value: 'revision', label: 'Revisão' },
  { value: 'other', label: 'Outros' },
];

export const DURABILITY_UNITS = [
  { value: 'km', label: 'Quilômetros (km)' },
  { value: 'hours', label: 'Horas de motor' },
  { value: 'days', label: 'Dias' },
];

// Categorias de CNH
export const CNH_CATEGORIES = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'AB',
  'AC',
  'AD',
  'AE'
];

// Configurações de exportação
export const EXPORT_FORMATS = {
  PDF: 'pdf',
  EXCEL: 'excel',
  CSV: 'csv'
};

// Status das viagens
export const TRIP_STATUS = {
  EM_ANDAMENTO: 'Em Andamento',
  FINALIZADA: 'FINALIZADA',
  CANCELADA: 'CANCELADA'
};

// Status das viagens para exibição
export const TRIP_STATUS_DISPLAY = {
  [TRIP_STATUS.EM_ANDAMENTO]: 'Em Andamento',
  [TRIP_STATUS.FINALIZADA]: 'Finalizada',
  [TRIP_STATUS.CANCELADA]: 'Cancelada'
};

// Cores dos status das viagens
export const TRIP_STATUS_COLORS = {
  [TRIP_STATUS.EM_ANDAMENTO]: 'warning',
  [TRIP_STATUS.FINALIZADA]: 'success',
  [TRIP_STATUS.CANCELADA]: 'error'
};
