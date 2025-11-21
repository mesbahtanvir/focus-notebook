import { useState, useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  initialItemsPerPage?: number;
  threshold?: number; // How close to bottom before loading more (0-1)
}

export function useInfiniteScroll<T>(
  items: T[],
  options: UseInfiniteScrollOptions = {}
) {
  const {
    initialItemsPerPage = 20,
    threshold = 0.8
  } = options;

  const [displayedItems, setDisplayedItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Reset when items change
  useEffect(() => {
    const initialItems = items.slice(0, initialItemsPerPage);
    setDisplayedItems(initialItems);
    setPage(1);
    setHasMore(items.length > initialItemsPerPage);
  }, [items, initialItemsPerPage]);

  // Load more items
  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    const startIndex = nextPage * initialItemsPerPage;
    const endIndex = startIndex + initialItemsPerPage;
    const nextItems = items.slice(0, endIndex);

    setDisplayedItems(nextItems);
    setPage(nextPage);
    setHasMore(endIndex < items.length);
  }, [page, items, initialItemsPerPage]);

  // Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadMore, threshold]);

  return {
    displayedItems,
    hasMore,
    observerTarget,
    loadMore
  };
}
