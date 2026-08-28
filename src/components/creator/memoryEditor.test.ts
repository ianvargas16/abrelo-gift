import { describe, expect, it } from 'vitest';
import { createMemoryItem, removeMemoryItem, reorderMemoryItems } from './memoryEditor';

describe('Creator memory editor', () => {
  const firstId = 'memoryAsset000000000001';
  const secondId = 'memoryAsset000000000002';

  it('creates metadata-only memory items from selected files', () => {
    const item = createMemoryItem(new File(['image'], 'moment.jpg', { type: 'image/jpeg' }), 0, firstId);

    expect(item).toEqual({
      id: firstId,
      image: { id: firstId, mimeType: 'image/jpeg', size: 5 },
      order: 0,
      caption: '',
    });
    expect(JSON.stringify(item)).not.toContain('image;base64');
  });

  it('reorders and removes items while keeping explicit contiguous order', () => {
    const first = createMemoryItem(new File(['a'], 'a.jpg', { type: 'image/jpeg' }), 0, firstId);
    const second = createMemoryItem(new File(['b'], 'b.jpg', { type: 'image/jpeg' }), 1, secondId);
    const reordered = reorderMemoryItems([first, second], 1, -1);

    expect(reordered.map((item) => 'id' in item ? [item.id, item.order] : null)).toEqual([
      [secondId, 0],
      [firstId, 1],
    ]);
    expect(removeMemoryItem(reordered, 0)).toEqual([{ ...first, order: 0 }]);
  });
});
