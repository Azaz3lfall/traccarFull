// Funções de formatação

export const formatCurrency = (value) => {
  if (!value || isNaN(Number(value))) return 'R$ 0,00';
  const numValue = Number(value);
  if (isNaN(numValue)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numValue);
};

export const formatDate = (dateString) => {
  if (!dateString) {
    console.log('⚠️ formatDate recebeu data vazia:', dateString);
    return '-';
  }
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.log('⚠️ formatDate recebeu data inválida:', dateString);
      return '-';
    }
    
    return date.toLocaleDateString('pt-BR');
  } catch (error) {
    console.log('❌ Erro no formatDate:', error, 'Data:', dateString);
    return '-';
  }
};

export const formatToDatetimeLocal = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const formatNameForUsername = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '.')
    .substring(0, 20);
};

export const formatCPF = (cpf) => {
  if (!cpf) return '';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const formatPhone = (phone) => {
  if (!phone) return '';
  return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
};

export const formatCNH = (cnh) => {
  if (!cnh) return '';
  return cnh.replace(/(\d{3})(\d{3})(\d{3})(\d{3})/, '$1.$2.$3.$4');
};

// Função para garantir que um valor seja um número válido para usar com toFixed()
export const safeToFixed = (value, decimals = 2) => {
  const num = Number(value);
  if (isNaN(num)) return '0.00';
  return num.toFixed(decimals);
};

// Função para normalizar números float (aceita vírgula e ponto como separador decimal)
export const normalizeFloat = (value) => {
  if (!value || value === '') return '';
  
  // Converte string para número, substituindo vírgula por ponto
  const normalizedValue = String(value).replace(',', '.');
  
  // Verifica se é um número válido
  const floatValue = parseFloat(normalizedValue);
  
  if (isNaN(floatValue)) {
    return value; // Retorna o valor original se não for um número válido
  }
  
  return floatValue;
};

// Função para formatar número para exibição (com vírgula como separador decimal)
export const formatFloatForDisplay = (value) => {
  if (!value || value === '') return '';
  
  const normalizedValue = normalizeFloat(value);
  
  if (typeof normalizedValue === 'number') {
    // Formata com vírgula como separador decimal
    return normalizedValue.toString().replace('.', ',');
  }
  
  return value;
};

// Função para validar se um valor é um número válido (aceita vírgula e ponto)
export const isValidFloat = (value) => {
  if (!value || value === '') return true; // Campo vazio é válido
  
  const normalizedValue = String(value).replace(',', '.');
  const floatValue = parseFloat(normalizedValue);
  
  return !isNaN(floatValue) && isFinite(floatValue);
};
