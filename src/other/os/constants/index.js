// Usar caminhos relativos para que o Nginx/Vite faça o proxy
export const OS_API_URL = '/os-api';
export const TRACCAR_API_URL = '/traccar-api';

export const OS_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export const OS_STATUS_LABELS = {
  [OS_STATUS.PENDING]: 'Pendente',
  [OS_STATUS.IN_PROGRESS]: 'Em Andamento',
  [OS_STATUS.COMPLETED]: 'Concluída',
  [OS_STATUS.CANCELLED]: 'Cancelada',
};

