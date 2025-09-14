import { useState, useMemo } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, FormControl, InputLabel, MenuItem, Select, TextField, Autocomplete,
} from '@mui/material';

import { createFilterOptions } from '@mui/material/useAutocomplete';
import { makeStyles } from 'tss-react/mui';
import { useTranslation } from '../../common/components/LocalizationProvider';

const useStyles = makeStyles()((theme) => ({
  details: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    paddingBottom: theme.spacing(1),
    paddingTop: theme.spacing(3),
  },
}));

const AddAttributeDialog = ({ open, onResult, definitions, zIndex = 1300 }) => {
  const { classes } = useStyles();
  const t = useTranslation();

  const filter = createFilterOptions({
    stringify: (option) => option.name,
  });

  const options = useMemo(() => Object.entries(definitions).map(([key, value]) => ({
    key,
    name: value.name || key,
    type: value.type,
  })).sort((a, b) => a.name.localeCompare(b.name)), [definitions]);

  const [key, setKey] = useState();
  const [type, setType] = useState('string');

  return (
    <Dialog 
      open={open} 
      fullWidth 
      maxWidth="xs"
      style={{ zIndex }}
      PaperProps={{
        style: { zIndex }
      }}
      disableEnforceFocus
      disableAutoFocus
    >
      <DialogContent className={classes.details}>
        <FormControl fullWidth>
          <InputLabel>{t('sharedAttribute')}</InputLabel>
          <Select
            value={key || ''}
            onChange={(e) => {
              const selectedKey = e.target.value;
              setKey(selectedKey);
              if (selectedKey && definitions[selectedKey]) {
                setType(definitions[selectedKey].type || 'string');
              }
            }}
            MenuProps={{
              style: { zIndex: 99999 },
              disablePortal: false
            }}
          >
            {options.map((option) => (
              <MenuItem key={option.key} value={option.key}>
                {option.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl
          fullWidth
          disabled={key in definitions}
        >
          <InputLabel>{t('sharedType')}</InputLabel>
          <Select
            label={t('sharedType')}
            value={type || 'string'}
            onChange={(e) => setType(e.target.value)}
            MenuProps={{
              disablePortal: false,
              style: { zIndex: zIndex + 1 }
            }}
          >
            <MenuItem value="string">{t('sharedTypeString')}</MenuItem>
            <MenuItem value="number">{t('sharedTypeNumber')}</MenuItem>
            <MenuItem value="boolean">{t('sharedTypeBoolean')}</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button
          color="primary"
          disabled={!key}
          onClick={() => onResult({ key, type })}
        >
          {t('sharedAdd')}
        </Button>
        <Button
          autoFocus
          onClick={() => onResult(null)}
        >
          {t('sharedCancel')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddAttributeDialog;
