// Funções de validação para formulários

/**
 * Valida CPF brasileiro
 * @param {string} cpf - CPF com ou sem formatação
 * @returns {object} - { valid: boolean, error: string }
 */
export const validateCPF = (cpf) => {
  if (!cpf) {
    return { valid: false, error: 'CPF é obrigatório' };
  }

  // Remove formatação (pontos e traços)
  const cleanCPF = cpf.replace(/[^\d]/g, '');

  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) {
    return { valid: false, error: 'CPF deve ter 11 dígitos' };
  }

  // Verifica se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1{10}$/.test(cleanCPF)) {
    return { valid: false, error: 'CPF inválido' };
  }

  // Validação dos dígitos verificadores
  let sum = 0;
  let remainder;

  // Valida primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) {
    return { valid: false, error: 'CPF inválido (dígito verificador incorreto)' };
  }

  // Valida segundo dígito verificador
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) {
    return { valid: false, error: 'CPF inválido (dígito verificador incorreto)' };
  }

  return { valid: true, error: '' };
};

/**
 * Valida CNH brasileira
 * @param {string} cnh - CNH com ou sem formatação
 * @returns {object} - { valid: boolean, error: string }
 */
export const validateCNH = (cnh) => {
  if (!cnh) {
    return { valid: false, error: 'CNH é obrigatória' };
  }

  // Remove formatação (pontos)
  const cleanCNH = cnh.replace(/[^\d]/g, '');

  // Verifica se tem 11 dígitos
  if (cleanCNH.length !== 11) {
    return { valid: false, error: 'CNH deve ter 11 dígitos' };
  }

  // Verifica se todos os dígitos são iguais (CNH inválida)
  if (/^(\d)\1{10}$/.test(cleanCNH)) {
    return { valid: false, error: 'CNH inválida' };
  }

  // Validação básica da CNH (algoritmo simplificado)
  // A CNH tem um algoritmo de validação mais complexo, mas vamos fazer uma validação básica
  // que verifica se não é uma sequência inválida comum
  const invalidSequences = [
    '00000000000',
    '11111111111',
    '22222222222',
    '33333333333',
    '44444444444',
    '55555555555',
    '66666666666',
    '77777777777',
    '88888888888',
    '99999999999'
  ];

  if (invalidSequences.includes(cleanCNH)) {
    return { valid: false, error: 'CNH inválida' };
  }

  return { valid: true, error: '' };
};

/**
 * Remove formatação de CPF/CNH
 * @param {string} value - Valor formatado
 * @returns {string} - Valor apenas com dígitos
 */
export const removeFormatting = (value) => {
  if (!value) return '';
  return value.replace(/[^\d]/g, '');
};

