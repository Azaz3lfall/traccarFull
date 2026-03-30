import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Alert,
  Box,
  Typography,
  Chip,
  InputAdornment,
  TextField,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { fetchClients, clientsActions } from '../../store';
import ClientFormModal from '../ClientFormModal';
import { useThemeColors } from '../../common/components/ThemeProvider';

const ClientsManager = () => {
  const dispatch = useDispatch();
  const muiTheme = useTheme();
  const themeColors = useThemeColors();
  const { items, status, error } = useSelector((state) => state.clients);

  const [keyword, setKeyword] = useState('');
  const [openDialog, setOpenDialog] = useState(false);

  const filteredClients = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    if (!keyword || !keyword.trim()) return list;
    const lower = keyword.trim().toLowerCase();
    return list.filter((c) =>
      (c.name || '').toLowerCase().includes(lower) ||
      (c.email || '').toLowerCase().includes(lower) ||
      (c.tax_id || '').toLowerCase().includes(lower) ||
      (c.contact_phone || '').toLowerCase().includes(lower)
    );
  }, [items, keyword]);

  useEffect(() => {
    dispatch(fetchClients());
  }, [dispatch]);

  useEffect(() => {
    if (!openDialog && error) {
      dispatch(clientsActions.clearError());
    }
  }, [openDialog, error, dispatch]);

  const handleOpenDialog = () => {
    setOpenDialog(true);
    dispatch(clientsActions.clearError());
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    dispatch(clientsActions.clearError());
  };

  return (
    <Box sx={{ p: 3, bgcolor: themeColors.background }}>
      <Paper elevation={3} sx={{ p: 3, bgcolor: themeColors.surface, color: themeColors.text }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ color: themeColors.text }}>Gerenciamento de Clientes</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            sx={{
              bgcolor: muiTheme.palette.primary.main,
              color: muiTheme.palette.primary.contrastText,
              '&:hover': { bgcolor: muiTheme.palette.primary.dark },
            }}
          >
            Novo Cliente
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clientsActions.clearError())}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          placeholder="Buscar por nome, email, CPF/CNPJ..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          size="small"
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              backgroundColor: themeColors.secondary,
              '& fieldset': { borderColor: themeColors.border },
            },
            '& .MuiInputBase-input': { color: themeColors.text },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: themeColors.text, fontWeight: 600 }}>Nome</TableCell>
                <TableCell sx={{ color: themeColors.text, fontWeight: 600 }}>Tipo</TableCell>
                <TableCell sx={{ color: themeColors.text, fontWeight: 600 }}>CPF/CNPJ</TableCell>
                <TableCell sx={{ color: themeColors.text, fontWeight: 600 }}>Telefone</TableCell>
                <TableCell sx={{ color: themeColors.text, fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ color: themeColors.text, fontWeight: 600 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {status === 'loading' && items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : error && items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Alert severity="error">{error}</Alert>
                  </TableCell>
                </TableRow>
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {keyword.trim() ? 'Nenhum cliente corresponde à busca' : 'Nenhum cliente encontrado'}
                    </Typography>
                  </TableCell>
                </TableRow>
                ) : (
                filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell sx={{ color: themeColors.text }}>{client.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={client.type}
                        size="small"
                        sx={{
                          bgcolor: themeColors.secondary,
                          color: themeColors.text,
                          border: `1px solid ${themeColors.border}`,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: themeColors.text }}>{client.tax_id || '-'}</TableCell>
                    <TableCell sx={{ color: themeColors.text }}>{client.contact_phone || '-'}</TableCell>
                    <TableCell sx={{ color: themeColors.text }}>{client.email || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={client.active ? 'Ativo' : 'Inativo'}
                        size="small"
                        color={client.active ? 'success' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <ClientFormModal
        open={openDialog}
        onClose={handleCloseDialog}
        clientId={null}
        onSuccess={() => dispatch(fetchClients())}
        compact={true}
      />
    </Box>
  );
};

export default ClientsManager;
