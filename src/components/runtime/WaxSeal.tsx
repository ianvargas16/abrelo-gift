import type { CSSProperties, KeyboardEvent } from 'react';

interface WaxSealProps {
  progress: number;
  onStart: () => void;
  onRelease: () => void;
}

export function WaxSeal({ progress, onStart, onRelease }: WaxSealProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!event.repeat) onStart();
    }
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRelease();
    }
  };

  return (
    <button
      className="wax-seal"
      onPointerDown={onStart}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      onPointerLeave={onRelease}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={onRelease}
      aria-label="Mantén presionado para romper el sello"
      style={{ '--progress': `${progress * 3.6}deg` } as CSSProperties}
    >
      <span>✦</span>
    </button>
  );
}
