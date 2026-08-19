import type { CSSProperties } from 'react';

interface WaxSealProps {
  progress: number;
  onStart: () => void;
  onRelease: () => void;
}

export function WaxSeal({ progress, onStart, onRelease }: WaxSealProps) {
  return (
    <button
      className="wax-seal"
      onPointerDown={onStart}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      onPointerLeave={onRelease}
      aria-label="Mantén presionado para romper el sello"
      style={{ '--progress': `${progress * 3.6}deg` } as CSSProperties}
    >
      <span>✦</span>
    </button>
  );
}
