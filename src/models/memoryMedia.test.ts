import { describe, expect, it } from 'vitest';
import { getMemoryImageDimensions, MAX_MEMORY_IMAGE_DIMENSION } from './memoryMedia';

describe('memory image preparation', () => {
  it('keeps small images at their original dimensions', () => {
    expect(getMemoryImageDimensions(1200, 900)).toEqual({ width: 1200, height: 900 });
  });

  it('scales landscape and portrait images to the maximum dimension', () => {
    expect(getMemoryImageDimensions(3200, 1800)).toEqual({ width: MAX_MEMORY_IMAGE_DIMENSION, height: 900 });
    expect(getMemoryImageDimensions(1200, 3000)).toEqual({ width: 640, height: MAX_MEMORY_IMAGE_DIMENSION });
  });

  it('rejects missing image dimensions before canvas processing', () => {
    expect(() => getMemoryImageDimensions(0, 100)).toThrow(/No pude preparar/);
  });
});
