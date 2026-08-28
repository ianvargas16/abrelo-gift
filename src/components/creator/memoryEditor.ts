import {
  isStructuredMemoryItem,
  type CompatibleMemoryItem,
  type MemoryItem,
} from '../../models/giftConfig';
import { createMemoryAssetId } from '../../models/memoryMedia';

export function createMemoryItem(file: File, order: number, id = createMemoryAssetId()): MemoryItem {
  return {
    id,
    image: {
      id,
      mimeType: file.type as MemoryItem['image']['mimeType'],
      size: file.size,
    },
    order,
    caption: '',
  };
}

export function reorderMemoryItems(
  items: CompatibleMemoryItem[],
  index: number,
  direction: -1 | 1,
): CompatibleMemoryItem[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const reordered = [...items];
  [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
  return reordered.map((item, itemIndex) => isStructuredMemoryItem(item) ? { ...item, order: itemIndex } : item);
}

export function removeMemoryItem(items: CompatibleMemoryItem[], index: number): CompatibleMemoryItem[] {
  return items
    .filter((_, itemIndex) => itemIndex !== index)
    .map((item, itemIndex) => isStructuredMemoryItem(item) ? { ...item, order: itemIndex } : item);
}
