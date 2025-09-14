import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Checkbox,
  FormControlLabel,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Box,
} from '@mui/material';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { useRestriction } from '../../common/util/permissions';
import { useEffectAsync } from '../../reactHelper';
import fetchOrThrow from '../../common/util/fetchOrThrow';
import { prefixString } from '../../common/util/stringUtils';
import useCommandAttributes from '../../common/attributes/useCommandAttributes';

const BaseCommandView = ({
  deviceId,
  item,
  setItem,
  includeSaved = false,
  savedId,
}) => {
  console.log('=== BaseCommandView RENDER ===');
  console.log('Props received:', { deviceId, item, includeSaved, savedId });
  
  const t = useTranslation();
  const limitCommands = useRestriction('limitCommands');

  const textEnabled = useSelector((state) => state.session.server.textEnabled);

  const availableAttributes = useCommandAttributes(t);

  const [attributes, setAttributes] = useState([]);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffectAsync(async () => {
    console.log('=== BaseCommandView useEffectAsync START ===');
    console.log('Props:', { includeSaved, deviceId, limitCommands });
    console.log('Current options state:', options);
    console.log('Current loading state:', loading);
    
    setLoading(true);
    try {
      if (includeSaved) {
        console.log('Loading saved commands with deviceId:', deviceId);
        const savedResponse = await fetchOrThrow(`/api/commands/send?deviceId=${deviceId}`);
        const saved = await savedResponse.json();
        console.log('Saved commands response:', saved);
        let combined = saved.map((it) => ({ ...it, optionType: 'saved', key: `saved-${it.id}` }));
        if (!limitCommands) {
          console.log('Loading command types with deviceId:', deviceId);
          const typesResponse = await fetchOrThrow(`/api/commands/types?${new URLSearchParams({ deviceId }).toString()}`);
          const types = await typesResponse.json();
          console.log('Command types from API (with deviceId):', types);
          combined = combined.concat(types.map((it) => ({ ...it, optionType: 'type', key: `type-${it.type}` })));
        }
        console.log('Combined options (includeSaved):', combined);
        setOptions(combined);
      } else {
        console.log('Loading command types from /api/commands/types (no deviceId)');
        
        // Test with a simple fetch first
        try {
          console.log('Testing simple fetch...');
          const testResponse = await fetch('/api/commands/types');
          console.log('Test response status:', testResponse.status);
          console.log('Test response ok:', testResponse.ok);
          
          if (!testResponse.ok) {
            throw new Error(`HTTP ${testResponse.status}: ${testResponse.statusText}`);
          }
          
          const testData = await testResponse.json();
          console.log('Test data:', testData);
        } catch (testError) {
          console.error('Test fetch failed:', testError);
        }
        
        const typesResponse = await fetchOrThrow('/api/commands/types');
        console.log('Raw API response:', typesResponse);
        console.log('Response status:', typesResponse.status);
        console.log('Response ok:', typesResponse.ok);
        
        const types = await typesResponse.json();
        console.log('Command types from API (no deviceId):', types);
        console.log('Types array length:', types.length);
        
        const mappedTypes = types.map((it) => ({ ...it, optionType: 'type', key: `type-${it.type}` }));
        console.log('Mapped types:', mappedTypes);
        console.log('Setting options to:', mappedTypes);
        setOptions(mappedTypes);
      }
    } catch (error) {
      console.error('=== ERROR loading command types ===', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
      console.log('=== BaseCommandView useEffectAsync END ===');
    }
  }, []); // Simplified dependency array like CommandsPage

  useEffect(() => {
    if (item && item.type) {
      setAttributes(availableAttributes[item.type] || []);
    } else {
      setAttributes([]);
    }
  }, [availableAttributes, item]);


  console.log('BaseCommandView render - options:', options);
  console.log('BaseCommandView render - item:', item);
  console.log('BaseCommandView render - includeSaved:', includeSaved);
  console.log('BaseCommandView render - loading:', loading);

  // Get available command types
  const commandTypes = options.filter(option => option.optionType === 'type');
  console.log('Command types for Select:', commandTypes);

  // Ensure the current value is valid
  const currentValue = item.type || '';
  const isValidValue = !currentValue || commandTypes.some(option => option.type === currentValue);
  console.log('Current value:', currentValue, 'Is valid:', isValidValue);

  // Use empty string if value is invalid or still loading
  const selectValue = (loading || !isValidValue) ? '' : currentValue;

  // Restore the original value once data is loaded and value becomes valid
  useEffect(() => {
    if (!loading && currentValue && isValidValue && item.type !== currentValue) {
      console.log('Restoring original value after data load:', currentValue);
      setItem({ ...item, type: currentValue });
    }
  }, [loading, currentValue, isValidValue]);

  return (
    <>
      <FormControl fullWidth size="small">
        <InputLabel>{t('sharedType')}</InputLabel>
        <Select
          value={selectValue}
          onChange={(e) => {
            const selectedType = e.target.value;
            console.log('Selected type:', selectedType);
            if (selectedType) {
              const defaults = {};
              availableAttributes[selectedType]?.forEach((attribute) => {
                switch (attribute.type) {
                  case 'boolean':
                    defaults[attribute.key] = false;
                    break;
                  case 'number':
                    defaults[attribute.key] = 0;
                    break;
                  default:
                    defaults[attribute.key] = '';
                    break;
                }
              });
              setItem({ ...item, type: selectedType, attributes: defaults });
            } else {
              setItem({ ...item, type: '', attributes: {} });
            }
          }}
          label={t('sharedType')}
          disabled={loading}
        >
          {loading ? (
            <MenuItem disabled>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                Loading...
              </Box>
            </MenuItem>
          ) : (
            commandTypes.map((option) => (
              <MenuItem key={option.key} value={option.type}>
                {t(prefixString('command', option.type))}
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl>
      {(!includeSaved || !savedId) &&
        attributes.map(({ key, name, type }) => {
          if (type === 'boolean') {
            return (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={item.attributes[key]}
                    onChange={(e) => {
                      const updateItem = { ...item, attributes: { ...item.attributes } };
                      updateItem.attributes[key] = e.target.checked;
                      setItem(updateItem);
                    }}
                  />
                }
                label={name}
              />
            );
          }
          return (
            <TextField
              type={type === 'number' ? 'number' : 'text'}
              value={item.attributes[key]}
              onChange={(e) => {
                const updateItem = { ...item, attributes: { ...item.attributes } };
                updateItem.attributes[key] =
                  type === 'number' ? Number(e.target.value) : e.target.value;
                setItem(updateItem);
              }}
              label={name}
            />
          );
        })}
      {textEnabled && (
        <FormControlLabel
          control={
            <Checkbox
              checked={item.textChannel}
              onChange={(e) => setItem({ ...item, textChannel: e.target.checked })}
            />
          }
          label={t('commandSendSms')}
        />
      )}
      {!item.textChannel && (
        <FormControlLabel
          control={
            <Checkbox
              checked={item.attributes?.noQueue}
              onChange={(e) =>
                setItem({
                  ...item,
                  attributes: { ...item?.attributes, noQueue: e.target.checked },
                })
              }
            />
          }
          label={t('commandNoQueue')}
        />
      )}
    </>
  );
};

export default BaseCommandView;
