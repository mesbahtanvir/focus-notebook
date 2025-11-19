import { pickRandomPhotoIds } from "@/lib/photoGallery";

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
});
