// Função para testar a autenticação do Traccar
export const testTraccarAuth = async () => {
  console.log('🧪 Testando autenticação do Traccar...');
  
  try {
    // Testar se a sessão do Traccar está ativa
    const response = await fetch('/api/session', {
      credentials: 'include'
    });
    
    console.log('Status da sessão Traccar:', response.status);
    
    if (response.ok) {
      const user = await response.json();
      console.log('Usuário Traccar:', user);
      return { success: true, user };
    } else {
      console.log('❌ Sessão Traccar não ativa');
      return { success: false, error: 'Sessão não ativa' };
    }
  } catch (error) {
    console.error('❌ Erro ao testar autenticação:', error);
    return { success: false, error: error.message };
  }
};

// Função para testar se o backend de gestão aceita a autenticação
export const testGestaoAuth = async () => {
  console.log('🧪 Testando autenticação do backend de gestão...');
  
  try {
    const response = await fetch('/gestao/vehicles', {
      credentials: 'include'
    });
    
    console.log('Status da API de gestão:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Dados da API de gestão:', data);
      return { success: true, data };
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ Erro na API de gestão:', errorData);
      return { success: false, error: errorData.error || 'Erro desconhecido' };
    }
  } catch (error) {
    console.error('❌ Erro ao testar API de gestão:', error);
    return { success: false, error: error.message };
  }
};

// Função para testar cookies
export const testCookies = () => {
  console.log('🍪 Cookies atuais:', document.cookie);
  
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});
  
  console.log('Cookies parseados:', cookies);
  return cookies;
};



