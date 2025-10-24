import React from 'react';
import { TextField, Typography, Box } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import useTimeFilter from '../hooks/useTimeFilter';
import { useThemeColors } from '../common/components/ThemeProvider';

/**
 * Demo component showing how to use the reusable time filter hook
 * This demonstrates how easy it is to add time-based filtering to any component
 */
const TimeFilterDemo = ({ items = [], isVisible = true }) => {
  const colors = useThemeColors();

  // Use the reusable time filter hook
  const {
    searchKeyword,
    selectedTimeFilter,
    filteredItems,
    filterCounts,
    timeFilterOptions,
    handleTimeFilterSelect,
    handleSearchChange,
    getCurrentFilterInfo
  } = useTimeFilter(items, {
    dateField: 'lastUpdate', // Change this to any date field in your data
    searchFields: ['name', 'uniqueId', 'phone', 'model', 'contact'], // Customize search fields
    isVisible
  });

  return (
    <Box>
      <Typography variant="h6" style={{ marginBottom: '16px', color: colors.text }}>
        Time Filter Demo - {filteredItems.length} items
      </Typography>

      {/* Search Input */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search items..."
        value={searchKeyword}
        onChange={(e) => handleSearchChange(e.target.value)}
        InputProps={{
          startAdornment: <SearchIcon style={{ color: colors.textSecondary, marginRight: '8px' }} />,
        }}
        style={{ marginBottom: '16px' }}
      />

      {/* Time Filter Buttons */}
      <Box style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {timeFilterOptions.map((option) => {
          const isSelected = selectedTimeFilter === option.key;
          return (
            <div
              key={option.key}
              onClick={() => handleTimeFilterSelect(option.key)}
              style={{
                backgroundColor: isSelected ? option.color : 'transparent',
                color: isSelected ? '#ffffff' : option.color,
                border: `1px solid ${option.color}`,
                borderRadius: '6px',
                padding: '4px 12px',
                fontSize: '11px',
                cursor: 'pointer',
                opacity: isSelected ? 0.9 : 0.8
              }}
            >
              {option.label}: {filterCounts[option.key]}
            </div>
          );
        })}
      </Box>

      {/* Current Filter Info */}
      <Typography variant="body2" style={{ color: colors.textSecondary, marginBottom: '16px' }}>
        Current filter: {getCurrentFilterInfo().label} ({getCurrentFilterInfo().count} items)
      </Typography>

      {/* Filtered Results */}
      <Box>
        <Typography variant="subtitle2" style={{ color: colors.text, marginBottom: '8px' }}>
          Filtered Results:
        </Typography>
        {filteredItems.slice(0, 5).map((item, index) => (
          <Box key={index} style={{ padding: '8px', border: '1px solid #ddd', marginBottom: '4px', borderRadius: '4px' }}>
            <Typography variant="body2" style={{ color: colors.text }}>
              {item.name || item.uniqueId || `Item ${index + 1}`}
            </Typography>
            <Typography variant="caption" style={{ color: colors.textSecondary }}>
              Last Update: {item.lastUpdate ? new Date(item.lastUpdate).toLocaleString() : 'Never'}
            </Typography>
          </Box>
        ))}
        {filteredItems.length > 5 && (
          <Typography variant="caption" style={{ color: colors.textSecondary }}>
            ... and {filteredItems.length - 5} more items
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default TimeFilterDemo;
