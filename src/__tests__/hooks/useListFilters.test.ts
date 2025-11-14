import { renderHook, act } from '@testing-library/react';
import { useListFilters, useStatusFilters } from '@/hooks/useListFilters';

interface TestItem {
  id: string;
  name: string;
  category: string;
  status?: string;
  priority?: number;
}

describe('useListFilters', () => {
  const testItems: TestItem[] = [
    { id: '1', name: 'Apple', category: 'fruit', status: 'active', priority: 1 },
    { id: '2', name: 'Banana', category: 'fruit', status: 'completed', priority: 2 },
    { id: '3', name: 'Carrot', category: 'vegetable', status: 'active', priority: 1 },
    { id: '4', name: 'Date', category: 'fruit', status: 'archived', priority: 3 },
    { id: '5', name: 'Eggplant', category: 'vegetable', status: 'active', priority: 2 },
  ];

  describe('Search Functionality', () => {
    it('should filter items by search query', () => {
      const { result } = renderHook(() =>
        useListFilters({
          items: testItems,
          getSearchableText: (item) => item.name,
        })
      );

      expect(result.current.filteredItems).toHaveLength(5);

      act(() => {
        result.current.setSearchQuery('apple');
      });

      expect(result.current.filteredItems).toHaveLength(1);
      expect(result.current.filteredItems[0].name).toBe('Apple');
    });

    it('should be case-insensitive', () => {
      const { result } = renderHook(() =>
        useListFilters({
          items: testItems,
          getSearchableText: (item) => item.name,
        })
      );

      act(() => {
        result.current.setSearchQuery('BANANA');
      });

      expect(result.current.filteredItems).toHaveLength(1);
      expect(result.current.filteredItems[0].name).toBe('Banana');
    });

    it('should search across multiple fields', () => {
      const { result } = renderHook(() =>
        useListFilters({
          items: testItems,
          getSearchableText: (item) => `${item.name} ${item.category}`,
        })
      );

      act(() => {
        result.current.setSearchQuery('fruit');
      });

      expect(result.current.filteredItems).toHaveLength(3);
      expect(result.current.filteredItems.every((item) => item.category === 'fruit')).toBe(true);
    });

    it('should trim search query', () => {
      const { result } = renderHook(() =>
        useListFilters({
          items: testItems,
          getSearchableText: (item) => item.name,
        })
      );

      act(() => {
        result.current.setSearchQuery('  apple  ');
      });

      expect(result.current.filteredItems).toHaveLength(1);
      expect(result.current.filteredItems[0].name).toBe('Apple');
    });

    it('should return all items when search is empty', () => {
      const { result } = renderHook(() =>
        useListFilters({
          items: testItems,
          getSearchableText: (item) => item.name,
        })
      );

      act(() => {
        result.current.setSearchQuery('apple');
      });
      expect(result.current.filteredItems).toHaveLength(1);

      act(() => {
        result.current.setSearchQuery('');
      });
      expect(result.current.filteredItems).toHaveLength(5);
    });
  });

  describe('Filter Functionality', () => {
    it('should apply single filter', () => {
      const { result } = renderHook(() =>
        useListFilters<TestItem, { category: string }>({
          items: testItems,
          getSearchableText: (item) => item.name,
          filterFunctions: {
            category: (item, filterValue) => filterValue === 'all' || item.category === filterValue,
          },
          initialFilters: { category: 'all' },
        })
      );

      expect(result.current.filteredItems).toHaveLength(5);

      act(() => {
        result.current.setFilter('category', 'fruit');
      });

      expect(result.current.filteredItems).toHaveLength(3);
      expect(result.current.filteredItems.every((item) => item.category === 'fruit')).toBe(true);
    });

    it('should apply multiple filters', () => {
      const { result } = renderHook(() =>
        useListFilters<TestItem, { category: string; priority: number }>({
          items: testItems,
          getSearchableText: (item) => item.name,
          filterFunctions: {
            category: (item, filterValue) => filterValue === 'all' || item.category === filterValue,
            priority: (item, filterValue) => item.priority === filterValue,
          },
          initialFilters: { category: 'all', priority: 0 },
        })
      );

      act(() => {
        result.current.setFilters({ category: 'fruit', priority: 1 });
      });

      expect(result.current.filteredItems).toHaveLength(1);
      expect(result.current.filteredItems[0].name).toBe('Apple');
    });

    it('should combine search and filters', () => {
      const { result } = renderHook(() =>
        useListFilters<TestItem, { category: string }>({
          items: testItems,
          getSearchableText: (item) => item.name,
          filterFunctions: {
            category: (item, filterValue) => filterValue === 'all' || item.category === filterValue,
          },
          initialFilters: { category: 'all' },
        })
      );

      act(() => {
        result.current.setSearchQuery('a'); // Items with 'a' in name
        result.current.setFilter('category', 'vegetable');
      });

      expect(result.current.filteredItems).toHaveLength(1);
      expect(result.current.filteredItems[0].name).toBe('Carrot');
    });

    it('should reset all filters', () => {
      const { result } = renderHook(() =>
        useListFilters<TestItem, { category: string }>({
          items: testItems,
          getSearchableText: (item) => item.name,
          filterFunctions: {
            category: (item, filterValue) => filterValue === 'all' || item.category === filterValue,
          },
          initialFilters: { category: 'all' },
        })
      );

      act(() => {
        result.current.setSearchQuery('apple');
        result.current.setFilter('category', 'fruit');
      });

      expect(result.current.filteredItems).toHaveLength(1);
      expect(result.current.hasActiveFilters).toBe(true);

      act(() => {
        result.current.resetFilters();
      });

      expect(result.current.searchQuery).toBe('');
      expect(result.current.filters.category).toBe('all');
      expect(result.current.filteredItems).toHaveLength(5);
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe('Active Filters Detection', () => {
    it('should detect search as active filter', () => {
      const { result } = renderHook(() =>
        useListFilters({
          items: testItems,
          getSearchableText: (item) => item.name,
        })
      );

      expect(result.current.hasActiveFilters).toBe(false);

      act(() => {
        result.current.setSearchQuery('apple');
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should detect filter changes as active', () => {
      const { result } = renderHook(() =>
        useListFilters<TestItem, { category: string }>({
          items: testItems,
          getSearchableText: (item) => item.name,
          filterFunctions: {
            category: (item, filterValue) => filterValue === 'all' || item.category === filterValue,
          },
          initialFilters: { category: 'all' },
        })
      );

      expect(result.current.hasActiveFilters).toBe(false);

      act(() => {
        result.current.setFilter('category', 'fruit');
      });

      expect(result.current.hasActiveFilters).toBe(true);
    });

    it('should not detect "all" filter as active', () => {
      const { result } = renderHook(() =>
        useListFilters<TestItem, { category: string }>({
          items: testItems,
          getSearchableText: (item) => item.name,
          filterFunctions: {
            category: (item, filterValue) => filterValue === 'all' || item.category === filterValue,
          },
          initialFilters: { category: 'all' },
        })
      );

      act(() => {
        result.current.setFilter('category', 'all');
      });

      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe('Memoization', () => {
    it('should memoize filtered results', () => {
      const { result, rerender } = renderHook(() =>
        useListFilters({
          items: testItems,
          getSearchableText: (item) => item.name,
        })
      );

      const firstResult = result.current.filteredItems;

      rerender();

      expect(result.current.filteredItems).toBe(firstResult); // Same reference
    });

    it('should update memoized results when items change', () => {
      let items = testItems;

      const { result, rerender } = renderHook(
        ({ items }) =>
          useListFilters({
            items,
            getSearchableText: (item) => item.name,
          }),
        { initialProps: { items } }
      );

      const firstResult = result.current.filteredItems;

      items = [...testItems, { id: '6', name: 'Fig', category: 'fruit', status: 'active' }];

      rerender({ items });

      expect(result.current.filteredItems).not.toBe(firstResult);
      expect(result.current.filteredItems).toHaveLength(6);
    });
  });
});

describe('useStatusFilters', () => {
  const testItems: TestItem[] = [
    { id: '1', name: 'Item 1', category: 'A', status: 'active' },
    { id: '2', name: 'Item 2', category: 'B', status: 'completed' },
    { id: '3', name: 'Item 3', category: 'A', status: 'archived' },
    { id: '4', name: 'Item 4', category: 'B', status: 'paused' },
    { id: '5', name: 'Item 5', category: 'A', status: 'active' },
  ];

  it('should filter out completed items by default', () => {
    const { result } = renderHook(() => useStatusFilters(testItems));

    const filteredItems = result.current.filteredItems;
    expect(filteredItems.every((item) => item.status !== 'completed')).toBe(true);
    expect(filteredItems).toHaveLength(4);
  });

  it('should filter out archived items by default', () => {
    const { result } = renderHook(() => useStatusFilters(testItems));

    const filteredItems = result.current.filteredItems;
    expect(filteredItems.every((item) => item.status !== 'archived')).toBe(true);
  });

  it('should filter out paused items by default', () => {
    const { result } = renderHook(() => useStatusFilters(testItems));

    const filteredItems = result.current.filteredItems;
    expect(filteredItems.every((item) => item.status !== 'paused')).toBe(true);
  });

  it('should show completed items when showCompleted is true', () => {
    const { result } = renderHook(() => useStatusFilters(testItems));

    act(() => {
      result.current.setFilter('showCompleted', true);
    });

    const completed = result.current.filteredItems.filter((item) => item.status === 'completed');
    expect(completed).toHaveLength(1);
  });

  it('should show archived items when showArchived is true', () => {
    const { result } = renderHook(() => useStatusFilters(testItems));

    act(() => {
      result.current.setFilter('showArchived', true);
    });

    const archived = result.current.filteredItems.filter((item) => item.status === 'archived');
    expect(archived).toHaveLength(1);
  });

  it('should show paused items when showPaused is true', () => {
    const { result } = renderHook(() => useStatusFilters(testItems));

    act(() => {
      result.current.setFilter('showPaused', true);
    });

    const paused = result.current.filteredItems.filter((item) => item.status === 'paused');
    expect(paused).toHaveLength(1);
  });

  it('should filter by specific status', () => {
    const { result } = renderHook(() => useStatusFilters(testItems));

    act(() => {
      result.current.setFilter('statusFilter', 'active');
      result.current.setFilter('showCompleted', true); // Need to enable to see filtering
    });

    const active = result.current.filteredItems;
    expect(active.every((item) => item.status === 'active')).toBe(true);
    expect(active).toHaveLength(2);
  });

  it('should show all items when all filters are enabled', () => {
    const { result } = renderHook(() => useStatusFilters(testItems));

    act(() => {
      result.current.setFilters({
        showCompleted: true,
        showArchived: true,
        showPaused: true,
        statusFilter: 'all',
      });
    });

    expect(result.current.filteredItems).toHaveLength(5);
  });
});
