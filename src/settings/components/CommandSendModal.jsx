import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import { useTranslation } from '../../common/components/LocalizationProvider';
import fetchOrThrow from '../../common/util/fetchOrThrow';

const DEFAULT_COMMAND_ROOT_Z = 99999;

const CommandSendModal = ({
  open,
  onClose,
  deviceId,
  deviceIds = [],
  rootZIndex = DEFAULT_COMMAND_ROOT_Z,
}) => {
  const t = useTranslation();
  const [command, setCommand] = useState('');
  const [noQueue, setNoQueue] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [sendSummary, setSendSummary] = useState(null);

  const targetDeviceIds = useMemo(
    () => [...new Set([
      ...((Array.isArray(deviceIds) ? deviceIds : []).map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id) && id > 0)),
      ...(deviceId != null ? [parseInt(deviceId, 10)] : []),
    ])],
    [deviceId, deviceIds],
  );

  const handleClose = () => {
    if (sending) return;
    setError(null);
    setSendSummary(null);
    setCommand('');
    setNoQueue(false);
    onClose();
  };

  const handleSend = async () => {
    const trimmed = command.trim();
    if (!trimmed) {
      setError('Digite o comando.');
      return;
    }
    if (targetDeviceIds.length === 0) {
      setError('Nenhum dispositivo selecionado.');
      return;
    }

    setError(null);
    setSendSummary(null);
    setSending(true);

    const results = await Promise.allSettled(
      targetDeviceIds.map(async (id) => {
        const response = await fetchOrThrow('/api/commands/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'custom',
            attributes: {
              data: trimmed,
              noQueue,
            },
            deviceId: id,
          }),
        });
        return response.ok;
      }),
    );

    const successCount = results.filter((result) => result.status === 'fulfilled').length;
    const errorCount = results.length - successCount;
    setSendSummary({ total: results.length, successCount, errorCount });
    if (errorCount > 0) {
      setError(`${t('commandError')} (${errorCount} falha(s)).`);
    } else {
      setCommand('');
    }
    setSending(false);
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        root: {
          sx: { zIndex: rootZIndex },
        },
      }}
    >
      <DialogTitle component="div">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <span>
            ENVIO DE COMANDO PARA:{' '}
            <span style={{ color: 'var(--mui-palette-primary-main)', fontWeight: 'bold' }}>
              {`${targetDeviceIds.length} dispositivo(s)`}
            </span>
          </span>
          <Typography variant="caption" color="text.secondary">
            Comando custom via canal GPRS
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {sendSummary && (
            <Alert severity={sendSummary.errorCount > 0 ? 'warning' : 'success'}>
              {`Enviados com sucesso: ${sendSummary.successCount}/${sendSummary.total}. Falhas: ${sendSummary.errorCount}.`}
            </Alert>
          )}
          <TextField
            label="Comando"
            placeholder="Digite o comando GPRS..."
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            fullWidth
            multiline
            rows={4}
            autoFocus
            disabled={sending}
          />
          <FormControlLabel
            control={(
              <Checkbox
                checked={noQueue}
                onChange={(event) => setNoQueue(event.target.checked)}
                disabled={sending}
              />
            )}
            label="Não enfileirar (noQueue)"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<ArrowBackIcon />} onClick={handleClose} disabled={sending}>
          Voltar
        </Button>
        <Button
          variant="contained"
          startIcon={sending ? <CircularProgress size={16} /> : <SendIcon />}
          onClick={handleSend}
          disabled={sending || !command.trim()}
        >
          {sending ? t('sharedLoading') : t('commandSend')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CommandSendModal;
