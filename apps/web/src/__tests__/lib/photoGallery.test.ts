import { pickRandomPhotoIds, paginateItems } from "@/lib/photoGallery";

describe("pickRandomPhotoIds", () => {
  it("returns empty array when no items provided", () => {
    expect(pickRandomPhotoIds([], 5)).toEqual([]);
  });

  it("never returns more ids than available", () => {
    const items = Array.from({ length: 4 }, (_, i) => ({ id: `photo-${i}` }));
    const result = pickRandomPhotoIds(items, 10);
    expect(result).toHaveLength(4);
  });

  it("returns unique ids", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: `photo-${i}` }));
    const result = pickRandomPhotoIds(items, 5);
    const unique = new Set(result);
    expect(unique.size).toBe(result.length);
  });

  describe("paginateItems", () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ id: `photo-${i}` }));

    it("provides first page when page index is negative", () => {
      const { slice, currentPage } = paginateItems(items, -2, 5);
      expect(currentPage).toBe(0);
      expect(slice.map(item => item.id)).toEqual(["photo-0", "photo-1", "photo-2", "photo-3", "photo-4"]);
    });

    it("clamps page index when exceeding total pages", () => {
      const { slice, currentPage, totalPages } = paginateItems(items, 99, 6);
      expect(totalPages).toBe(4);
      expect(currentPage).toBe(totalPages - 1);
      expect(slice.length).toBe(2);
    });

    it("returns at least one page even when list is empty", () => {
      const { slice, totalPages } = paginateItems([], 0, 8);
      expect(totalPages).toBe(1);
      expect(slice).toEqual([]);
    });
  });
});
