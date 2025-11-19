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

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < 200) {
        const totalPages = Math.max(1, Math.ceil(Math.max(items.length, 1) / pageSize));
        if (currentPage < totalPages - 1) {
          setCurrentPage(currentPage + 1);
        }
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [items.length, pageSize, currentPage, setCurrentPage, containerRef]);
}
