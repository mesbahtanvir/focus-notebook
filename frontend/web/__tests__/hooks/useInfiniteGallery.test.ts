import { renderHook } from "@testing-library/react";
import { useInfiniteGallery } from "@/hooks/useInfiniteGallery";
import { PhotoLibraryItem } from "@/store/usePhotoFeedback";

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock as any;

const buildPhoto = (id: string): PhotoLibraryItem => ({
  id,
  ownerId: "test-user",
  url: `https://example.com/${id}.jpg`,
  storagePath: `users/test-user/photo-library/${id}`,
  createdAt: new Date().toISOString(),
});

function createContainer() {
  const div = document.createElement("div");
  Object.defineProperty(div, "scrollHeight", {
    value: 400,
    writable: true,
  });
  Object.defineProperty(div, "clientHeight", {
    value: 200,
    writable: true,
  });
  return div;
}

describe("useInfiniteGallery", () => {
  it("advances the page when near the bottom", () => {
    const setCurrentPage = jest.fn();
    const container = createContainer();
    const ref = { current: container };

    renderHook(() =>
      useInfiniteGallery({
        items: Array.from({ length: 20 }, (_, i) => buildPhoto(`photo-${i}`)),
        pageSize: 8,
        currentPage: 0,
        setCurrentPage,
        containerRef: ref,
      })
    );

    // simulate near-bottom scroll
    Object.defineProperty(container, "scrollTop", { value: 190, writable: true });
    container.dispatchEvent(new Event("scroll"));
    expect(setCurrentPage).toHaveBeenCalled();
  });

  it("does not advance past last page", () => {
    const setCurrentPage = jest.fn();
    const container = createContainer();
    Object.defineProperty(container, "scrollTop", { value: 190, writable: true });
    const ref = { current: container };

    renderHook(() =>
      useInfiniteGallery({
        items: Array.from({ length: 10 }, (_, i) => buildPhoto(`photo-${i}`)),
        pageSize: 8,
        currentPage: 1,
        setCurrentPage,
        containerRef: ref,
      })
    );

    container.dispatchEvent(new Event("scroll"));
    expect(setCurrentPage).not.toHaveBeenCalled();
  });
});
