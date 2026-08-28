import { describe, expect, it } from 'vitest';
import { advanceMemoryStory, retreatMemoryStory } from './memoryStoryState';

describe('memory story progression', () => {
  it('advances through each ordered moment before completing', () => {
    const first = { activeIndex: 0, isComplete: false };
    const second = advanceMemoryStory(first, 3);
    const third = advanceMemoryStory(second, 3);
    const complete = advanceMemoryStory(third, 3);

    expect(second).toEqual({ activeIndex: 1, isComplete: false });
    expect(third).toEqual({ activeIndex: 2, isComplete: false });
    expect(complete).toEqual({ activeIndex: 2, isComplete: true });
  });

  it('returns from completion and never moves before the first memory', () => {
    expect(retreatMemoryStory({ activeIndex: 2, isComplete: true })).toEqual({ activeIndex: 2, isComplete: false });
    expect(retreatMemoryStory({ activeIndex: 2, isComplete: false })).toEqual({ activeIndex: 1, isComplete: false });
    expect(retreatMemoryStory({ activeIndex: 0, isComplete: false })).toEqual({ activeIndex: 0, isComplete: false });
  });
});
