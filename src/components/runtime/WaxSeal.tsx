import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { createPointerOwnership, isEligibleHoldPointer } from './runtimeInteraction';

export type WaxSealStatus = 'idle' | 'holding' | 'released';

interface WaxSealProps {
  progress: number;
  status: WaxSealStatus;
  onStart: () => boolean;
  onRelease: () => void;
  onCancel: () => void;
  onInterrupt: () => void;
}

export function isSealActivationKey(key: string) {
  return key === 'Enter' || key === ' ';
}

export function WaxSeal({ progress, status, onStart, onRelease, onCancel, onInterrupt }: WaxSealProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pointerOwnership = useRef(createPointerOwnership());
  const keyboardOwnsHold = useRef(false);
  const onInterruptRef = useRef(onInterrupt);
  onInterruptRef.current = onInterrupt;

  const sealStyle = {
    '--progress': `${progress * 360}deg`,
    '--seal-scale': 1 - progress * 0.06,
    '--mark-scale': 1 - progress * 0.08,
    '--crack-opacity': Math.min(0.72, Math.max(0, (progress - 0.52) * 3)),
    '--hold-ring': `${progress * 0.38}rem`,
  } as CSSProperties;

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!isEligibleHoldPointer(event) || keyboardOwnsHold.current || pointerOwnership.current.hasOwner()) return;
    if (!onStart() || !pointerOwnership.current.claim(event.pointerId)) return;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      pointerOwnership.current.release(event.pointerId);
      onCancel();
    }
  };

  const releasePointerCapture = (element: HTMLButtonElement, pointerId: number) => {
    if (element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (!pointerOwnership.current.release(event.pointerId)) return;
    releasePointerCapture(event.currentTarget, event.pointerId);
    onRelease();
  };

  const handlePointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    if (!pointerOwnership.current.release(event.pointerId)) return;
    releasePointerCapture(event.currentTarget, event.pointerId);
    onCancel();
  };

  const handleLostPointerCapture = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointerOwnership.current.release(event.pointerId)) onCancel();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (isSealActivationKey(event.key)) {
      event.preventDefault();
      if (!event.repeat && !keyboardOwnsHold.current && !pointerOwnership.current.hasOwner()) {
        keyboardOwnsHold.current = onStart();
      }
    }
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (isSealActivationKey(event.key)) {
      event.preventDefault();
      if (!keyboardOwnsHold.current) return;
      keyboardOwnsHold.current = false;
      onRelease();
    }
  };

  const interruptInteraction = () => {
    keyboardOwnsHold.current = false;
    const pointerId = pointerOwnership.current.clear();
    if (pointerId !== null && buttonRef.current) {
      releasePointerCapture(buttonRef.current, pointerId);
    }
    onInterruptRef.current();
  };

  const handleBlur = () => {
    interruptInteraction();
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') interruptInteraction();
    };

    window.addEventListener('blur', interruptInteraction);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('blur', interruptInteraction);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <button
      ref={buttonRef}
      className={`wax-seal is-${status}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handleLostPointerCapture}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={handleBlur}
      aria-label="Mantén presionado para romper el sello"
      disabled={status === 'released'}
      style={sealStyle}
    >
      <span className="wax-seal-face" aria-hidden="true">
        <span>✦</span>
        <i className="wax-seal-crack wax-seal-crack-one" />
        <i className="wax-seal-crack wax-seal-crack-two" />
      </span>
    </button>
  );
}
