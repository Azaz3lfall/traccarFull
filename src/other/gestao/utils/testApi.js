// Arquivo para testar as APIs da gestão
import { makeApiRequest } from './apiUtils';

export const testGestaoApis = async () => {
  console.log('🧪 Testando APIs da Gestão...');
  
  try {
    // Testar autenticação
    console.log('1. Testando autenticação...');
    const authResponse = await fetch('/auth/user', { credentials: 'include' });
    console.log('Auth status:', authResponse.status);
    
    if (!authResponse.ok) {
      console.log('❌ Usuário não autenticado');
      return;
    }
    
    // Testar veículos
    console.log('2. Testando veículos...');
    const vehicles = await makeApiRequest('/vehicles');
    console.log('Veículos:', vehicles);
    
    // Testar motoristas
    console.log('3. Testando motoristas...');
    const drivers = await makeApiRequest('/drivers');
    console.log('Motoristas:', drivers);
    
    // Testar viagens
    console.log('4. Testando viagens...');
    const trips = await makeApiRequest('/trips');
    console.log('Viagens:', trips);
    
    // Testar abastecimentos
    console.log('5. Testando abastecimentos...');
    const refuels = await makeApiRequest('/abastecimentos/todos');
    console.log('Abastecimentos:', refuels);
    
    console.log('✅ Todos os testes passaram!');
    
  } catch (error) {
    console.error('❌ Erro nos testes:', error);
  }
};

// Função para testar uma API específica
export const testSpecificApi = async (endpoint) => {
  try {
    console.log(`🧪 Testando ${endpoint}...`);
    const result = await makeApiRequest(endpoint);
    console.log(`✅ ${endpoint}:`, result);
    return result;
  } catch (error) {
    console.error(`❌ ${endpoint}:`, error);
    throw error;
  }
};



