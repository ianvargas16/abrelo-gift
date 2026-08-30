import { describe, expect, it, vi } from 'vitest';
import { isSealActivationKey } from './WaxSeal';
import {
  createDirectedDragController,
  createPointerOwnership,
  createSealHoldController,
  getDirectedDragProgress,
  getRuntimePhase,
  getRuntimeTransitionDelay,
  isEligibleHoldPointer,
  runtimePresentationTiming,
  shouldShowGiftAudioControl,
  transitionRuntimeStage,
} from './runtimeInteraction';

function createDragHarness(threshold = 0.6) {
  const onProgress = vi.fn();
  const onActiveChange = vi.fn();
  const onComplete = vi.fn();
  const controller = createDirectedDragController({ threshold, onProgress, onActiveChange, onComplete });

  return { controller, onProgress, onActiveChange, onComplete };
}

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

  it('silently interrupts an active hold and ignores a later large frame', () => {
    const harness = createHoldHarness();

    harness.controller.start();
    harness.advance(300);
    expect(harness.controller.interrupt()).toBe(true);
    harness.advance(10_000);

    expect(harness.onProgress).toHaveBeenLastCalledWith(0);
    expect(harness.onCancel).not.toHaveBeenCalled();
    expect(harness.onComplete).not.toHaveBeenCalled();

    expect(harness.controller.start()).toBe(true);
    harness.advance(1000);
    expect(harness.onComplete).toHaveBeenCalledOnce();
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

  it('prevents accidental double activation while opening', () => {
    const harness = createHoldHarness();

    expect(harness.controller.start()).toBe(true);
    expect(harness.controller.start()).toBe(false);
    harness.advance(1000);
    expect(harness.controller.start()).toBe(false);
    expect(harness.onComplete).toHaveBeenCalledOnce();
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

describe('seal pointer ownership', () => {
  it('allows only the pointer owner to release the active interaction', () => {
    const ownership = createPointerOwnership();

    expect(ownership.claim(1)).toBe(true);
    expect(ownership.claim(2)).toBe(false);
    expect(ownership.release(2)).toBe(false);
    expect(ownership.owns(1)).toBe(true);
    expect(ownership.release(1)).toBe(true);
    expect(ownership.hasOwner()).toBe(false);
  });

  it('rejects secondary pointers and non-primary mouse buttons', () => {
    expect(isEligibleHoldPointer({ pointerId: 1, pointerType: 'touch', button: 0, isPrimary: true })).toBe(true);
    expect(isEligibleHoldPointer({ pointerId: 2, pointerType: 'touch', button: 0, isPrimary: false })).toBe(false);
    expect(isEligibleHoldPointer({ pointerId: 3, pointerType: 'pen', button: 0, isPrimary: false })).toBe(false);
    expect(isEligibleHoldPointer({ pointerId: 4, pointerType: 'mouse', button: 1, isPrimary: true })).toBe(false);
    expect(isEligibleHoldPointer({ pointerId: 5, pointerType: 'mouse', button: 2, isPrimary: true })).toBe(false);
  });
});

describe('directed physical drag interaction', () => {
  it('normalizes upward movement and clamps resistance to its directed path', () => {
    expect(getDirectedDragProgress(300, 280, 100)).toBe(0.2);
    expect(getDirectedDragProgress(300, 340, 100)).toBe(0);
    expect(getDirectedDragProgress(300, 120, 100)).toBe(1);
    expect(getDirectedDragProgress(300, 200, 0)).toBe(0);
  });

  it('returns the flap softly when released below its threshold', () => {
    const harness = createDragHarness();

    expect(harness.controller.start(1, 300, 100)).toBe(true);
    expect(harness.controller.move(1, 255)).toBe(true);
    expect(harness.controller.finish(1)).toBe('returned');
    expect(harness.onProgress).toHaveBeenLastCalledWith(0);
    expect(harness.onComplete).not.toHaveBeenCalled();
  });

  it('completes the flap once when released beyond its threshold', () => {
    const harness = createDragHarness();

    harness.controller.start(7, 300, 100);
    harness.controller.move(7, 235);
    expect(harness.controller.finish(7)).toBe('completed');
    expect(harness.onProgress).toHaveBeenLastCalledWith(1);
    expect(harness.onComplete).toHaveBeenCalledOnce();
    expect(harness.controller.finish(7)).toBe('ignored');
    expect(harness.controller.completeFromFallback()).toBe(false);
    expect(harness.onComplete).toHaveBeenCalledOnce();
  });

  it('returns a short card pull and allows the next deliberate pull to complete', () => {
    const harness = createDragHarness(0.62);

    harness.controller.start(9, 420, 120);
    harness.controller.move(9, 360);
    expect(harness.controller.finish(9)).toBe('returned');
    expect(harness.onComplete).not.toHaveBeenCalled();

    expect(harness.controller.start(10, 420, 120)).toBe(true);
    harness.controller.move(10, 330);
    expect(harness.controller.finish(10)).toBe('completed');
    expect(harness.onComplete).toHaveBeenCalledOnce();
  });

  it('restores the card after cancellation and ignores non-owner pointers', () => {
    const harness = createDragHarness(0.62);

    expect(harness.controller.start(3, 420, 120)).toBe(true);
    expect(harness.controller.start(4, 420, 120)).toBe(false);
    expect(harness.controller.move(4, 320)).toBe(false);
    expect(harness.controller.cancel(4)).toBe('ignored');
    expect(harness.controller.cancel(3)).toBe('returned');
    expect(harness.onProgress).toHaveBeenLastCalledWith(0);
    expect(harness.onComplete).not.toHaveBeenCalled();
  });

  it('supports an accessible fallback and can reset for a replay', () => {
    const harness = createDragHarness();

    expect(harness.controller.completeFromFallback()).toBe(true);
    expect(harness.onComplete).toHaveBeenCalledOnce();
    harness.controller.reset();
    expect(harness.controller.completeFromFallback()).toBe(true);
    expect(harness.onComplete).toHaveBeenCalledTimes(2);
  });

  it('restores stable state after an interrupted drag and permits a fresh attempt', () => {
    const harness = createDragHarness(0.62);

    harness.controller.start(12, 420, 120);
    harness.controller.move(12, 350);
    harness.controller.reset();
    expect(harness.onProgress).toHaveBeenLastCalledWith(0);
    expect(harness.onComplete).not.toHaveBeenCalled();

    expect(harness.controller.start(13, 420, 120)).toBe(true);
    harness.controller.move(13, 330);
    expect(harness.controller.finish(13)).toBe('completed');
    expect(harness.onComplete).toHaveBeenCalledOnce();
  });
});

describe('Runtime stage transitions', () => {
  it('only advances for the event valid in the current stage', () => {
    expect(transitionRuntimeStage('sealed', 'open-envelope')).toBe('sealed');
    expect(transitionRuntimeStage('unsealed', 'open-envelope')).toBe('opened');
    expect(transitionRuntimeStage('opened', 'show-letter')).toBe('letter');
    expect(transitionRuntimeStage('letter', 'reveal-gift')).toBe('revealed');
    expect(transitionRuntimeStage('letter', 'show-memories')).toBe('memories');
    expect(transitionRuntimeStage('memories', 'reveal-gift')).toBe('revealed');
  });

  it('removes presentation delays when reduced motion is requested', () => {
    expect(getRuntimeTransitionDelay(runtimePresentationTiming.cardExtraction, false)).toBe(820);
    expect(getRuntimeTransitionDelay(runtimePresentationTiming.cardExtraction, true)).toBe(0);
  });

  it('exposes the recipient journey as closed, opening, opened, then revealed', () => {
    expect(getRuntimePhase('sealed')).toBe('closed');
    expect(getRuntimePhase('unsealed')).toBe('opening');
    expect(getRuntimePhase('opened')).toBe('opening');
    expect(getRuntimePhase('letter')).toBe('opened');
    expect(getRuntimePhase('memories')).toBe('opened');
    expect(getRuntimePhase('revealed')).toBe('revealed');
  });

  it('keeps opened and revealed stages stable when repeated events arrive', () => {
    expect(transitionRuntimeStage('letter', 'show-letter')).toBe('letter');
    expect(transitionRuntimeStage('revealed', 'reveal-gift')).toBe('revealed');
  });

  it('shows audio controls only after reveal and only for configured audio', () => {
    expect(shouldShowGiftAudioControl('sealed', true)).toBe(false);
    expect(shouldShowGiftAudioControl('letter', true)).toBe(false);
    expect(shouldShowGiftAudioControl('revealed', true)).toBe(true);
    expect(shouldShowGiftAudioControl('revealed', false)).toBe(false);
  });
});
