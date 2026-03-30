import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Alert,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { testGestaoApis, testSpecificApi } from '../utils/testApi';
import { testTraccarAuth, testGestaoAuth, testCookies } from '../utils/testAuth';

const DebugTab = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState('');

  const endpoints = [
    '/vehicles',
    '/drivers',
    '/trips',
    '/abastecimentos/todos',
    '/relatorios/custos-extras',
    '/relatorios/custos-por-viagem',
    '/relatorios/custos-por-categoria',
    '/relatorios/consumo-medio',
    '/relatorios/distancia-abastecimentos',
    '/relatorios/custo-abastecimento-total'
  ];

  const handleTestAll = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      await testGestaoApis();
      setResults('Todos os testes foram executados. Verifique o console para detalhes.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestSpecific = async () => {
    if (!selectedEndpoint) return;
    
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      const result = await testSpecificApi(selectedEndpoint);
      setResults(JSON.stringify(result, null, 2));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestAuth = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      console.log('🧪 Testando autenticação completa...');
      
      // Testar cookies
      const cookies = testCookies();
      
      // Testar autenticação do Traccar
      const traccarResult = await testTraccarAuth();
      
      // Testar autenticação do backend de gestão
      const gestaoResult = await testGestaoAuth();
      
      const results = {
        cookies,
        traccar: traccarResult,
        gestao: gestaoResult
      };
      
      setResults(JSON.stringify(results, null, 2));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          🧪 Debug - Teste de APIs
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Use esta aba para testar as APIs da gestão e verificar se estão funcionando corretamente.
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              onClick={handleTestAuth}
              disabled={loading}
              fullWidth
              color="primary"
            >
              {loading ? <CircularProgress size={20} /> : '🔐 Testar Autenticação'}
            </Button>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              onClick={handleTestAll}
              disabled={loading}
              fullWidth
              color="secondary"
            >
              {loading ? <CircularProgress size={20} /> : 'Testar Todas as APIs'}
            </Button>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Endpoint Específico</InputLabel>
              <Select
                value={selectedEndpoint}
                label="Endpoint Específico"
                onChange={(e) => setSelectedEndpoint(e.target.value)}
              >
                {endpoints.map((endpoint) => (
                  <MenuItem key={endpoint} value={endpoint}>
                    {endpoint}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <Button
              variant="outlined"
              onClick={handleTestSpecific}
              disabled={loading || !selectedEndpoint}
              fullWidth
            >
              {loading ? <CircularProgress size={20} /> : 'Testar Endpoint Específico'}
            </Button>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {results && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
              {results}
            </Typography>
          </Alert>
        )}
      </Paper>

      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          📋 Endpoints Disponíveis
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Lista de todos os endpoints da API de gestão:
        </Typography>
        
        <Box component="ul" sx={{ pl: 2 }}>
          {endpoints.map((endpoint) => (
            <Box component="li" key={endpoint} sx={{ mb: 1 }}>
              <Typography variant="body2" fontFamily="monospace">
                GET {endpoint}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
};

export default DebugTab;
