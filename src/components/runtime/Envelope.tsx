import type { CSSProperties, PointerEvent, ReactNode } from 'react';

export type EnvelopeState = 'sealed' | 'unsealed' | 'opened' | 'extracting';

interface EnvelopeProps {
  recipientName: string;
  state: EnvelopeState;
  isShaking: boolean;
  isInteracting?: boolean;
  isOpening?: boolean;
  seal?: ReactNode;
}

export function Envelope({
  recipientName,
  state,
  isShaking,
  isInteracting = false,
  isOpening = false,
  seal,
}: EnvelopeProps) {
  const label = recipientName.trim();
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    event.currentTarget.style.setProperty('--envelope-rotate-y', `${x * 2.4}deg`);
    event.currentTarget.style.setProperty('--envelope-rotate-x', `${y * -1.8}deg`);
  };

  const resetPerspective = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty('--envelope-rotate-y', '0deg');
    event.currentTarget.style.setProperty('--envelope-rotate-x', '0deg');
  };

  return (
    <div
      className={`envelope state-${state} ${isShaking ? 'shake' : ''} ${isInteracting ? 'is-interacting' : ''} ${isOpening ? 'is-opening' : ''}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPerspective}
      style={{ '--envelope-rotate-x': '0deg', '--envelope-rotate-y': '0deg' } as CSSProperties}
    >
      <div className="envelope-shadow" aria-hidden="true" />
      <div className="envelope-back">
        <div className="envelope-lining" aria-hidden="true" />
      </div>
      <div className="envelope-throat" aria-hidden="true" />
      <div className="letter-peek">
        {label && <small>Para</small>}
        <span>{label || 'Para ti'}</span>
      </div>
      <div className="envelope-front">
        <div className="envelope-address">
          <small>Ábrelo</small>
          <span>{label || 'Para ti'}</span>
        </div>
      </div>
      <div className="envelope-flap" />
      {seal}
    </div>
  );
}
