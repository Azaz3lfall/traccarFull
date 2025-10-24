# Time Filter Hook - Reusable Time-Based Filtering

This directory contains a reusable time-based filtering system that can be easily integrated into any component that needs to filter items based on their last update time.

## Files

- `useTimeFilter.js` - Custom hook for time-based filtering
- `../common/util/timeFilter.js` - Core utility functions

## Features

- **Reusable**: Works with any data array and date field
- **Configurable**: Customize date fields, search fields, and time filter options
- **Localized**: Automatically handles translations for filter labels
- **Performance Optimized**: Uses `useMemo` for efficient filtering and counting
- **Consistent UI**: Provides standardized filter button styling and behavior

## Quick Start

```javascript
import useTimeFilter from '../hooks/useTimeFilter';

const MyComponent = ({ items, isVisible }) => {
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
    dateField: 'lastUpdate', // Field containing the date
    searchFields: ['name', 'uniqueId', 'phone'], // Fields to search in
    isVisible // Whether component is visible (for reset behavior)
  });

  return (
    <div>
      {/* Search Input */}
      <input
        value={searchKeyword}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Search..."
      />

      {/* Time Filter Buttons */}
      {timeFilterOptions.map(option => (
        <button
          key={option.key}
          onClick={() => handleTimeFilterSelect(option.key)}
          style={{
            backgroundColor: selectedTimeFilter === option.key ? option.color : 'transparent',
            color: selectedTimeFilter === option.key ? '#ffffff' : option.color,
            border: `1px solid ${option.color}`,
            borderRadius: '6px',
            padding: '4px 12px'
          }}
        >
          {option.label}: {filterCounts[option.key]}
        </button>
      ))}

      {/* Filtered Results */}
      {filteredItems.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
};
```

## Hook Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dateField` | string | `'lastUpdate'` | Field name containing the date to filter by |
| `searchFields` | array | `['name', 'uniqueId', 'phone', 'model', 'contact']` | Fields to search in |
| `timeFilterOptions` | array | `defaultTimeFilterOptions` | Custom time filter options |
| `resetOnVisible` | boolean | `true` | Reset filters when component becomes visible |
| `isVisible` | boolean | `true` | Whether the component is currently visible |

## Return Values

| Property | Type | Description |
|----------|------|-------------|
| `searchKeyword` | string | Current search keyword |
| `selectedTimeFilter` | string | Currently selected time filter key |
| `filteredItems` | array | Items filtered by time and search |
| `filterCounts` | object | Count of items for each filter option |
| `timeFilterOptions` | array | Available time filter options with labels |
| `handleTimeFilterSelect` | function | Handler for selecting a time filter |
| `handleSearchChange` | function | Handler for search input changes |
| `getCurrentFilterInfo` | function | Get current filter information |
| `resetFilters` | function | Reset all filters to default |

## Time Filter Options

The default time filter options include:

- **All** - Show all items
- **< 1hr** - Items updated within the last hour
- **> 1hr** - Items updated 1-3 hours ago
- **> 3hr** - Items updated 3-6 hours ago
- **> 6hr** - Items updated 6-12 hours ago
- **> 12hr** - Items updated 12-24 hours ago
- **> 1d** - Items updated 1-3 days ago
- **> 3d** - Items updated 3-7 days ago
- **> 7d** - Items updated more than 7 days ago
- **NR** - Items with no response (null/invalid dates)

## Customization

### Custom Time Filter Options

```javascript
const customTimeFilterOptions = [
  { key: 'all', label: 'All', value: null, color: '#666666', borderColor: '#666666' },
  { key: 'recent', label: 'Recent', value: 1, color: '#4caf50', borderColor: '#66bb6a' },
  { key: 'old', label: 'Old', value: 24, color: '#f44336', borderColor: '#e57373' },
];

const { filteredItems } = useTimeFilter(items, {
  timeFilterOptions: customTimeFilterOptions
});
```

### Different Date Field

```javascript
const { filteredItems } = useTimeFilter(users, {
  dateField: 'lastLogin', // Filter by last login instead of last update
  searchFields: ['username', 'email', 'firstName', 'lastName']
});
```

## Integration Examples

### Users Popover
```javascript
const { filteredItems: filteredUsers } = useTimeFilter(users, {
  dateField: 'lastLogin',
  searchFields: ['username', 'email', 'firstName', 'lastName']
});
```

### Groups Popover
```javascript
const { filteredItems: filteredGroups } = useTimeFilter(groups, {
  dateField: 'lastUpdate',
  searchFields: ['name', 'description']
});
```

### Drivers Popover
```javascript
const { filteredItems: filteredDrivers } = useTimeFilter(drivers, {
  dateField: 'lastUpdate',
  searchFields: ['name', 'licenseNumber', 'phone']
});
```

## Performance Notes

- Filtering is memoized and only recalculates when dependencies change
- Search is case-insensitive and searches across multiple fields
- Time calculations use dayjs for consistent date handling
- Filter counts are calculated once and cached

## Dependencies

- `dayjs` - Date manipulation
- `@tanstack/react-query` - Data fetching (if used with queries)
- `../common/components/LocalizationProvider` - Translation support

## Migration from Old Implementation

If you're migrating from the old embedded time filter implementation:

1. Remove old state variables (`searchKeyword`, `selectedTimeFilter`)
2. Remove old filter functions (`filterDevicesByTime`, `getFilterCounts`)
3. Remove old `useEffect` hooks for filter reset
4. Replace with `useTimeFilter` hook
5. Update UI to use hook return values

The new implementation provides the same functionality with better reusability and performance.
