// Script de diagnóstico para problemas de autenticação
export const runAuthDiagnostic = async () => {
  console.log('🔍 DIAGNÓSTICO DE AUTENTICAÇÃO - INICIANDO...');
  
  const results = {
    traccarSession: null,
    gestaoAuth: null,
    cookies: null,
    userInfo: null,
    recommendations: []
  };

  // 1. Verificar sessão do Traccar
  try {
    console.log('1️⃣ Testando sessão do Traccar...');
    const traccarResponse = await fetch('/api/session', {
      credentials: 'include'
    });
    
    results.traccarSession = {
      status: traccarResponse.status,
      ok: traccarResponse.ok
    };
    
    if (traccarResponse.ok) {
      const user = await traccarResponse.json();
      results.userInfo = user;
      console.log('✅ Sessão Traccar ativa:', user);
    } else {
      console.log('❌ Sessão Traccar inativa:', traccarResponse.status);
      results.recommendations.push('Fazer login novamente no Traccar');
    }
  } catch (error) {
    console.error('❌ Erro ao verificar sessão Traccar:', error);
    results.traccarSession = { error: error.message };
    results.recommendations.push('Verificar conectividade com o servidor');
  }

  // 2. Verificar autenticação no backend de gestão
  try {
    console.log('2️⃣ Testando autenticação do backend de gestão...');
    const gestaoResponse = await fetch('/gestao/vehicles', {
      credentials: 'include'
    });
    
    results.gestaoAuth = {
      status: gestaoResponse.status,
      ok: gestaoResponse.ok
    };
    
    if (gestaoResponse.ok) {
      console.log('✅ Backend de gestão aceita autenticação');
    } else {
      console.log('❌ Backend de gestão rejeita autenticação:', gestaoResponse.status);
      
      // Tentar extrair detalhes do erro
      try {
        const errorData = await gestaoResponse.json();
        console.log('Detalhes do erro:', errorData);
        results.gestaoAuth.error = errorData;
      } catch (e) {
        results.gestaoAuth.error = 'Erro não parseável';
      }
      
      results.recommendations.push('Verificar configuração do backend de gestão');
      results.recommendations.push('Confirmar que o backend aceita cookies de sessão do Traccar');
    }
  } catch (error) {
    console.error('❌ Erro ao testar backend de gestão:', error);
    results.gestaoAuth = { error: error.message };
    results.recommendations.push('Verificar se o backend de gestão está rodando');
  }

  // 3. Verificar cookies
  try {
    console.log('3️⃣ Verificando cookies...');
    const cookies = document.cookie;
    results.cookies = cookies;
    
    if (cookies.includes('JSESSIONID') || cookies.includes('session')) {
      console.log('✅ Cookies de sessão encontrados');
    } else {
      console.log('⚠️ Nenhum cookie de sessão encontrado');
      results.recommendations.push('Verificar se cookies estão sendo definidos corretamente');
    }
  } catch (error) {
    console.error('❌ Erro ao verificar cookies:', error);
  }

  // 4. Verificar headers de requisição
  try {
    console.log('4️⃣ Testando headers de requisição...');
    const testResponse = await fetch('/gestao/auth/user', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status do endpoint de auth:', testResponse.status);
    console.log('Headers da resposta:', [...testResponse.headers.entries()]);
  } catch (error) {
    console.error('❌ Erro ao testar headers:', error);
  }

  // 5. Gerar recomendações baseadas nos resultados
  console.log('\n📋 RESUMO DO DIAGNÓSTICO:');
  console.log('Sessão Traccar:', results.traccarSession);
  console.log('Auth Gestão:', results.gestaoAuth);
  console.log('Usuário:', results.userInfo);
  
  if (results.recommendations.length > 0) {
    console.log('\n💡 RECOMENDAÇÕES:');
    results.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }

  return results;
};

// Função para testar login específico
export const testLogin = async (email, password) => {
  console.log('🔐 Testando login com credenciais...');
  
  try {
    const response = await fetch('/api/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      credentials: 'include',
      body: new URLSearchParams({
        email: email,
        password: password
      })
    });
    
    console.log('Status do login:', response.status);
    
    if (response.ok) {
      const user = await response.json();
      console.log('✅ Login bem-sucedido:', user);
      return { success: true, user };
    } else {
      const errorText = await response.text();
      console.log('❌ Falha no login:', errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error('❌ Erro no teste de login:', error);
    return { success: false, error: error.message };
  }
};

// Função para verificar configuração do backend
export const checkBackendConfig = async () => {
  console.log('⚙️ Verificando configuração do backend...');
  
  const endpoints = [
    '/gestao/health',
    '/gestao/auth/user',
    '/gestao/vehicles',
    '/api/server'
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        credentials: 'include'
      });
      
      results[endpoint] = {
        status: response.status,
        ok: response.ok,
        headers: [...response.headers.entries()]
      };
      
      console.log(`${endpoint}: ${response.status} ${response.ok ? '✅' : '❌'}`);
    } catch (error) {
      results[endpoint] = { error: error.message };
      console.log(`${endpoint}: ❌ ${error.message}`);
    }
  }
  
  return results;
};
