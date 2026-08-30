import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { createDirectedDragController, isEligibleHoldPointer, type DirectedDragController } from './runtimeInteraction';

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
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const controllerRef = useRef<DirectedDragController | null>(null);
  completeRef.current = onComplete;

  if (controllerRef.current === null) {
    controllerRef.current = createDirectedDragController({
      threshold,
      onProgress: setProgress,
      onActiveChange: setIsDragging,
      onComplete: () => completeRef.current(),
    });
  }

  useEffect(() => {
    if (disabled) {
      controllerRef.current?.reset();
      setIsSettling(false);
    }
  }, [disabled]);

  useEffect(() => {
    const interruptDrag = () => {
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
    const travelDistance = Math.max(72, event.currentTarget.getBoundingClientRect().height * distanceRatio);
    if (!controllerRef.current?.start(event.pointerId, event.clientY, travelDistance)) return;
    travelDistanceRef.current = travelDistance;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      controllerRef.current.cancel(event.pointerId);
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!controllerRef.current?.owns(event.pointerId)) return;
    event.preventDefault();
    controllerRef.current.move(event.pointerId, event.clientY);
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (!controllerRef.current?.owns(event.pointerId)) return;
    setIsSettling(controllerRef.current.finish(event.pointerId) === 'returned');
    releasePointerCapture(event.currentTarget, event.pointerId);
  };

  const handlePointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    if (!controllerRef.current?.owns(event.pointerId)) return;
    setIsSettling(controllerRef.current.cancel(event.pointerId) === 'returned');
    releasePointerCapture(event.currentTarget, event.pointerId);
  };

  const handleLostPointerCapture = (event: PointerEvent<HTMLButtonElement>) => {
    if (controllerRef.current?.cancel(event.pointerId) === 'returned') setIsSettling(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      controllerRef.current?.reset();
    }
  };

  const style = {
    '--drag-progress': progress,
    '--drag-offset': `${progress * travelDistanceRef.current}px`,
    '--drag-rotation': `${progress * rotationDegrees}deg`,
  } as CSSProperties;

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
        if (event.detail === 0 && !disabled) controllerRef.current?.completeFromFallback();
      }}
      style={style}
    >
      {children}
    </button>
  );
}
