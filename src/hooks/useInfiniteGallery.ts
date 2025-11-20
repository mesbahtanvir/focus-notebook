import { RefObject, useEffect } from "react";
import { PhotoLibraryItem } from "@/store/usePhotoFeedback";

interface Options {
  items: PhotoLibraryItem[];
  pageSize: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  containerRef: RefObject<HTMLDivElement>;
}

export function useInfiniteGallery({
  items,
  pageSize,
  currentPage,
  setCurrentPage,
  containerRef,
}: Options) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const totalPages = Math.max(1, Math.ceil(Math.max(items.length, 1) / pageSize));
    const maybeLoadMore = () => {
      if (totalPages <= 1) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const cannotScroll = scrollHeight <= clientHeight + 8;
      if (distanceFromBottom < 200 || cannotScroll) {
        setCurrentPage(prev => Math.min(prev + 1, totalPages - 1));
      }
    };

    const handleScroll = () => {
      maybeLoadMore();
    };

    container.addEventListener("scroll", handleScroll);
    const resizeObserver = new ResizeObserver(() => maybeLoadMore());
    resizeObserver.observe(container);

    // Kickstart load when the list fits without scrolling
    maybeLoadMore();

    return () => {
      container.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [items.length, pageSize, setCurrentPage, containerRef]);
}
