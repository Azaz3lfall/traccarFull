import React, { useState } from 'react';
import { runAuthDiagnostic, testLogin, checkBackendConfig } from '../utils/authDiagnostic';
import { useAuthManager } from '../utils/authManager';

const AuthDiagnostic = () => {
  const [diagnosticResults, setDiagnosticResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loginTest, setLoginTest] = useState({ email: '', password: '' });
  const [loginResults, setLoginResults] = useState(null);
  
  const authManager = useAuthManager();

  const runDiagnostic = async () => {
    setIsRunning(true);
    try {
      const results = await runAuthDiagnostic();
      setDiagnosticResults(results);
    } catch (error) {
      console.error('Erro ao executar diagnóstico:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const testLoginCredentials = async () => {
    if (!loginTest.email || !loginTest.password) {
      alert('Por favor, preencha email e senha');
      return;
    }

    setIsRunning(true);
    try {
      const results = await testLogin(loginTest.email, loginTest.password);
      setLoginResults(results);
    } catch (error) {
      console.error('Erro ao testar login:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const checkBackend = async () => {
    setIsRunning(true);
    try {
      const results = await checkBackendConfig();
      console.log('Configuração do backend:', results);
      alert('Resultados do backend salvos no console');
    } catch (error) {
      console.error('Erro ao verificar backend:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const forceReauth = async () => {
    setIsRunning(true);
    try {
      const success = await authManager.checkAuthentication();
      if (success) {
        alert('✅ Reautenticação bem-sucedida!');
      } else {
        alert('❌ Falha na reautenticação. Verifique as credenciais.');
      }
    } catch (error) {
      console.error('Erro na reautenticação:', error);
      alert('❌ Erro na reautenticação');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>🔍 Diagnóstico de Autenticação - Sistema de Gestão</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runDiagnostic} 
          disabled={isRunning}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer'
          }}
        >
          {isRunning ? '🔄 Executando...' : '🔍 Executar Diagnóstico'}
        </button>

        <button 
          onClick={checkBackend} 
          disabled={isRunning}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer'
          }}
        >
          ⚙️ Verificar Backend
        </button>

        <button 
          onClick={forceReauth} 
          disabled={isRunning}
          style={{ 
            padding: '10px 20px',
            backgroundColor: '#ffc107',
            color: 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer'
          }}
        >
          🔐 Forçar Reautenticação
        </button>
      </div>

      {/* Teste de Login */}
      <div style={{ 
        border: '1px solid #ddd', 
        padding: '15px', 
        borderRadius: '4px',
        marginBottom: '20px',
        backgroundColor: '#f8f9fa'
      }}>
        <h3>🔐 Teste de Login</h3>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="email"
            placeholder="Email"
            value={loginTest.email}
            onChange={(e) => setLoginTest({...loginTest, email: e.target.value})}
            style={{ padding: '8px', marginRight: '10px', width: '200px' }}
          />
          <input
            type="password"
            placeholder="Senha"
            value={loginTest.password}
            onChange={(e) => setLoginTest({...loginTest, password: e.target.value})}
            style={{ padding: '8px', marginRight: '10px', width: '200px' }}
          />
          <button 
            onClick={testLoginCredentials}
            disabled={isRunning}
            style={{ 
              padding: '8px 16px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning ? 'not-allowed' : 'pointer'
            }}
          >
            Testar Login
          </button>
        </div>
        
        {loginResults && (
          <div style={{ 
            padding: '10px', 
            backgroundColor: loginResults.success ? '#d4edda' : '#f8d7da',
            border: `1px solid ${loginResults.success ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '4px'
          }}>
            <strong>{loginResults.success ? '✅' : '❌'} Resultado:</strong>
            {loginResults.success ? (
              <div>
                <p>Login bem-sucedido!</p>
                <pre>{JSON.stringify(loginResults.user, null, 2)}</pre>
              </div>
            ) : (
              <p>Erro: {loginResults.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Resultados do Diagnóstico */}
      {diagnosticResults && (
        <div style={{ 
          border: '1px solid #ddd', 
          padding: '15px', 
          borderRadius: '4px',
          backgroundColor: '#fff'
        }}>
          <h3>📋 Resultados do Diagnóstico</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <h4>Sessão Traccar:</h4>
            <p style={{ 
              color: diagnosticResults.traccarSession?.ok ? 'green' : 'red',
              fontWeight: 'bold'
            }}>
              {diagnosticResults.traccarSession?.ok ? '✅ Ativa' : '❌ Inativa'} 
              (Status: {diagnosticResults.traccarSession?.status})
            </p>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <h4>Backend de Gestão:</h4>
            <p style={{ 
              color: diagnosticResults.gestaoAuth?.ok ? 'green' : 'red',
              fontWeight: 'bold'
            }}>
              {diagnosticResults.gestaoAuth?.ok ? '✅ Aceita autenticação' : '❌ Rejeita autenticação'} 
              (Status: {diagnosticResults.gestaoAuth?.status})
            </p>
            {diagnosticResults.gestaoAuth?.error && (
              <pre style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '10px', 
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                {JSON.stringify(diagnosticResults.gestaoAuth.error, null, 2)}
              </pre>
            )}
          </div>

          {diagnosticResults.userInfo && (
            <div style={{ marginBottom: '15px' }}>
              <h4>Informações do Usuário:</h4>
              <pre style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '10px', 
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                {JSON.stringify(diagnosticResults.userInfo, null, 2)}
              </pre>
            </div>
          )}

          {diagnosticResults.recommendations && diagnosticResults.recommendations.length > 0 && (
            <div>
              <h4>💡 Recomendações:</h4>
              <ul>
                {diagnosticResults.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Status Atual */}
      <div style={{ 
        border: '1px solid #ddd', 
        padding: '15px', 
        borderRadius: '4px',
        marginTop: '20px',
        backgroundColor: '#f8f9fa'
      }}>
        <h3>📊 Status Atual</h3>
        <p><strong>Autenticado:</strong> {authManager.getAuthStatus() ? '✅ Sim' : '❌ Não'}</p>
        <p><strong>Usuário:</strong> {authManager.getCurrentUser()?.name || 'Nenhum'}</p>
        <p><strong>Admin:</strong> {authManager.isAdmin() ? '✅ Sim' : '❌ Não'}</p>
      </div>
    </div>
  );
};

export default AuthDiagnostic;
