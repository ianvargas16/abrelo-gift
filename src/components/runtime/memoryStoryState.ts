export interface MemoryStoryState {
  activeIndex: number;
  isComplete: boolean;
}

export function advanceMemoryStory(state: MemoryStoryState, itemCount: number): MemoryStoryState {
  if (state.isComplete || itemCount <= 0) return state;
  if (state.activeIndex < itemCount - 1) {
    return { activeIndex: state.activeIndex + 1, isComplete: false };
  }
  return { ...state, isComplete: true };
}

export function retreatMemoryStory(state: MemoryStoryState): MemoryStoryState {
  if (state.isComplete) return { ...state, isComplete: false };
  if (state.activeIndex === 0) return state;
  return { activeIndex: state.activeIndex - 1, isComplete: false };
}
