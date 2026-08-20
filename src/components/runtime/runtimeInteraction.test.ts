import { describe, expect, it, vi } from 'vitest';
import { isSealActivationKey } from './WaxSeal';
import {
  createSealHoldController,
  getRuntimeTransitionDelay,
  transitionRuntimeStage,
} from './runtimeInteraction';

function createHoldHarness() {
  let now = 0;
  let nextFrameId = 1;
  const frames = new Map<number, FrameRequestCallback>();
  const onProgress = vi.fn();
  const onComplete = vi.fn();
  const onCancel = vi.fn();

  const controller = createSealHoldController({
    durationMs: 1000,
    now: () => now,
    requestFrame: (callback) => {
      const id = nextFrameId++;
      frames.set(id, callback);
      return id;
    },
    cancelFrame: (id) => frames.delete(id),
    onProgress,
    onComplete,
    onCancel,
  });

  return {
    controller,
    onProgress,
    onComplete,
    onCancel,
    advance(milliseconds: number) {
      now += milliseconds;
      const pendingFrames = [...frames.values()];
      frames.clear();
      pendingFrames.forEach((callback) => callback(now));
    },
  };
}

describe('seal hold interaction', () => {
  it('completes after one continuous hold and transitions to unsealed', () => {
    const harness = createHoldHarness();

    expect(harness.controller.start()).toBe(true);
    harness.advance(500);
    expect(harness.onProgress).toHaveBeenLastCalledWith(0.5);
    expect(harness.onComplete).not.toHaveBeenCalled();

    harness.advance(500);
    expect(harness.onProgress).toHaveBeenLastCalledWith(1);
    expect(harness.onComplete).toHaveBeenCalledOnce();
    expect(transitionRuntimeStage('sealed', 'seal-complete')).toBe('unsealed');
  });

  it('resets progress when released before the hold completes', () => {
    const harness = createHoldHarness();

    harness.controller.start();
    harness.advance(420);
    expect(harness.controller.release()).toBe(true);

    expect(harness.onProgress).toHaveBeenLastCalledWith(0);
    expect(harness.onCancel).toHaveBeenCalledOnce();
    expect(harness.onComplete).not.toHaveBeenCalled();
  });

  it('cancels safely when the active pointer is interrupted', () => {
    const harness = createHoldHarness();

    harness.controller.start();
    harness.advance(300);
    expect(harness.controller.cancel()).toBe(true);
    harness.advance(1000);

    expect(harness.onCancel).toHaveBeenCalledOnce();
    expect(harness.onComplete).not.toHaveBeenCalled();
  });

  it('can be reset and completed again without stale frames', () => {
    const harness = createHoldHarness();

    harness.controller.start();
    harness.advance(1000);
    harness.controller.reset();
    expect(harness.onProgress).toHaveBeenLastCalledWith(0);

    expect(harness.controller.start()).toBe(true);
    harness.advance(1000);
    expect(harness.onComplete).toHaveBeenCalledTimes(2);
    expect(transitionRuntimeStage('revealed', 'reset')).toBe('sealed');
  });

  it('uses Enter and Space as equivalent keyboard hold inputs', () => {
    expect(isSealActivationKey('Enter')).toBe(true);
    expect(isSealActivationKey(' ')).toBe(true);
    expect(isSealActivationKey('Escape')).toBe(false);

    const harness = createHoldHarness();
    if (isSealActivationKey('Enter')) harness.controller.start();
    harness.advance(1000);
    expect(harness.onComplete).toHaveBeenCalledOnce();
  });
});

describe('Runtime stage transitions', () => {
  it('only advances for the event valid in the current stage', () => {
    expect(transitionRuntimeStage('sealed', 'open-envelope')).toBe('sealed');
    expect(transitionRuntimeStage('unsealed', 'open-envelope')).toBe('opened');
    expect(transitionRuntimeStage('opened', 'show-letter')).toBe('letter');
    expect(transitionRuntimeStage('letter', 'reveal-gift')).toBe('revealed');
  });

  it('removes presentation delays when reduced motion is requested', () => {
    expect(getRuntimeTransitionDelay(720, false)).toBe(720);
    expect(getRuntimeTransitionDelay(720, true)).toBe(0);
  });
});
