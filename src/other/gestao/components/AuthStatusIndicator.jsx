import React, { useState, useEffect } from 'react';
import { Box, Chip, Button, Typography, Alert } from '@mui/material';
import { CheckCircle, Error, Warning, Refresh } from '@mui/icons-material';
import { authManager } from '../utils/authManager';

const AuthStatusIndicator = ({ onStatusChange }) => {
  const [authStatus, setAuthStatus] = useState({
    traccar: null,
    gestao: null,
    loading: false
  });

  const checkAuthStatus = async () => {
    setAuthStatus(prev => ({ ...prev, loading: true }));
    
    try {
      // Verificar autenticação no Traccar
      const traccarAuth = await authManager.checkAuthentication();
      
      // Verificar autenticação no backend de gestão
      let gestaoAuth = false;
      try {
        const response = await fetch('/gestao/vehicles', {
          credentials: 'include'
        });
        gestaoAuth = response.ok;
      } catch (error) {
        console.log('Erro ao verificar gestão:', error);
      }
      
      const newStatus = {
        traccar: traccarAuth,
        gestao: gestaoAuth,
        loading: false
      };
      
      setAuthStatus(newStatus);
      
      // Notificar componente pai sobre mudanças
      if (onStatusChange) {
        onStatusChange(newStatus);
      }
      
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      setAuthStatus(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const getStatusIcon = (status) => {
    if (status === null) return <Warning />;
    if (status) return <CheckCircle />;
    return <Error />;
  };

  const getStatusColor = (status) => {
    if (status === null) return 'warning';
    if (status) return 'success';
    return 'error';
  };

  const getStatusText = (status) => {
    if (status === null) return 'Verificando...';
    if (status) return 'Conectado';
    return 'Desconectado';
  };

  const isFullyAuthenticated = authStatus.traccar && authStatus.gestao;

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Status de Autenticação:
        </Typography>
        <Chip
          icon={getStatusIcon(authStatus.traccar)}
          label={`Traccar: ${getStatusText(authStatus.traccar)}`}
          color={getStatusColor(authStatus.traccar)}
          size="small"
        />
        <Chip
          icon={getStatusIcon(authStatus.gestao)}
          label={`Gestão: ${getStatusText(authStatus.gestao)}`}
          color={getStatusColor(authStatus.gestao)}
          size="small"
        />
        <Button
          size="small"
          startIcon={<Refresh />}
          onClick={checkAuthStatus}
          disabled={authStatus.loading}
        >
          Verificar
        </Button>
      </Box>
      
      {!isFullyAuthenticated && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            {!authStatus.traccar && !authStatus.gestao && 
              "❌ Você não está logado. Faça login no Traccar primeiro para sincronizar veículos."
            }
            {authStatus.traccar && !authStatus.gestao && 
              "⚠️ Logado no Traccar, mas o backend de gestão não está acessível. Verifique se o serviço está rodando."
            }
            {!authStatus.traccar && authStatus.gestao && 
              "⚠️ Backend de gestão acessível, mas você não está logado no Traccar. Faça login primeiro."
            }
          </Typography>
        </Alert>
      )}
      
      {isFullyAuthenticated && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2">
            ✅ Tudo configurado! Você pode sincronizar veículos com o Traccar.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default AuthStatusIndicator;
