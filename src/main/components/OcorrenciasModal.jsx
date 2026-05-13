import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@mui/material/styles';
import { Autocomplete, Button, CircularProgress, TextField } from '@mui/material';
import { ChevronLeft } from 'lucide-react';
import { useThemeColors } from '../../common/components/ThemeProvider';

const ocorrenciaTypes = [
  { value: 'emergencia_medica', label: 'Emergência Médica' },
  { value: 'acidente', label: 'Acidente' },
  { value: 'assalto', label: 'Assalto' },
  { value: 'incendio', label: 'Incêndio' },
  { value: 'violencia_domestica', label: 'Violência Doméstica' },
  { value: 'outros', label: 'Outros' },
];

const fieldSx = (colors) => ({
  '& .MuiOutlinedInputRoot': {
    backgroundColor: colors.secondary,
    '& fieldset': { borderColor: colors.border },
    '&:hover fieldset': { borderColor: colors.primary },
    '&.Mui-focused fieldset': { borderColor: colors.primary },
  },
  '& .MuiInputLabelRoot': {
    color: colors.textSecondary,
    '&.Mui-focused': { color: colors.primary },
  },
});

const autocompletePaperComponent = (colors) => (props) => (
  <div
    {...props}
    style={{
      ...props.style,
      zIndex: 10006,
      border: `1px solid ${colors.border}`,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)',
      borderRadius: '8px',
      backgroundColor: colors.surface,
    }}
  />
);

const OcorrenciasModal = ({
  open,
  onClose,
  ocorrenciaNumber,
  ocorrenciaData,
  setOcorrenciaData,
  ocorrenciaAddress,
  setOcorrenciaAddress,
  addressSearchResults,
  setAddressSearchResults,
  isSearchingAddress,
  addressAutocompleteOpen,
  setAddressAutocompleteOpen,
  handleAddressInputChange,
  handleAddressSelect,
  handleSaveOcorrencia,
  isSavingOcorrencia,
}) => {
  const colors = useThemeColors();
  const muiTheme = useTheme();
  const PaperComponent = autocompletePaperComponent(colors);

  const listboxProps = { style: { zIndex: 10006 } };
  const popperProps = { popper: { style: { zIndex: 10006 } } };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="ocorrencias-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10005,
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              backgroundColor: colors.surface,
              borderRadius: '12px',
              width: '90vw',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px',
              borderBottom: `1px solid ${colors.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={onClose}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.textSecondary,
                    borderRadius: '4px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.menuHover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <ChevronLeft size={24} />
                </button>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: colors.text }}>
                  Triagem {ocorrenciaNumber}
                </h2>
              </div>
            </div>

            {/* Modal Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Número de Origem */}
                <TextField
                  fullWidth
                  label="Número de Origem"
                  value={ocorrenciaData.numeroOrigem}
                  onChange={(e) => setOcorrenciaData({ ...ocorrenciaData, numeroOrigem: e.target.value })}
                  size="small"
                  sx={fieldSx(colors)}
                />

                {/* Data/Hora da chamada */}
                <TextField
                  fullWidth
                  label="Data/Hora da chamada"
                  value={ocorrenciaData.dataHoraChamada}
                  onChange={(e) => setOcorrenciaData({ ...ocorrenciaData, dataHoraChamada: e.target.value })}
                  size="small"
                  sx={fieldSx(colors)}
                />

                {/* Nome */}
                <TextField
                  fullWidth
                  label="Nome"
                  value={ocorrenciaData.nome}
                  onChange={(e) => setOcorrenciaData({ ...ocorrenciaData, nome: e.target.value })}
                  size="small"
                  sx={fieldSx(colors)}
                />

                {/* Endereço da Ocorrência */}
                <Autocomplete
                  freeSolo
                  open={addressAutocompleteOpen}
                  onOpen={() => {
                    if (addressSearchResults.length > 0) setAddressAutocompleteOpen(true);
                  }}
                  onClose={() => setAddressAutocompleteOpen(false)}
                  options={addressSearchResults}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    return option.properties?.display_name || option.text || option.place_name || '';
                  }}
                  isOptionEqualToValue={(option, value) => {
                    if (typeof option === 'string' || typeof value === 'string') return option === value;
                    return option.place_name === value?.place_name;
                  }}
                  value={ocorrenciaData.endereco}
                  onInputChange={(event, newInputValue, reason) => {
                    if (reason === 'input') handleAddressInputChange(newInputValue);
                  }}
                  onChange={(event, newValue, reason) => {
                    if (reason === 'selectOption' && newValue && typeof newValue !== 'string') {
                      handleAddressSelect(newValue);
                    } else if (reason === 'clear') {
                      setOcorrenciaData((prev) => ({ ...prev, endereco: '' }));
                      setOcorrenciaAddress(null);
                      setAddressSearchResults([]);
                      setAddressAutocompleteOpen(false);
                    }
                  }}
                  loading={isSearchingAddress}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Endereço da Ocorrência"
                      placeholder="Digite pelo menos 5 caracteres para buscar"
                      size="small"
                      sx={fieldSx(colors)}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option.place_name || option.text}>
                      <div style={{ color: colors.text, fontSize: '14px' }}>
                        {option.properties?.display_name || option.text || option.place_name}
                      </div>
                    </li>
                  )}
                  fullWidth
                  size="small"
                  disablePortal={false}
                  ListboxProps={listboxProps}
                  componentsProps={popperProps}
                  PaperComponent={PaperComponent}
                  sx={{ '& .MuiAutocomplete-popper': { zIndex: '10006 !important' } }}
                />

                {/* Tipo de ocorrência */}
                <Autocomplete
                  options={ocorrenciaTypes}
                  getOptionLabel={(option) => option.label || ''}
                  isOptionEqualToValue={(option, value) => option.value === value?.value}
                  value={ocorrenciaData.tipoOcorrencia
                    ? ocorrenciaTypes.find((opt) => opt.value === ocorrenciaData.tipoOcorrencia) || null
                    : null}
                  onChange={(event, newValue) => {
                    setOcorrenciaData({ ...ocorrenciaData, tipoOcorrencia: newValue ? newValue.value : '' });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Tipo de ocorrência"
                      placeholder="Selecione um tipo"
                      size="small"
                      sx={fieldSx(colors)}
                    />
                  )}
                  fullWidth
                  size="small"
                  disablePortal={false}
                  ListboxProps={listboxProps}
                  componentsProps={popperProps}
                  PaperComponent={PaperComponent}
                  sx={{ '& .MuiAutocomplete-popper': { zIndex: '10006 !important' } }}
                />
              </div>

              {/* Save Button */}
              <div style={{
                padding: '20px',
                borderTop: `1px solid ${colors.border}`,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
              }}>
                <Button
                  variant="contained"
                  onClick={handleSaveOcorrencia}
                  disabled={isSavingOcorrencia || !ocorrenciaAddress}
                  sx={{
                    backgroundColor: muiTheme.palette.mode === 'dark' ? '#2563eb' : '#1d4ed8',
                    color: '#ffffff',
                    fontWeight: '600',
                    '&:hover': {
                      backgroundColor: muiTheme.palette.mode === 'dark' ? '#1d4ed8' : '#1e40af',
                    },
                    '&:disabled': {
                      backgroundColor: colors.border,
                      color: colors.textSecondary,
                      opacity: 0.6,
                    },
                  }}
                >
                  {isSavingOcorrencia ? (
                    <>
                      <CircularProgress size={16} sx={{ marginRight: '8px', color: 'inherit' }} />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OcorrenciasModal;
