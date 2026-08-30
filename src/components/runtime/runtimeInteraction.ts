export type RuntimeStage = 'sealed' | 'unsealed' | 'opened' | 'letter' | 'memories' | 'revealed';
export type RuntimePhase = 'closed' | 'opening' | 'opened' | 'revealed';

export type RuntimeEvent = 'seal-complete' | 'open-envelope' | 'show-letter' | 'show-memories' | 'reveal-gift' | 'reset';

export const runtimePresentationTiming = {
  sealRelease: 520,
  envelopeOpen: 720,
  cardExtraction: 820,
  giftReveal: 720,
  ticketRevealDelay: 180,
} as const;

export function getRuntimePhase(stage: RuntimeStage): RuntimePhase {
  if (stage === 'sealed') return 'closed';
  if (stage === 'revealed') return 'revealed';
  if (stage === 'letter' || stage === 'memories') return 'opened';
  return 'opening';
}

export function shouldShowGiftAudioControl(stage: RuntimeStage, hasAudio: boolean): boolean {
  return stage === 'revealed' && hasAudio;
}

export function transitionRuntimeStage(stage: RuntimeStage, event: RuntimeEvent): RuntimeStage {
  if (event === 'reset') return 'sealed';
  if (stage === 'sealed' && event === 'seal-complete') return 'unsealed';
  if (stage === 'unsealed' && event === 'open-envelope') return 'opened';
  if (stage === 'opened' && event === 'show-letter') return 'letter';
  if (stage === 'letter' && event === 'show-memories') return 'memories';
  if ((stage === 'letter' || stage === 'memories') && event === 'reveal-gift') return 'revealed';
  return stage;
}

export function getRuntimeTransitionDelay(durationMs: number, prefersReducedMotion: boolean) {
  return prefersReducedMotion ? 0 : durationMs;
}

interface PointerInput {
  pointerId: number;
  pointerType: string;
  button: number;
  isPrimary: boolean;
}

export function isEligibleHoldPointer(input: PointerInput) {
  return input.isPrimary && (input.pointerType !== 'mouse' || input.button === 0);
}

export function createPointerOwnership() {
  let activePointerId: number | null = null;

  return {
    claim(pointerId: number) {
      if (activePointerId !== null) return false;
      activePointerId = pointerId;
      return true;
    },
    owns(pointerId: number) {
      return activePointerId === pointerId;
    },
    release(pointerId: number) {
      if (activePointerId !== pointerId) return false;
      activePointerId = null;
      return true;
    },
    clear() {
      const pointerId = activePointerId;
      activePointerId = null;
      return pointerId;
    },
    hasOwner() {
      return activePointerId !== null;
    },
  };
}

export type DirectedDragOutcome = 'ignored' | 'returned' | 'completed';

interface DirectedDragControllerOptions {
  threshold: number;
  onProgress: (progress: number) => void;
  onActiveChange: (active: boolean) => void;
  onComplete: () => void;
}

export interface DirectedDragController {
  start: (pointerId: number, clientY: number, travelDistance: number) => boolean;
  move: (pointerId: number, clientY: number) => boolean;
  finish: (pointerId: number) => DirectedDragOutcome;
  cancel: (pointerId: number) => DirectedDragOutcome;
  completeFromFallback: () => boolean;
  reset: () => void;
  owns: (pointerId: number) => boolean;
}

export function getDirectedDragProgress(startY: number, currentY: number, travelDistance: number) {
  if (!Number.isFinite(travelDistance) || travelDistance <= 0) return 0;
  return Math.min(1, Math.max(0, (startY - currentY) / travelDistance));
}

export function createDirectedDragController(options: DirectedDragControllerOptions): DirectedDragController {
  let activePointerId: number | null = null;
  let startY = 0;
  let travelDistance = 1;
  let progress = 0;
  let completed = false;

  const returnToRest = () => {
    activePointerId = null;
    progress = 0;
    options.onActiveChange(false);
    options.onProgress(0);
    return 'returned' as const;
  };

  const complete = () => {
    if (completed) return false;
    completed = true;
    activePointerId = null;
    progress = 1;
    options.onActiveChange(false);
    options.onProgress(1);
    options.onComplete();
    return true;
  };

  return {
    start(pointerId, clientY, nextTravelDistance) {
      if (completed || activePointerId !== null || !Number.isFinite(nextTravelDistance) || nextTravelDistance <= 0) return false;
      activePointerId = pointerId;
      startY = clientY;
      travelDistance = nextTravelDistance;
      progress = 0;
      options.onProgress(0);
      options.onActiveChange(true);
      return true;
    },
    move(pointerId, clientY) {
      if (activePointerId !== pointerId || completed) return false;
      progress = getDirectedDragProgress(startY, clientY, travelDistance);
      options.onProgress(progress);
      return true;
    },
    finish(pointerId) {
      if (activePointerId !== pointerId || completed) return 'ignored';
      if (progress >= options.threshold) {
        complete();
        return 'completed';
      }
      return returnToRest();
    },
    cancel(pointerId) {
      if (activePointerId !== pointerId || completed) return 'ignored';
      return returnToRest();
    },
    completeFromFallback() {
      if (activePointerId !== null || completed) return false;
      return complete();
    },
    reset() {
      activePointerId = null;
      progress = 0;
      completed = false;
      options.onActiveChange(false);
      options.onProgress(0);
    },
    owns(pointerId) {
      return activePointerId === pointerId;
    },
  };
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
  interrupt: () => boolean;
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

  const abortAttempt = (notify: boolean) => {
    if (startedAt === null || completed) return false;
    stopAttempt();
    options.onProgress(0);
    if (notify) options.onCancel();
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
    release: () => abortAttempt(true),
    cancel: () => abortAttempt(true),
    interrupt: () => abortAttempt(false),
    reset() {
      stopAttempt();
      completed = false;
      options.onProgress(0);
    },
    dispose: stopAttempt,
  };
}
