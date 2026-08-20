export type RuntimeStage = 'sealed' | 'unsealed' | 'opened' | 'letter' | 'revealed';

export type RuntimeEvent = 'seal-complete' | 'open-envelope' | 'show-letter' | 'reveal-gift' | 'reset';

export function transitionRuntimeStage(stage: RuntimeStage, event: RuntimeEvent): RuntimeStage {
  if (event === 'reset') return 'sealed';
  if (stage === 'sealed' && event === 'seal-complete') return 'unsealed';
  if (stage === 'unsealed' && event === 'open-envelope') return 'opened';
  if (stage === 'opened' && event === 'show-letter') return 'letter';
  if (stage === 'letter' && event === 'reveal-gift') return 'revealed';
  return stage;
}

export function getRuntimeTransitionDelay(durationMs: number, prefersReducedMotion: boolean) {
  return prefersReducedMotion ? 0 : durationMs;
}

interface SealHoldControllerOptions {
  durationMs: number;
  now: () => number;
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (handle: number) => void;
  onProgress: (progress: number) => void;
  onComplete: () => void;
  onCancel: () => void;
}

export interface SealHoldController {
  start: () => boolean;
  release: () => boolean;
  cancel: () => boolean;
  reset: () => void;
  dispose: () => void;
}

export function createSealHoldController(options: SealHoldControllerOptions): SealHoldController {
  let startedAt: number | null = null;
  let frame: number | null = null;
  let completed = false;

  const stopFrame = () => {
    if (frame !== null) options.cancelFrame(frame);
    frame = null;
  };

  const stopAttempt = () => {
    stopFrame();
    startedAt = null;
  };

  const tick = (timestamp: number) => {
    if (startedAt === null) return;

    const progress = Math.min(1, Math.max(0, (timestamp - startedAt) / options.durationMs));
    options.onProgress(progress);

    if (progress >= 1) {
      completed = true;
      stopAttempt();
      options.onComplete();
      return;
    }

    frame = options.requestFrame(tick);
  };

  const abortAttempt = () => {
    if (startedAt === null || completed) return false;
    stopAttempt();
    options.onProgress(0);
    options.onCancel();
    return true;
  };

  return {
    start() {
      if (startedAt !== null || completed) return false;
      startedAt = options.now();
      options.onProgress(0);
      frame = options.requestFrame(tick);
      return true;
    },
    release: abortAttempt,
    cancel: abortAttempt,
    reset() {
      stopAttempt();
      completed = false;
      options.onProgress(0);
    },
    dispose: stopAttempt,
  };
}
