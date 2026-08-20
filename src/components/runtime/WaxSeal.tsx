import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';

export type WaxSealStatus = 'idle' | 'holding' | 'released';

interface WaxSealProps {
  progress: number;
  status: WaxSealStatus;
  onStart: () => void;
  onRelease: () => void;
  onCancel: () => void;
}

export function isSealActivationKey(key: string) {
  return key === 'Enter' || key === ' ';
}

export function WaxSeal({ progress, status, onStart, onRelease, onCancel }: WaxSealProps) {
  const sealStyle = {
    '--progress': `${progress * 360}deg`,
    '--seal-scale': 1 - progress * 0.06,
    '--mark-scale': 1 - progress * 0.08,
    '--crack-opacity': Math.min(0.72, Math.max(0, (progress - 0.52) * 3)),
    '--hold-ring': `${progress * 0.38}rem`,
  } as CSSProperties;

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    onStart();
  };

  const releasePointerCapture = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    releasePointerCapture(event);
    onRelease();
  };

  const handlePointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    releasePointerCapture(event);
    onCancel();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (isSealActivationKey(event.key)) {
      event.preventDefault();
      if (!event.repeat) onStart();
    }
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (isSealActivationKey(event.key)) {
      event.preventDefault();
      onRelease();
    }
  };

  return (
    <button
      className={`wax-seal is-${status}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={onCancel}
      aria-label="Mantén presionado para romper el sello"
      aria-pressed={status === 'released'}
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
