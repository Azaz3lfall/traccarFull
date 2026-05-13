import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {object | null} props.charge – cobrança com id, amount, client_name opcional
 * @param {string} [props.clientNameFallback] – rótulo do cliente se charge.client_name vier vazio
 * @param {() => void} props.onClose
 * @param {(values: { paidAmount: number, paidAt: string, note: string }) => Promise<{ ok: boolean, message?: string }>} props.onSubmit
 */
const ManualSettlementDialog = ({
  open,
  charge,
  clientNameFallback = '',
  onClose,
  onSubmit,
}) => {
  const [paidAmount, setPaidAmount] = useState('');
  const [paidAt, setPaidAt] = useState('');
  const [note, setNote] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!open || !charge) return;
    const baseAmount = Number(charge?.amount || 0);
    setPaidAmount(Number.isFinite(baseAmount) ? baseAmount.toFixed(2) : '0.00');
    setPaidAt(new Date().toISOString().slice(0, 16));
    setNote('');
    setSubmitError('');
  }, [open, charge]);

  const handleClose = () => {
    setSubmitError('');
    onClose();
  };

  const handleConfirm = async () => {
    const amount = Number(paidAmount || 0);
    if (!Number.isFinite(amount) || amount < 0) {
      setSubmitError('Informe um valor de baixa válido.');
      return;
    }
    setSubmitError('');
    const result = await onSubmit({
      paidAmount: amount,
      paidAt,
      note,
    });
    if (result?.ok) {
      handleClose();
    } else {
      setSubmitError(result?.message || 'Não foi possível registrar a baixa manual.');
    }
  };

  const displayName = charge?.client_name || clientNameFallback || '-';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      disablePortal
    >
      <DialogTitle>Dar baixa manual</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2">
            Cliente: <strong>{displayName}</strong>
          </Typography>
          <TextField
            label="Valor pago"
            type="number"
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
          />
          <TextField
            label="Data/hora do pagamento"
            type="datetime-local"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Observação"
            multiline
            minRows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: pagamento confirmado por transferência"
          />
          {submitError ? (
            <Typography variant="body2" color="error">
              {submitError}
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleConfirm}>
          Confirmar baixa
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManualSettlementDialog;
