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
    >
      <DialogContent className={classes.details}>
        <Autocomplete
          freeSolo
          onChange={(_, option) => {
            setKey(option && typeof option === 'object' ? (option.key ?? option.inputValue) : option);
            if (option && (option.type || option.inputValue)) {
              setType(option.type);
            }
          }}
          filterOptions={(options, params) => {
            const filtered = filter(options, params);
            if (params.inputValue && !options.some((x) => (typeof x === 'object' ? x.key : x) === params.inputValue)) {
              filtered.push({ inputValue: params.inputValue, name: `${t('sharedAdd')} "${params.inputValue}"` });
            }
            return filtered;
          }}
          options={options}
          getOptionLabel={(option) =>
            option && typeof option === 'object' ? (option.inputValue || option.name) : option
          }
          renderOption={(props, option) => <li {...props}>{option.name || option}</li>}
          renderInput={(params) => <TextField {...params} label={t('sharedAttribute')} />}
          ListboxProps={{
            style: { zIndex: zIndex + 1 }
          }}
          PopperComponent={(props) => (
            <div {...props} style={{ ...props.style, zIndex: zIndex + 1 }} />
          )}
        />
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
