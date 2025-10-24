import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../common/components/LocalizationProvider';
import { 
  defaultTimeFilterOptions, 
  getTimeFilterCounts, 
  filterItemsByTimeAndSearch,
  filterItemByTime 
} from '../common/util/timeFilter';

/**
 * Custom hook for time-based filtering
 * @param {Array} items - Array of items to filter
 * @param {Object} options - Configuration options
 * @param {string} options.dateField - Field name containing the date (default: 'lastUpdate')
 * @param {Array} options.searchFields - Fields to search in (default: ['name', 'uniqueId', 'phone', 'model', 'contact'])
 * @param {Array} options.timeFilterOptions - Custom time filter options (optional)
 * @param {boolean} options.resetOnVisible - Reset filter when hook becomes visible (default: true)
 * @param {boolean} options.isVisible - Whether the component using this hook is visible
 * @returns {Object} - Time filter state and utilities
 */
export const useTimeFilter = (items = [], options = {}) => {
  const {
    dateField = 'lastUpdate',
    searchFields = ['name', 'uniqueId', 'phone', 'model', 'contact'],
    timeFilterOptions = defaultTimeFilterOptions,
    resetOnVisible = true,
    isVisible = true
  } = options;

  const t = useTranslation();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('all');

  // Reset filter when component becomes visible
  useEffect(() => {
    if (isVisible && resetOnVisible) {
      setSelectedTimeFilter('all');
      setSearchKeyword('');
    }
  }, [isVisible, resetOnVisible]);

  // Get localized time filter options
  const localizedTimeFilterOptions = useMemo(() => {
    return timeFilterOptions.map(option => ({
      ...option,
      label: option.key === 'all' ? t('allItems') : option.label
    }));
  }, [timeFilterOptions, t]);

  // Get filter counts for each option
  const filterCounts = useMemo(() => {
    return getTimeFilterCounts(items, localizedTimeFilterOptions, dateField);
  }, [items, localizedTimeFilterOptions, dateField]);

  // Filter items based on time filter and search
  const filteredItems = useMemo(() => {
    return filterItemsByTimeAndSearch(
      items, 
      selectedTimeFilter, 
      searchKeyword, 
      searchFields, 
      dateField
    );
  }, [items, selectedTimeFilter, searchKeyword, searchFields, dateField]);

  // Handle time filter selection
  const handleTimeFilterSelect = (filterKey) => {
    setSelectedTimeFilter(filterKey);
  };

  // Handle search keyword change
  const handleSearchChange = (keyword) => {
    setSearchKeyword(keyword);
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedTimeFilter('all');
    setSearchKeyword('');
  };

  // Get current filter info
  const getCurrentFilterInfo = () => {
    const currentOption = localizedTimeFilterOptions.find(opt => opt.key === selectedTimeFilter);
    return {
      label: currentOption?.label || 'All',
      count: filterCounts[selectedTimeFilter] || 0,
      isActive: selectedTimeFilter !== 'all'
    };
  };

  return {
    // State
    searchKeyword,
    selectedTimeFilter,
    filteredItems,
    filterCounts,
    timeFilterOptions: localizedTimeFilterOptions,
    
    // Actions
    handleTimeFilterSelect,
    handleSearchChange,
    resetFilters,
    
    // Utilities
    getCurrentFilterInfo,
    filterItemByTime: (item, filterKey) => filterItemByTime(item, filterKey, dateField)
  };
};

export default useTimeFilter;
