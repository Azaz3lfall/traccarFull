// Gerenciador de autenticação melhorado para o sistema de gestão
import { API_GESTAO_URL } from '../constants';

class AuthManager {
  constructor() {
    this.isAuthenticated = false;
    this.user = null;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  // Verificar se o usuário está autenticado
  async checkAuthentication() {
    try {
      console.log('🔍 Verificando autenticação...');

      // Verificar se estamos autenticados no Traccar
      const response = await fetch('/api/server', {
        credentials: 'include'
      });

      if (response.ok) {
        console.log('✅ Autenticado no Traccar');
        this.isAuthenticated = true;
        this.retryCount = 0;
        return true;
      } else {
        console.log('⚠️ Não autenticado no Traccar:', response.status);
        this.isAuthenticated = false;
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao verificar autenticação:', error);
      this.isAuthenticated = false;
      return false;
    }
  }

  // Login automático - usar sessão do Traccar
  async autoLogin() {
    try {
      console.log('🔄 Verificando sessão do Traccar...');
      
      // Verificar se já estamos autenticados no Traccar
      const response = await fetch('/api/server', {
        credentials: 'include'
      });

      if (response.ok) {
        console.log('✅ Sessão do Traccar válida');
        this.isAuthenticated = true;
        this.retryCount = 0;
        return true;
      } else {
        console.log('⚠️ Sessão do Traccar inválida:', response.status);
        return false;
      }
    } catch (error) {
      console.log('⚠️ Erro ao verificar sessão do Traccar:', error.message);
      return false;
    }
  }

  // Método fallback para verificação de autenticação
  async checkAuthenticationFallback() {
    try {
      // Verificar se o backend de gestão aceita a autenticação
      const gestaoResponse = await fetch(`${API_GESTAO_URL}/auth/user`, {
        credentials: 'include'
      });

      if (gestaoResponse.ok) {
        console.log('✅ Autenticação válida para gestão (fallback)');
        this.isAuthenticated = true;
        this.retryCount = 0;
        return true;
      } else {
        console.log('⚠️ Backend de gestão não aceita autenticação:', gestaoResponse.status);
        // Mesmo assim, considerar autenticado se o Traccar está OK
        console.log('🔄 Usando modo fallback - apenas Traccar');
        this.isAuthenticated = true;
        this.retryCount = 0;
        return true;
      }
    } catch (gestaoError) {
      console.log('⚠️ Backend de gestão indisponível, usando modo fallback');
      // Se o backend de gestão não estiver disponível, usar apenas Traccar
      this.isAuthenticated = true;
      this.retryCount = 0;
      return true;
    }
  }

  // Fazer requisição autenticada com retry automático
  async makeAuthenticatedRequest(endpoint, options = {}) {
    const url = `${API_GESTAO_URL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...options.headers
      },
      credentials: 'include', // Incluir cookies de sessão
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (response.ok) {
        this.retryCount = 0; // Reset retry count on success
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
        // Se não for JSON, lançar erro para disparar o fallback
        const text = await response.text();
        console.log('⚠️ Resposta não é JSON, disparando fallback... Conteúdo:', text.substring(0, 100));
        throw new Error('Resposta do servidor inválida (não é JSON)');
        }
      }
      
      if (response.status === 401) {
        console.log('🔐 Recebido 401 - backend de gestão não aceita autenticação');
        throw new Error('Backend de gestão indisponível - usando fallback');
      }
      
      // Check if response is HTML (error page)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.log('⚠️ Received HTML response instead of JSON - backend may be down');
        throw new Error('Backend returned HTML instead of JSON');
      }
      
      // Para outros erros, tentar extrair mensagem de erro do backend
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const text = await response.text();
        if (text) {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorData.message || errorMessage;
        }
      } catch (_) {
        // Manter errorMessage padrão se parsing falhar
      }
      throw new Error(errorMessage);
      
    } catch (error) {
      console.error('❌ Erro na requisição autenticada:', error);
      throw error;
    }
  }

  // Fazer requisição com fallback para Traccar
  async makeRequestWithFallback(endpoint, options = {}) {
    try {
      // Tentar primeiro o backend de gestão
      return await this.makeAuthenticatedRequest(endpoint, options);
    } catch (error) {
      console.log('🔄 Fallback para Traccar - endpoint:', endpoint);
      
      // Mapear endpoints de gestão para endpoints do Traccar
      const traccarEndpoint = this.mapGestaoToTraccar(endpoint);
      
      if (traccarEndpoint) {
        const traccarUrl = `/api${traccarEndpoint}`;
        const response = await fetch(traccarUrl, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          },
          ...options
        });
        
        if (response.ok) {
          return await response.json();
        } else {
          throw new Error(`Fallback Traccar também falhou: ${response.status}`);
        }
      } else {
        // Se não há mapeamento para Traccar (endpoint específico do Gestão)
        // Para requisições de mutação (POST/PUT/DELETE), re-lançar o erro para o caller tratar
        const isMutation = (options?.method || 'GET').toUpperCase() !== 'GET';
        if (isMutation) {
          throw error;
        }
        console.log('⚠️ Endpoint específico do Gestão sem fallback - retornando dados vazios');
        return [];
      }
    }
  }

  // Mapear endpoints de gestão para endpoints do Traccar
  mapGestaoToTraccar(endpoint) {
    // Normalizar endpoint removendo prefixo /gestao se houver
    const normalizedEndpoint = endpoint.startsWith('/gestao') 
      ? endpoint.substring(7) 
      : endpoint;

    // Fallback para /vehicles: usar Core (fleet_core), não Traccar devices
    const mappings = {
      '/vehicles?confirmed=true': '/vehicles',
      '/vehicles': '/vehicles',
      '/drivers': '/drivers',
      '/trips': '/devices'
    };
    
    // /vehicles com query params -> Core
    if (normalizedEndpoint.startsWith('/vehicles') && !normalizedEndpoint.startsWith('/vehicles/')) {
      return '/vehicles' + (normalizedEndpoint.includes('?') ? normalizedEndpoint.slice(normalizedEndpoint.indexOf('?')) : '');
    }
    // /vehicles/:id -> Core (GET /api/vehicles/:id). /vehicles/sync não existe no Core -> sem fallback
    if (normalizedEndpoint.match(/^\/vehicles\/[^/]+$/) && !normalizedEndpoint.startsWith('/vehicles/sync')) {
      return normalizedEndpoint;
    }
    
    // Endpoints específicos do Gestão que não existem no Traccar
    const gestaoOnlyEndpoints = [
      '/abastecimentos/todos',
      '/custos',
      '/relatorios/custos-extras',
      '/relatorios/custos-por-viagem',
      '/relatorios/custos-por-categoria',
      '/relatorios/consumo-medio',
      '/relatorios/distancia-abastecimentos',
      '/relatorios/custo-abastecimento-total',
      '/drivers/association-stats',
      '/drivers/sync',
      '/association-history',
      '/sync-schedule',
      '/scheduled-sync-logs'
    ];
    
    // Se for um endpoint específico do Gestão, não tentar fallback
    for (const gestaoEndpoint of gestaoOnlyEndpoints) {
      if (normalizedEndpoint.startsWith(gestaoEndpoint)) {
        return null;
      }
    }
    
    // Buscar mapeamento exato ou parcial
    for (const [gestaoPath, traccarPath] of Object.entries(mappings)) {
      if (normalizedEndpoint.startsWith(gestaoPath)) {
        return traccarPath;
      }
    }
    
    return null;
  }

  // Forçar logout e limpar estado
  async logout() {
    try {
      await fetch('/api/session', {
        method: 'DELETE',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
    
    this.isAuthenticated = false;
    this.user = null;
    this.retryCount = 0;
  }

  // Obter informações do usuário atual
  getCurrentUser() {
    return this.user;
  }

  // Verificar se é admin
  isAdmin() {
    return this.user?.administrator === true;
  }

  // Verificar se está autenticado
  getAuthStatus() {
    return this.isAuthenticated;
  }
}

// Instância singleton
export const authManager = new AuthManager();

// Função de conveniência para fazer requisições autenticadas
export const makeAuthenticatedRequest = (endpoint, options = {}) => {
  return authManager.makeAuthenticatedRequest(endpoint, options);
};

// Hook para usar o gerenciador de autenticação em componentes React
export const useAuthManager = () => {
  return {
    checkAuthentication: () => authManager.checkAuthentication(),
    makeAuthenticatedRequest: (endpoint, options) => authManager.makeAuthenticatedRequest(endpoint, options),
    logout: () => authManager.logout(),
    getCurrentUser: () => authManager.getCurrentUser(),
    isAdmin: () => authManager.isAdmin(),
    getAuthStatus: () => authManager.getAuthStatus()
  };
};

