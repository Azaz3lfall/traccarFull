import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  clearFinancialError,
  fetchInvoiceBoleto,
  fetchInvoicePix,
  fetchMyFinancialStatus,
  fetchMyInvoices,
  sessionActions,
} from '../store';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
};

const statusLabel = (status) => {
  const map = {
    PENDING: 'Pendente',
    OVERDUE: 'Em atraso',
    RECEIVED: 'Recebida',
    CONFIRMED: 'Confirmada',
  };
  return map[String(status || '').toUpperCase()] || (status || '-');
};

const ClientFinancialPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { myStatus, myInvoices, selectedPix, selectedBoleto, error } = useSelector((state) => state.financial);
  const [pixOpen, setPixOpen] = useState(false);
  const [boletoOpen, setBoletoOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchMyFinancialStatus());
    dispatch(fetchMyInvoices());
  }, [dispatch]);

  useEffect(() => () => {
    dispatch(clearFinancialError());
  }, [dispatch]);

  const openInvoices = useMemo(
    () => (myInvoices || []).filter((inv) => ['PENDING', 'OVERDUE'].includes(String(inv.status || '').toUpperCase())),
    [myInvoices],
  );

  const handleOpenPix = async (paymentId) => {
    await dispatch(fetchInvoicePix(paymentId));
    setPixOpen(true);
  };

  const handleOpenBoleto = async (paymentId) => {
    await dispatch(fetchInvoiceBoleto(paymentId));
    setBoletoOpen(true);
  };

  const copyText = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      // ignore clipboard errors in unsupported browsers
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/session', {
        method: 'DELETE',
        credentials: 'include',
      });
    } catch (e) {
      // continue logout flow even if session delete fails
    } finally {
      dispatch(sessionActions.updateUser(null));
      navigate('/login');
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Meu Financeiro</Typography>
          <Button variant="outlined" color="inherit" startIcon={<ExitToAppIcon />} onClick={handleLogout}>
            Logout
          </Button>
        </Stack>
        {error && <Alert severity="warning">{error}</Alert>}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Valor em aberto</Typography>
              <Typography variant="h5">{currency.format(Number(myStatus?.openAmount || 0))}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Próximo vencimento</Typography>
              <Typography variant="h5">{formatDate(myStatus?.nextDueDate)}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Status</Typography>
              <Typography variant="h5">{myStatus?.billing_status === 'inadimplente' ? 'Inadimplente' : 'Ativo'}</Typography>
            </CardContent>
          </Card>
        </Stack>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Faturas</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell>Vencimento</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(openInvoices.length ? openInvoices : myInvoices || []).map((invoice) => {
                  const isPaid = ['RECEIVED', 'CONFIRMED'].includes(String(invoice.status || '').toUpperCase());
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Chip
                          size="small"
                          label={statusLabel(invoice.status)}
                          color={isPaid ? 'success' : (String(invoice.status || '').toUpperCase() === 'OVERDUE' ? 'error' : 'warning')}
                        />
                      </TableCell>
                      <TableCell>{currency.format(Number(invoice.value || 0))}</TableCell>
                      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell>{invoice.description || '-'}</TableCell>
                      <TableCell align="right">
                        {isPaid ? (
                          <Typography variant="caption" color="text.secondary">Pago</Typography>
                        ) : (
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button size="small" startIcon={<QrCode2Icon />} onClick={() => handleOpenPix(invoice.id)}>
                              Pix
                            </Button>
                            <Button size="small" startIcon={<ReceiptLongIcon />} onClick={() => handleOpenBoleto(invoice.id)}>
                              Boleto
                            </Button>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Stack>

      <Dialog
        open={pixOpen}
        onClose={() => setPixOpen(false)}
        disablePortal
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Pagamento via Pix</DialogTitle>
        <DialogContent dividers>
          {selectedPix?.encodedImage ? (
            <Box
              component="img"
              alt="QR Code Pix"
              sx={{ width: 240, height: 240, display: 'block', mx: 'auto', mb: 2 }}
              src={`data:image/png;base64,${selectedPix.encodedImage}`}
            />
          ) : null}
          <Typography variant="body2" sx={{ mb: 1 }}>
            Copia e cola:
          </Typography>
          <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
            {selectedPix?.payload || '-'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button startIcon={<ContentCopyIcon />} onClick={() => copyText(selectedPix?.payload)}>
            Copiar código
          </Button>
          <Button onClick={() => setPixOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={boletoOpen} onClose={() => setBoletoOpen(false)} disablePortal fullWidth maxWidth="sm">
        <DialogTitle>Boleto</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Linha digitável:
          </Typography>
          <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
            {selectedBoleto?.identificationField || '-'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button startIcon={<ContentCopyIcon />} onClick={() => copyText(selectedBoleto?.identificationField)}>
            Copiar linha
          </Button>
          {selectedBoleto?.bankSlipUrl && (
            <Button
              startIcon={<OpenInNewIcon />}
              onClick={() => window.open(selectedBoleto.bankSlipUrl, '_blank', 'noopener,noreferrer')}
            >
              Abrir PDF
            </Button>
          )}
          <Button onClick={() => setBoletoOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientFinancialPage;
