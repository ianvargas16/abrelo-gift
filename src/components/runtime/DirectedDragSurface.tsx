import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import {
  createDirectedDragController,
  getSmoothedDragProgress,
  isEligibleHoldPointer,
  type DirectedDragController,
} from './runtimeInteraction';

interface DirectedDragSurfaceProps {
  ariaLabel: string;
  children: ReactNode;
  className: string;
  disabled: boolean;
  distanceRatio: number;
  rotationDegrees?: number;
  threshold?: number;
  onComplete: () => void;
}

export function DirectedDragSurface({
  ariaLabel,
  children,
  className,
  disabled,
  distanceRatio,
  rotationDegrees = 0,
  threshold = 0.58,
  onComplete,
}: DirectedDragSurfaceProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const completeRef = useRef(onComplete);
  const travelDistanceRef = useRef(1);
  const progressRef = useRef(0);
  const visualProgressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const previousFrameTimeRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);
  const rotationDegreesRef = useRef(rotationDegrees);
  const [isDragging, setIsDragging] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const controllerRef = useRef<DirectedDragController | null>(null);
  completeRef.current = onComplete;
  rotationDegreesRef.current = rotationDegrees;

  const renderProgress = (progress: number) => {
    visualProgressRef.current = progress;
    const element = buttonRef.current;
    if (!element) return;
    element.style.setProperty('--drag-progress', String(progress));
    element.style.setProperty('--drag-offset', `${progress * travelDistanceRef.current}px`);
    element.style.setProperty('--drag-rotation', `${progress * rotationDegreesRef.current}deg`);
  };

  const stopFollowing = () => {
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    previousFrameTimeRef.current = null;
  };

  const followProgress = (timestamp: number) => {
    const elapsed = previousFrameTimeRef.current === null ? 1000 / 60 : timestamp - previousFrameTimeRef.current;
    previousFrameTimeRef.current = timestamp;
    const next = getSmoothedDragProgress(visualProgressRef.current, targetProgressRef.current, elapsed);
    renderProgress(next);

    if (next === targetProgressRef.current) {
      stopFollowing();
      return;
    }
    animationFrameRef.current = requestAnimationFrame(followProgress);
  };

  const applyProgress = (progress: number) => {
    progressRef.current = progress;
    targetProgressRef.current = progress;
    const isActive = buttonRef.current?.classList.contains('is-dragging') ?? false;
    if (reducedMotionRef.current || !isActive) {
      stopFollowing();
      renderProgress(progress);
      return;
    }
    if (animationFrameRef.current === null) animationFrameRef.current = requestAnimationFrame(followProgress);
  };

  const prepareRelease = (element: HTMLButtonElement, settling: boolean) => {
    element.classList.remove('is-dragging');
    element.classList.toggle('is-settling', settling);
  };

  if (controllerRef.current === null) {
    controllerRef.current = createDirectedDragController({
      threshold,
      onProgress: applyProgress,
      onActiveChange: setIsDragging,
      onComplete: () => completeRef.current(),
    });
  }

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateReducedMotion = () => {
      reducedMotionRef.current = media.matches;
      if (media.matches) {
        stopFollowing();
        renderProgress(targetProgressRef.current);
      }
    };
    updateReducedMotion();
    media.addEventListener('change', updateReducedMotion);
    return () => {
      media.removeEventListener('change', updateReducedMotion);
      stopFollowing();
    };
  }, []);

  useEffect(() => {
    if (disabled) {
      controllerRef.current?.reset();
      setIsSettling(false);
      buttonRef.current?.classList.remove('is-dragging', 'is-settling');
    }
  }, [disabled]);

  useEffect(() => {
    const interruptDrag = () => {
      if (buttonRef.current) prepareRelease(buttonRef.current, true);
      controllerRef.current?.reset();
      setIsSettling(true);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') interruptDrag();
    };

    window.addEventListener('blur', interruptDrag);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('blur', interruptDrag);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const releasePointerCapture = (element: HTMLButtonElement, pointerId: number) => {
    if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled || !isEligibleHoldPointer(event)) return;
    setIsSettling(false);
    event.currentTarget.classList.remove('is-settling');
    const travelDistance = Math.max(72, event.currentTarget.getBoundingClientRect().height * distanceRatio);
    travelDistanceRef.current = travelDistance;
    if (!controllerRef.current?.start(event.pointerId, event.clientY, travelDistance)) return;
    event.currentTarget.classList.add('is-dragging');

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      prepareRelease(event.currentTarget, true);
      controllerRef.current.cancel(event.pointerId);
      setIsSettling(true);
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!controllerRef.current?.owns(event.pointerId)) return;
    event.preventDefault();
    const samples = event.nativeEvent.getCoalescedEvents?.();
    const latestSample = samples?.[samples.length - 1];
    controllerRef.current.move(event.pointerId, latestSample?.clientY ?? event.clientY);
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (!controllerRef.current?.owns(event.pointerId)) return;
    const shouldReturn = progressRef.current < threshold;
    prepareRelease(event.currentTarget, shouldReturn);
    setIsSettling(controllerRef.current.finish(event.pointerId) === 'returned');
    releasePointerCapture(event.currentTarget, event.pointerId);
  };

  const handlePointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    if (!controllerRef.current?.owns(event.pointerId)) return;
    prepareRelease(event.currentTarget, true);
    setIsSettling(controllerRef.current.cancel(event.pointerId) === 'returned');
    releasePointerCapture(event.currentTarget, event.pointerId);
  };

  const handleLostPointerCapture = (event: PointerEvent<HTMLButtonElement>) => {
    if (!controllerRef.current?.owns(event.pointerId)) return;
    prepareRelease(event.currentTarget, true);
    if (controllerRef.current.cancel(event.pointerId) === 'returned') setIsSettling(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      prepareRelease(event.currentTarget, true);
      controllerRef.current?.reset();
      setIsSettling(true);
    }
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`${className} physical-drag-surface ${isDragging ? 'is-dragging' : ''} ${isSettling ? 'is-settling' : ''}`}
      disabled={disabled}
      aria-label={ariaLabel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handleLostPointerCapture}
      onKeyDown={handleKeyDown}
      onClick={(event) => {
        if (event.detail === 0 && !disabled) {
          prepareRelease(event.currentTarget, false);
          controllerRef.current?.completeFromFallback();
        }
      }}
    >
      {children}
    </button>
  );
}
