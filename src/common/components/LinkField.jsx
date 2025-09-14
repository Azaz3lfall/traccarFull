import { 
  Autocomplete, 
  Snackbar, 
  TextField, 
  Box, 
  Paper, 
  List, 
  ListItem, 
  ListItemText,
  Chip,
  IconButton
} from '@mui/material';
import { useState, useMemo, useRef } from 'react';
import { useCatchCallback, useEffectAsync } from '../../reactHelper';
import { snackBarDurationShortMs } from '../util/duration';
import { useTranslation } from './LocalizationProvider';
import fetchOrThrow from '../util/fetchOrThrow';
import CloseIcon from '@mui/icons-material/Close';

const LinkField = ({
  label,
  endpointAll,
  endpointLinked,
  baseId,
  keyBase,
  keyLink,
  keyGetter = (item) => item.id,
  titleGetter = (item) => item.name,
  zIndex = 1300,
}) => {
  const t = useTranslation();
  const [active, setActive] = useState(false);
  const [items, setItems] = useState();
  const [linked, setLinked] = useState();
  const [updated, setUpdated] = useState(false);
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffectAsync(async () => {
    if (active) {
      const response = await fetchOrThrow(endpointAll);
      setItems(await response.json());
    }
  }, [active]);

  useEffectAsync(async () => {
    if (active) {
      const response = await fetchOrThrow(endpointLinked);
      setLinked(await response.json());
    }
  }, [active]);

  const filteredOptions = useMemo(() => {
    if (!items) return [];
    if (!inputValue) return items; // Show all options when no input
    return items.filter(item => 
      titleGetter(item).toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [items, inputValue, titleGetter]);

  const createBody = (linkId) => {
    const body = {};
    body[keyBase] = baseId;
    body[keyLink] = linkId;
    return body;
  };

  const onChange = useCatchCallback(async (value) => {
    const oldValue = linked.map((it) => keyGetter(it));
    const newValue = value.map((it) => keyGetter(it));
    if (!newValue.find((it) => it < 0)) {
      const results = [];
      newValue.filter((it) => !oldValue.includes(it)).forEach((added) => {
        results.push(fetchOrThrow('/api/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createBody(added)),
        }));
      });
      oldValue.filter((it) => !newValue.includes(it)).forEach((removed) => {
        results.push(fetchOrThrow('/api/permissions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createBody(removed)),
        }));
      });
      await Promise.all(results);
      setUpdated(results.length > 0);
      setLinked(value);
    }
  }, [linked, setUpdated, setLinked]);

  const handleInputChange = (event) => {
    const value = event.target.value;
    setInputValue(value);
    setAutocompleteOpen(true);
    setHighlightedIndex(-1);
    if (!active) {
      setActive(true);
    }
  };

  const handleOptionSelect = (option) => {
    const currentLinked = linked || [];
    const isAlreadyLinked = currentLinked.some(item => keyGetter(item) === keyGetter(option));
    
    if (!isAlreadyLinked) {
      const newLinked = [...currentLinked, option];
      onChange(newLinked);
    }
    
    setInputValue(''); // Clear input after selection
    setAutocompleteOpen(false);
    setHighlightedIndex(-1);
  };

  const handleRemoveItem = (itemToRemove) => {
    const currentLinked = linked || [];
    const newLinked = currentLinked.filter(item => keyGetter(item) !== keyGetter(itemToRemove));
    onChange(newLinked);
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
    setInputValue(''); // Clear input to show all options
    setAutocompleteOpen(true);
    if (!active) {
      setActive(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setAutocompleteOpen(false);
      setHighlightedIndex(-1);
    }, 150);
  };

  return (
    <>
      <Box sx={{ position: 'relative', width: '100%' }}>
          <TextField
          ref={inputRef}
            label={label}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          fullWidth
          autoComplete="off"
            placeholder={!active ? t('reportShow') : null}
          />
        {autocompleteOpen && filteredOptions.length > 0 && (
          <Paper
            ref={listRef}
            sx={(theme) => ({
              position: 'fixed',
              zIndex: zIndex + 1000,
              maxHeight: '200px',
              minWidth: '200px',
              overflow: 'auto',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: theme.shape.borderRadius,
              boxShadow: theme.shadows[8],
              backgroundColor: theme.palette.background.paper,
              mt: 0.5,
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            })}
            style={{
              top: inputRef.current ? inputRef.current.getBoundingClientRect().bottom + window.scrollY + 4 : 0,
              left: inputRef.current ? inputRef.current.getBoundingClientRect().left + window.scrollX : 0,
              width: inputRef.current ? inputRef.current.getBoundingClientRect().width : 'auto',
            }}
          >
            <List 
              dense
              sx={(theme) => ({
                padding: 0,
                '& .MuiListItem-root': {
                  padding: '8px 16px',
                  minHeight: '40px',
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  '&:last-child': {
                    borderBottom: 'none',
                  },
                }
              })}
            >
              {filteredOptions.map((option, index) => (
                <ListItem
                  key={keyGetter(option)}
                  onClick={() => handleOptionSelect(option)}
                  sx={(theme) => ({
                    cursor: 'pointer',
                    backgroundColor: index === highlightedIndex ? theme.palette.action.selected : 'transparent',
                    transition: theme.transitions.create('background-color', {
                      duration: theme.transitions.duration.short,
                    }),
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover
                    },
                    '&:active': {
                      backgroundColor: theme.palette.action.selected
                    }
                  })}
                >
                  <ListItemText 
                    primary={titleGetter(option)}
                    sx={(theme) => ({
                      '& .MuiListItemText-primary': {
                        fontSize: '14px',
                        fontWeight: 400,
                        color: theme.palette.text.primary
                      }
                    })}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
        {linked && linked.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {linked.map((item) => (
              <Chip
                key={keyGetter(item)}
                label={titleGetter(item)}
                onDelete={() => handleRemoveItem(item)}
                deleteIcon={<CloseIcon />}
                size="small"
              />
            ))}
          </Box>
        )}
      </Box>
      <Snackbar
        open={Boolean(updated)}
        onClose={() => setUpdated(false)}
        autoHideDuration={snackBarDurationShortMs}
        message={t('sharedSaved')}
      />
    </>
  );
};

export default LinkField;
