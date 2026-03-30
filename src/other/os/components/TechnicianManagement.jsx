import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  Typography,
  Box,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Search, UserPlus } from 'lucide-react';
import { getUsers, toggleTechnician } from '../utils/api';

const TechnicianManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [addSearchTerm, setAddSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await getUsers();
      setUsers(Array.isArray(response.data) ? response.data : (response.data.users || []));
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
      setError('Não foi possível carregar a lista de usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleTechnician = async (userId, currentStatus) => {
    setUpdatingId(userId);
    try {
      const newStatus = !currentStatus;
      await toggleTechnician(userId, newStatus);
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { 
          ...user, 
          is_technician: newStatus,
          attributes: { ...user.attributes, is_technician: newStatus }
        } : user
      ));
    } catch (err) {
      console.error('Erro ao alterar status de técnico:', err);
      alert('Erro ao alterar status do técnico.');
    } finally {
      setUpdatingId(null);
    }
  };

  const isTechnician = (user) => {
    return user.is_technician === true || 
           user.attributes?.is_technician === true || 
           user.attributes?.is_technician === 'true';
  };

  const currentTechnicians = users.filter(user => 
    isTechnician(user) && (
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const nonTechnicians = users.filter(user => 
    !isTechnician(user) && (
      user.name?.toLowerCase().includes(addSearchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(addSearchTerm.toLowerCase())
    )
  );

  if (loading && users.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Técnicos Cadastrados</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            size="small"
            placeholder="Buscar técnico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
          />
          <Button 
            variant="contained" 
            startIcon={<UserPlus size={18} />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Adicionar Técnico
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentTechnicians.length > 0 ? (
              currentTechnicians.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <Switch
                        checked={true}
                        onChange={() => handleToggleTechnician(user.id, true)}
                        disabled={updatingId === user.id}
                        color="primary"
                      />
                      {updatingId === user.id && <CircularProgress size={20} sx={{ ml: 1 }} />}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Nenhum técnico encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal Adicionar Técnico */}
      <Dialog 
        open={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        maxWidth="sm"
        fullWidth
        style={{ zIndex: 20001 }}
      >
        <DialogTitle>Adicionar Novo Técnico</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            sx={{ mb: 2 }}
            placeholder="Pesquisar usuários..."
            value={addSearchTerm}
            onChange={(e) => setAddSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
          />
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell align="center">Tornar Técnico</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {nonTechnicians.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Typography variant="body2">{user.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        checked={false}
                        onChange={() => handleToggleTechnician(user.id, false)}
                        disabled={updatingId === user.id}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {nonTechnicians.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} align="center">Nenhum usuário disponível.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddModalOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TechnicianManagement;
