import React, { useState, useEffect, useContext } from 'react';
import ReactSelect, { components } from 'react-select';
// We don't use GroupBase directly
// import type { GroupBase } from 'react-select';
import { useDebounce } from '../../hooks/useDebounce';
import { ThemeContext } from '../../contexts/themeContextDefinition';

interface Option {
  value: string;
  label: string;
  data?: Record<string, unknown>;
}

interface PaginatedSelectProps {
  loadOptions: (page: number, search: string, limit: number) => Promise<{
    options: Option[];
    hasMore: boolean;
    total: number;
  }>;
  onChange: (selectedOption: Option | null) => void;
  value?: Option | null;
  placeholder?: string;
  noOptionsMessage?: string;
  className?: string;
  isDisabled?: boolean;
  isClearable?: boolean;
  limit?: number;
  label?: string;
  isLoading?: boolean;
  'aria-label'?: string;
}

const PaginatedSelect: React.FC<PaginatedSelectProps> = ({
  loadOptions,
  onChange,
  value = null,
  placeholder = 'Select...',
  noOptionsMessage = 'No options available',
  className = '',
  isDisabled = false,
  isClearable = true,
  limit = 20,
  label,
  isLoading: externalLoading,
  'aria-label': ariaLabel,
}) => {
  const [options, setOptions] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  
  // Debounce search to prevent too many API calls
  const debouncedSearch = useDebounce(search, 300);
  
  // Reset pagination when search changes
  useEffect(() => {
    setPage(1);
    setOptions([]);
    setHasMore(true);
  }, [debouncedSearch]);
  
  // Load options when page or search changes
  useEffect(() => {
    const fetchOptions = async () => {
      if (!hasMore && page > 1) return;
      
      setIsLoading(true);
      try {
        const result = await loadOptions(page, debouncedSearch, limit);
        
        if (page === 1) {
          // Replace options if this is the first page
          setOptions(result.options);
        } else {
          // Append options for subsequent pages
          setOptions(prevOptions => [...prevOptions, ...result.options]);
        }
        
        setHasMore(result.hasMore);
        setTotal(result.total);
      } catch (error) {
        console.error('Error loading select options:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOptions();
  }, [page, debouncedSearch, loadOptions, limit, hasMore]);
  
  // Handle input change (search)
  const handleInputChange = (inputValue: string) => {
    setSearch(inputValue);
  };
  
  // Handle menu scroll to implement infinite loading
  const handleMenuScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    
    // Load more options when user scrolls to the bottom (with a small threshold)
    if (scrollHeight - scrollTop - clientHeight < 50 && !isLoading && hasMore) {
      setPage(prev => prev + 1);
    }
  };
  
  // Use the application's theme context
  const { darkMode } = useContext(ThemeContext) || { darkMode: false };
  
  // Use the darkMode value from context for styling
  // Also add hasMore to dependency array of useEffect

  // Custom styles to match the application theme including height, colors, and dark mode
  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      // Don't set fixed height - let it be determined by content + padding
      // Match the native input border style with a more pronounced green border
      border: state.isFocused
        ? '2px solid #22c55e' // Thicker green border when focused
        : `1px solid ${darkMode ? '#4b5563' : '#d1d5db'}`,
      outline: 'none',
      // Adjust content positioning when focused to account for thicker border
      margin: state.isFocused ? '-1px' : '0',
      '&:hover': {
        border: state.isFocused
          ? '2px solid #22c55e' // Keep the border consistent on hover when focused
          : `1px solid ${darkMode ? '#6b7280' : '#9ca3af'}`,
      },
      backgroundColor: darkMode ? '#374151' : '#ffffff', // Match form-input background color
      // Add subtle inner shadow only when not focused
      boxShadow: state.isFocused ? 'none' : 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
      borderRadius: '0.5rem', // Match the more rounded corners in the screenshot
      padding: 0, // Remove default padding, we'll set it in valueContainer
      color: darkMode ? '#e5e7eb' : '#1f2937',
      transition: 'all 0.15s ease',
      fontSize: '16px', // Set font size to 16px
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: darkMode ? '#1e293b' : '#ffffff', // Match dark mode theme
      borderRadius: '0.5rem', // Match control border radius
      boxShadow: darkMode 
        ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)' 
        : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      zIndex: 10,
      border: darkMode ? '1px solid #374151' : '1px solid #e5e7eb',
      marginTop: '4px', // Add a small gap between control and menu
      // Ensure the width matches the control
      width: '100%',
    }),
    menuList: (provided) => ({
      ...provided,
      padding: '0.25rem',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected 
        ? darkMode ? '#22c55e' : '#22c55e' // Green for selected
        : state.isFocused 
          ? darkMode ? '#374151' : '#dcfce7' // Light green for hover in light mode
          : darkMode ? '#1e293b' : '#ffffff',
      color: state.isSelected 
        ? '#ffffff' 
        : darkMode ? '#e5e7eb' : '#1f2937',
      cursor: 'pointer',
      padding: '0.5rem 0.75rem',
      borderRadius: '0.25rem',
      fontSize: '16px', // Set font size to 16px
      ':active': {
        backgroundColor: darkMode ? '#16a34a' : '#86efac', // Green-600 dark / Green-300 light
      },
      // Ensure no blue background on hover/active states
      ':hover': {
        backgroundColor: state.isSelected
          ? darkMode ? '#16a34a' : '#22c55e' // Slightly darker green when selected + hover
          : darkMode ? '#374151' : '#dcfce7', // Light green for hover
      },
    }),
    input: (provided) => ({
      ...provided,
      color: darkMode ? '#e5e7eb' : '#1f2937',
      margin: '0',
      padding: '0',
      lineHeight: '24px', // Match content height
      fontSize: '16px', // Set font size to 16px
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: '8px 12px', // Exact padding from screenshot: 8px top/bottom, 12px left/right
      lineHeight: '24px', // Match content height from screenshot
    }),
    singleValue: (provided) => ({
      ...provided,
      color: darkMode ? '#e5e7eb' : '#1f2937',
      marginLeft: '0',
      marginRight: '0',
      lineHeight: '24px', // Match content height from screenshot
      fontSize: '16px', // Set font size to 16px
    }),
    placeholder: (provided) => ({
      ...provided,
      color: darkMode ? '#9ca3af' : '#6b7280',
      opacity: 0.8, // Slightly dimmer to match native placeholder
      fontSize: '16px', // Set font size to 16px
    }),
    noOptionsMessage: (provided) => ({
      ...provided,
      color: darkMode ? '#9ca3af' : '#6b7280',
      fontSize: '16px', // Set font size to 16px
    }),
    indicatorsContainer: (provided) => ({
      ...provided,
      // No fixed height - let padding control size
      padding: '8px 0', // Match top/bottom padding
    }),
    clearIndicator: (provided, state) => ({
      ...provided,
      padding: '0 6px', // Match the right padding seen in the screenshot
      color: state.isDisabled 
        ? darkMode ? '#6b7280' : '#9ca3af'
        : darkMode ? '#9ca3af' : '#6b7280',
      '&:hover': {
        color: state.isDisabled
          ? darkMode ? '#6b7280' : '#9ca3af'
          : darkMode ? '#22c55e' : '#22c55e', // Green on hover
      },
    }),
    dropdownIndicator: (provided, state) => ({
      ...provided,
      padding: '0 6px', // Match the right padding (6px) shown in the screenshot
      color: state.isDisabled 
        ? darkMode ? '#6b7280' : '#9ca3af'
        : darkMode ? '#9ca3af' : '#6b7280',
      '&:hover': {
        color: state.isDisabled
          ? darkMode ? '#6b7280' : '#9ca3af'
          : darkMode ? '#22c55e' : '#22c55e', // Green on hover
      },
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: darkMode ? '#374151' : '#e5e7eb', // Match border colors
      margin: '6px 0', // Adjust size to look better
    }),
  };
  
  // Custom NoOptionsMessage component
  const CustomNoOptionsMessage = (props: React.ComponentProps<typeof components.NoOptionsMessage>) => {
    return (
      <components.NoOptionsMessage {...props}>
        <div className="text-gray-500 dark:text-gray-400">
          {search.length > 0 
            ? `No results for "${search}"` 
            : noOptionsMessage}
        </div>
      </components.NoOptionsMessage>
    );
  };
  
  // Custom MenuList component to handle infinite scrolling
  const MenuList = (props: React.ComponentProps<typeof components.MenuList>) => {
    return (
      <components.MenuList {...props} onScroll={handleMenuScroll}>
        {props.children}
        {isLoading && options.length > 0 && (
          <div className="text-center py-2 text-sm text-gray-500 dark:text-gray-400">
            Loading more...
          </div>
        )}
        {!hasMore && options.length > 0 && (
          <div className="text-center py-2 text-xs text-gray-500 dark:text-gray-400">
            {total > 0 ? `Showing ${options.length} of ${total} items` : 'No more items'}
          </div>
        )}
      </components.MenuList>
    );
  };

  return (
    <div className={`${className} w-full`}>
      {label && (
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <ReactSelect
        options={options}
        value={value}
        onChange={onChange}
        onInputChange={handleInputChange}
        placeholder={placeholder}
        isLoading={isLoading || !!externalLoading}
        isDisabled={isDisabled}
        isClearable={isClearable}
        styles={customStyles}
        components={{
          NoOptionsMessage: CustomNoOptionsMessage,
          MenuList,
        }}
        className="w-full text-base"
        classNamePrefix="paginated-select"
        aria-label={ariaLabel || label}
      />
    </div>
  );
};

export default PaginatedSelect;