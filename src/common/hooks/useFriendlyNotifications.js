import { useCallback } from 'react';

/**
 * Hook para exibir notificações amigáveis ao usuário
 * @returns {Object} Funções para exibir erros e notificações
 */
export const useFriendlyNotifications = () => {
  /**
   * Exibe uma mensagem de erro amigável
   * @param {string} message - Mensagem de erro
   * @param {string} [title] - Título do erro (opcional)
   * @param {string} [details] - Detalhes adicionais (opcional)
   */
  const showError = useCallback((message, title, details) => {
    console.error('❌ Erro:', {
      title: title || 'Erro',
      message,
      details: details || null
    });
    
    // Aqui você pode integrar com um sistema de notificações global
    // Por exemplo, usando um toast, snackbar, ou sistema de notificações
    // Por enquanto, apenas logamos no console
    if (typeof window !== 'undefined' && window.showNotification) {
      window.showNotification({
        type: 'error',
        title: title || 'Erro',
        message,
        details
      });
    }
  }, []);

  /**
   * Exibe uma mensagem de erro de rede
   */
  const showNetworkError = useCallback(() => {
    console.error('🌐 Erro de rede: Falha na conexão com o servidor');
    
    showError(
      'Falha na conexão com o servidor. Verifique sua conexão com a internet.',
      'Erro de Rede',
      'Não foi possível conectar ao servidor. Tente novamente em alguns instantes.'
    );
  }, [showError]);

  /**
   * Exibe uma mensagem de sucesso
   * @param {string} message - Mensagem de sucesso
   * @param {string} [title] - Título (opcional)
   */
  const showSuccess = useCallback((message, title) => {
    console.log('✅ Sucesso:', {
      title: title || 'Sucesso',
      message
    });
    
    if (typeof window !== 'undefined' && window.showNotification) {
      window.showNotification({
        type: 'success',
        title: title || 'Sucesso',
        message
      });
    }
  }, []);

  /**
   * Exibe uma mensagem de informação
   * @param {string} message - Mensagem informativa
   * @param {string} [title] - Título (opcional)
   */
  const showInfo = useCallback((message, title) => {
    console.info('ℹ️ Info:', {
      title: title || 'Informação',
      message
    });
    
    if (typeof window !== 'undefined' && window.showNotification) {
      window.showNotification({
        type: 'info',
        title: title || 'Informação',
        message
      });
    }
  }, []);

  return {
    showError,
    showNetworkError,
    showSuccess,
    showInfo
  };
};

