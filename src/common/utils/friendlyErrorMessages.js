/**
 * Traduz mensagens de erro técnicas em mensagens amigáveis ao usuário
 * @param {Error|string} error - Erro original
 * @returns {Object} Objeto com mensagem, título e detalhes amigáveis
 */
export const translateError = (error) => {
  const errorMessage = error?.message || error?.toString() || 'Erro desconhecido';
  
  // Mapeamento de erros comuns para mensagens amigáveis
  const errorMap = {
    'NetworkError': {
      title: 'Erro de Conexão',
      message: 'Não foi possível conectar ao servidor.',
      details: 'Verifique sua conexão com a internet e tente novamente.'
    },
    'Failed to fetch': {
      title: 'Erro de Conexão',
      message: 'Não foi possível conectar ao servidor.',
      details: 'Verifique sua conexão com a internet e tente novamente.'
    },
    '401': {
      title: 'Não Autorizado',
      message: 'Sua sessão expirou ou você não tem permissão para esta ação.',
      details: 'Faça login novamente para continuar.'
    },
    '403': {
      title: 'Acesso Negado',
      message: 'Você não tem permissão para realizar esta ação.',
      details: 'Entre em contato com o administrador se precisar de acesso.'
    },
    '404': {
      title: 'Recurso Não Encontrado',
      message: 'O recurso solicitado não foi encontrado.',
      details: 'Verifique se o item ainda existe ou foi removido.'
    },
    '500': {
      title: 'Erro do Servidor',
      message: 'Ocorreu um erro no servidor.',
      details: 'Tente novamente em alguns instantes. Se o problema persistir, entre em contato com o suporte.'
    },
    'timeout': {
      title: 'Tempo Esgotado',
      message: 'A operação demorou muito para ser concluída.',
      details: 'Tente novamente. Se o problema persistir, verifique sua conexão.'
    }
  };
  
  // Verificar se o erro corresponde a algum padrão conhecido
  const errorString = errorMessage.toLowerCase();
  
  for (const [key, value] of Object.entries(errorMap)) {
    if (errorString.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // Verificar códigos de status HTTP
  const statusMatch = errorMessage.match(/\b(\d{3})\b/);
  if (statusMatch) {
    const statusCode = statusMatch[1];
    if (errorMap[statusCode]) {
      return errorMap[statusCode];
    }
  }
  
  // Se não encontrar um padrão conhecido, retornar mensagem genérica
  return {
    title: 'Erro',
    message: 'Ocorreu um erro ao processar sua solicitação.',
    details: errorMessage.length > 100 
      ? `${errorMessage.substring(0, 100)}...` 
      : errorMessage
  };
};

/**
 * Formata uma mensagem de erro para exibição
 * @param {Error|string} error - Erro original
 * @returns {string} Mensagem formatada
 */
export const formatErrorMessage = (error) => {
  const translated = translateError(error);
  return translated.message;
};

/**
 * Verifica se um erro é um erro de rede
 * @param {Error|string} error - Erro a verificar
 * @returns {boolean} True se for erro de rede
 */
export const isNetworkError = (error) => {
  const errorMessage = error?.message || error?.toString() || '';
  const networkErrorPatterns = [
    'NetworkError',
    'Failed to fetch',
    'Network request failed',
    'ERR_NETWORK',
    'ERR_INTERNET_DISCONNECTED'
  ];
  
  return networkErrorPatterns.some(pattern => 
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
};

