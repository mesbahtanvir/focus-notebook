import { useState, useMemo, useCallback } from "react";

/**
 * Hook for searching through items by specified fields
 */
export function useToolSearch<T extends Record<string, any>>(
  items: T[],
  searchFields: (keyof T)[],
  initialSearchTerm: string = ""
) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    
    const query = searchTerm.toLowerCase();
    return items.filter(item => {
      return searchFields.some(field => {
        const value = item[field];
        if (value === undefined || value === null) return false;
        if (typeof value === 'string') {
          return value.toLowerCase().includes(query);
        }
        if (typeof value === 'number') {
          return value.toString().includes(query);
        }
        if (Array.isArray(value)) {
          return value.some((v: any) => String(v).toLowerCase().includes(query));
        }
        return String(value).toLowerCase().includes(query);
      });
    });
  }, [items, searchFields, searchTerm]);

  const clearSearch = useCallback(() => {
    setSearchTerm("");
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    filteredItems,
    clearSearch,
  };
}

/**
 * Hook for filtering items with multiple filter criteria
 */
export function useToolFilters<T extends Record<string, any>>(
  items: T[],
  filterConfig: Record<string, (item: T) => boolean>
) {
  const [filters, setFilters] = useState<Record<string, boolean>>({});

  const toggleFilter = useCallback((filterName: string) => {
    setFilters(prev => ({ ...prev, [filterName]: !prev[filterName] }));
  }, []);

  const setFilter = useCallback((filterName: string, value: boolean) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({});
  }, []);

  const filteredItems = useMemo(() => {
    const activeFilters = Object.entries(filters).filter(([, active]) => active);
    
    if (activeFilters.length === 0) return items;
    
    return items.filter(item => {
      return activeFilters.every(([filterName]) => {
        const filterFn = filterConfig[filterName];
        return filterFn ? filterFn(item) : true;
      });
    });
  }, [items, filters, filterConfig]);

  return {
    filters,
    setFilter,
    toggleFilter,
    resetFilters,
    filteredItems,
  };
}

/**
 * Hook for pagination with "load more" functionality
 */
export function useToolPagination<T>(items: T[], itemsPerPage: number = 20) {
  const [visibleCount, setVisibleCount] = useState(itemsPerPage);

  const displayedItems = useMemo(() => {
    return items.slice(0, visibleCount);
  }, [items, visibleCount]);

  const hasMore = items.length > visibleCount;

  const loadMore = useCallback(() => {
    setVisibleCount(prev => prev + itemsPerPage);
  }, [itemsPerPage]);

  const reset = useCallback(() => {
    setVisibleCount(itemsPerPage);
  }, [itemsPerPage]);

  return {
    displayedItems,
    hasMore,
    loadMore,
    reset,
    totalCount: items.length,
    displayedCount: displayedItems.length,
  };
}

/**
 * Combined hook for search + pagination
 */
export function useToolSearchAndPaginate<T extends Record<string, any>>(
  items: T[],
  searchFields: (keyof T)[],
  itemsPerPage: number = 20
) {
  const { searchTerm, setSearchTerm, filteredItems, clearSearch } = useToolSearch(items, searchFields);
  const { displayedItems, hasMore, loadMore, reset: resetPagination, totalCount, displayedCount } = useToolPagination(filteredItems, itemsPerPage);

  const reset = useCallback(() => {
    clearSearch();
    resetPagination();
  }, [clearSearch, resetPagination]);

  return {
    searchTerm,
    setSearchTerm,
    filteredItems,
    displayedItems,
    hasMore,
    loadMore,
    reset,
    clearSearch,
    totalCount,
    displayedCount,
  };
}

