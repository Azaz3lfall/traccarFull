import dayjs from 'dayjs';

/**
 * Default time filter options with green, orange, red gradient (avoiding yellow tones)
 * Can be customized per component
 */
export const defaultTimeFilterOptions = [
  { key: 'all', label: 'All', value: null, color: '#666666', borderColor: '#666666' },
  { key: 'lt1h', label: '< 1hr', value: 1, color: '#4caf50', borderColor: '#66bb6a' }, // Green
  { key: 'gt1h', label: '> 1hr', value: 1, color: '#66bb6a', borderColor: '#81c784' }, // Light Green
  { key: 'gt3h', label: '> 3hr', value: 3, color: '#8bc34a', borderColor: '#aed581' }, // Lime Green
  { key: 'gt6h', label: '> 6hr', value: 6, color: '#ff9800', borderColor: '#ffb74d' }, // Orange
  { key: 'gt12h', label: '> 12hr', value: 12, color: '#ff7043', borderColor: '#ff8a65' }, // Deep Orange
  { key: 'gt1d', label: '> 1d', value: 24, color: '#ff5722', borderColor: '#ff8a65' }, // Red Orange
  { key: 'gt3d', label: '> 3d', value: 72, color: '#f44336', borderColor: '#e57373' }, // Red
  { key: 'gt7d', label: '> 7d', value: 168, color: '#d32f2f', borderColor: '#e57373' }, // Dark Red
  { key: 'nr', label: 'NR', value: null, color: '#b71c1c', borderColor: '#d32f2f' }, // No Response - Darker Red
];

/**
 * Core time-based filtering function
 * @param {Object} item - The item to filter (e.g., device, user, etc.)
 * @param {string} filterKey - The filter key to apply
 * @param {string} dateField - The field name containing the date (default: 'lastUpdate')
 * @returns {boolean} - Whether the item matches the filter
 */
export const filterItemByTime = (item, filterKey, dateField = 'lastUpdate') => {
  if (filterKey === 'all') {
    return true;
  }

  if (filterKey === 'nr') {
    // No Response - null or invalid date
    return !item[dateField] || !dayjs(item[dateField]).isValid();
  }

  // For time-based filters, check if date exists and is valid
  if (!item[dateField] || !dayjs(item[dateField]).isValid()) {
    return false;
  }

  const now = dayjs();
  const itemDate = dayjs(item[dateField]);
  const diffHours = now.diff(itemDate, 'hour');

  // Filter from biggest time windows to smallest
  switch (filterKey) {
    case 'gt7d':
      return diffHours > 168; // > 7 days
    case 'gt3d':
      return diffHours > 72 && diffHours <= 168; // > 3 days and <= 7 days
    case 'gt1d':
      return diffHours > 24 && diffHours <= 72; // > 1 day and <= 3 days
    case 'gt12h':
      return diffHours > 12 && diffHours <= 24; // > 12 hours and <= 1 day
    case 'gt6h':
      return diffHours > 6 && diffHours <= 12; // > 6 hours and <= 12 hours
    case 'gt3h':
      return diffHours > 3 && diffHours <= 6; // > 3 hours and <= 6 hours
    case 'gt1h':
      return diffHours > 1 && diffHours <= 3; // > 1 hour and <= 3 hours
    case 'lt1h':
      return diffHours <= 1; // <= 1 hour
    default:
      return true;
  }
};

/**
 * Get filter counts for all time filter options
 * @param {Array} items - Array of items to count
 * @param {Array} timeFilterOptions - Array of time filter options
 * @param {string} dateField - The field name containing the date (default: 'lastUpdate')
 * @returns {Object} - Object with counts for each filter key
 */
export const getTimeFilterCounts = (items, timeFilterOptions, dateField = 'lastUpdate') => {
  const counts = {};
  timeFilterOptions.forEach(option => {
    counts[option.key] = items.filter(item => filterItemByTime(item, option.key, dateField)).length;
  });
  return counts;
};

/**
 * Filter items based on time filter and search keyword
 * @param {Array} items - Array of items to filter
 * @param {string} selectedTimeFilter - Currently selected time filter key
 * @param {string} searchKeyword - Search keyword to filter by
 * @param {Array} searchFields - Array of field names to search in
 * @param {string} dateField - The field name containing the date (default: 'lastUpdate')
 * @returns {Array} - Filtered array of items
 */
export const filterItemsByTimeAndSearch = (
  items, 
  selectedTimeFilter, 
  searchKeyword, 
  searchFields = ['name', 'uniqueId', 'phone', 'model', 'contact'],
  dateField = 'lastUpdate'
) => {
  return items.filter(item => {
    // First apply time filter
    if (!filterItemByTime(item, selectedTimeFilter, dateField)) {
      return false;
    }

    // Then apply search filter
    if (!searchKeyword) {
      return true;
    }

    const lowerCaseKeyword = searchKeyword.toLowerCase();
    return searchFields.some(field => 
      item[field] && item[field].toLowerCase().includes(lowerCaseKeyword)
    );
  });
};

/**
 * Format last update time for display
 * @param {Object} item - The item with date field
 * @param {string} dateField - The field name containing the date (default: 'lastUpdate')
 * @param {Function} formatTime - Function to format time (from formatter util)
 * @param {string} status - Item status (e.g., 'online', 'offline')
 * @returns {string} - Formatted time string or '-' for invalid dates
 */
export const formatLastUpdate = (item, dateField = 'lastUpdate', formatTime, status = null) => {
  if (!item[dateField] || !dayjs(item[dateField]).isValid()) {
    return '-'; // Show dash for invalid/null dates
  }

  const now = dayjs();
  const lastUpdate = dayjs(item[dateField]);
  const diffMinutes = now.diff(lastUpdate, 'minute');

  if (status === 'online') {
    if (diffMinutes < 5) {
      return lastUpdate.fromNow();
    } else {
      return formatTime(item[dateField], 'minutes');
    }
  }

  if (diffMinutes < 60) {
    return lastUpdate.fromNow();
  } else {
    return formatTime(item[dateField], 'minutes');
  }
};
