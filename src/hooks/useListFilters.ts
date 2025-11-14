import { useState, useMemo } from 'react';

/**
 * Generic hook for managing list filtering and search functionality
 * Eliminates duplication across all list pages
 */

export interface UseListFiltersConfig<T, TFilters extends Record<string, any> = {}> {
  /** The items to filter */
  items: T[];

  /** Function to extract searchable text from an item */
  getSearchableText: (item: T) => string;

  /** Optional: Additional filter functions based on filter state */
  filterFunctions?: {
    [K in keyof TFilters]?: (item: T, filterValue: TFilters[K]) => boolean;
  };

  /** Optional: Initial filter values */
  initialFilters?: Partial<TFilters>;
}

export interface UseListFiltersReturn<T, TFilters> {
  /** Current search query */
  searchQuery: string;

  /** Update search query */
  setSearchQuery: (query: string) => void;

  /** Current filter state */
  filters: TFilters;

  /** Update a specific filter */
  setFilter: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void;

  /** Update multiple filters at once */
  setFilters: (updates: Partial<TFilters>) => void;

  /** Reset all filters to initial state */
  resetFilters: () => void;

  /** Filtered items based on search and filters */
  filteredItems: T[];

  /** Whether filters are active (search or any filter is set) */
  hasActiveFilters: boolean;
}

export function useListFilters<T, TFilters extends Record<string, any> = {}>({
  items,
  getSearchableText,
  filterFunctions = {},
  initialFilters = {} as Partial<TFilters>,
}: UseListFiltersConfig<T, TFilters>): UseListFiltersReturn<T, TFilters> {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFiltersState] = useState<TFilters>(initialFilters as TFilters);

  const setFilter = <K extends keyof TFilters>(key: K, value: TFilters[K]) => {
    setFiltersState(prev => ({ ...prev, [key]: value }));
  };

  const setFilters = (updates: Partial<TFilters>) => {
    setFiltersState(prev => ({ ...prev, ...updates }));
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFiltersState(initialFilters as TFilters);
  };

  const filteredItems = useMemo(() => {
    let result = items;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        getSearchableText(item).toLowerCase().includes(query)
      );
    }

    // Apply custom filters
    Object.entries(filters).forEach(([key, value]) => {
      const filterFn = filterFunctions[key as keyof TFilters];
      if (filterFn && value !== undefined && value !== null && value !== '' && value !== 'all') {
        result = result.filter(item => filterFn(item, value));
      }
    });

    return result;
  }, [items, searchQuery, filters, getSearchableText, filterFunctions]);

  const hasActiveFilters = useMemo(() => {
    if (searchQuery.trim()) return true;
    return Object.entries(filters).some(([key, value]) => {
      return value !== undefined &&
             value !== null &&
             value !== '' &&
             value !== 'all' &&
             value !== initialFilters[key as keyof TFilters];
    });
  }, [searchQuery, filters, initialFilters]);

  return {
    searchQuery,
    setSearchQuery,
    filters,
    setFilter,
    setFilters,
    resetFilters,
    filteredItems,
    hasActiveFilters,
  };
}

/**
 * Specialized version for status-based filtering (common pattern)
 */
export interface StatusFilterConfig {
  showCompleted?: boolean;
  showArchived?: boolean;
  showPaused?: boolean;
  statusFilter?: string;
}

export function useStatusFilters<T extends { status?: string }>(items: T[]) {
  return useListFilters<T, StatusFilterConfig>({
    items,
    getSearchableText: (item: any) => {
      // Generic searchable text - can be overridden
      return JSON.stringify(item);
    },
    filterFunctions: {
      showCompleted: (item, show) => show || item.status !== 'completed',
      showArchived: (item, show) => show || item.status !== 'archived',
      showPaused: (item, show) => show || item.status !== 'paused',
      statusFilter: (item, status) => status === 'all' || item.status === status,
    },
    initialFilters: {
      showCompleted: false,
      showArchived: false,
      showPaused: false,
      statusFilter: 'all',
    },
  });
}
