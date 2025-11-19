export interface GalleryItem {
  id: string;
}

export function pickRandomPhotoIds<T extends GalleryItem>(items: T[], count = 10): string[] {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const limit = Math.min(count, items.length);
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, limit).map(item => item.id);
}
