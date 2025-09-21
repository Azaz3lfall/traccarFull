import {
  useState,
  useMemo,
  useRef,
} from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';

import { makeStyles } from 'tss-react/mui';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { useThemeColors } from '../../common/components/ThemeProvider';

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
  const colors = useThemeColors();

  const [key, setKey] = useState();
  const [type, setType] = useState('string');
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const options = useMemo(() => Object.entries(definitions).map(([key, value]) => ({
    key,
    name: value.name || key,
    type: value.type,
  })).sort((a, b) => a.name.localeCompare(b.name)), [definitions]);

  const filteredOptions = useMemo(() => {
    if (!inputValue) return options;
    return options.filter(option => 
      option.name.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [options, inputValue]);

  const handleInputChange = (event) => {
    const value = event.target.value;
    setInputValue(value);
    setKey(value);
    setAutocompleteOpen(true);
    setHighlightedIndex(-1);
    
    // Find matching option and set type
    const matchingOption = options.find(option => option.name === value);
    if (matchingOption) {
      setType(matchingOption.type || 'string');
    }
  };

  const handleOptionSelect = (option) => {
    setKey(option.key);
    setInputValue(option.name);
    setType(option.type || 'string');
    setAutocompleteOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (!autocompleteOpen) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleOptionSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setAutocompleteOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleInputFocus = () => {
    setAutocompleteOpen(true);
  };

  const handleInputBlur = () => {
    // Delay closing to allow clicks on options
    setTimeout(() => {
      setAutocompleteOpen(false);
      setHighlightedIndex(-1);
    }, 150);
  };

  return (
    <Dialog 
      open={open} 
      fullWidth 
      maxWidth="xs"
      style={{ zIndex: Math.max(zIndex, 99999) }}
      PaperProps={{
        style: { zIndex: Math.max(zIndex, 99999) }
      }}
      disableEnforceFocus
      disableAutoFocus
    >
      <DialogContent className={classes.details}>
        <Box sx={{ position: 'relative', width: '100%' }}>
          <TextField
            ref={inputRef}
            label={t('sharedAttribute')}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            fullWidth
            autoComplete="off"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.border,
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.primary,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.primary,
                  borderWidth: '2px',
                },
                '& .MuiInputBase-input': {
                  color: colors.text,
                },
              },
              '& .MuiInputLabel-root': {
                color: colors.textSecondary,
                '&.Mui-focused': {
                  color: colors.primary,
                },
              },
            }}
          />
          {autocompleteOpen && filteredOptions.length > 0 && (
            <Paper
              ref={listRef}
              sx={{
                position: 'fixed',
                zIndex: 999999,
                maxHeight: '200px',
                minWidth: '200px',
                overflow: 'auto',
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                backgroundColor: colors.surface,
                mt: 0.5,
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
                scrollbarWidth: 'none', // Firefox
                msOverflowStyle: 'none', // IE and Edge
              }}
              style={{
                top: inputRef.current ? inputRef.current.getBoundingClientRect().bottom + window.scrollY + 4 : 0,
                left: inputRef.current ? inputRef.current.getBoundingClientRect().left + window.scrollX : 0,
                width: inputRef.current ? inputRef.current.getBoundingClientRect().width : 'auto',
              }}
            >
              <List 
                dense
                sx={{
                  padding: 0,
                  '& .MuiListItem-root': {
                    padding: '8px 16px',
                    minHeight: '40px',
                    borderBottom: `1px solid ${colors.border}`,
                    '&:last-child': {
                      borderBottom: 'none',
                    },
                  }
                }}
              >
                {filteredOptions.map((option, index) => (
                  <ListItem
                    key={option.key}
                    onClick={() => handleOptionSelect(option)}
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: index === highlightedIndex ? colors.hover : 'transparent',
                      transition: 'background-color 0.2s ease',
                      '&:hover': {
                        backgroundColor: colors.hover
                      },
                      '&:active': {
                        backgroundColor: colors.primary + '20'
                      }
                    }}
                  >
                    <ListItemText 
                      primary={option.name}
                      sx={{
                        '& .MuiListItemText-primary': {
                          fontSize: '14px',
                          fontWeight: 400,
                          color: colors.text
                        }
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Box>
        <FormControl
          fullWidth
          disabled={key in definitions}
        >
          <InputLabel 
            sx={{ 
              color: colors.textSecondary,
              '&.Mui-focused': {
                color: colors.primary,
              },
            }}
          >
            {t('sharedType')}
          </InputLabel>
          <Select
            label={t('sharedType')}
            value={type || 'string'}
            onChange={(e) => setType(e.target.value)}
            MenuProps={{
              disablePortal: false,
              style: { zIndex: 999999 }
            }}
            sx={{
              borderRadius: '8px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: colors.border,
                borderRadius: '8px',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: colors.primary,
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: colors.primary,
                borderWidth: '2px',
              },
              '& .MuiSelect-select': {
                color: colors.text,
              },
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
