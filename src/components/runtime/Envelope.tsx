import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import { DirectedDragSurface } from './DirectedDragSurface';

export type EnvelopeState = 'sealed' | 'unsealed' | 'opened' | 'extracting';

interface EnvelopeProps {
  recipientName: string;
  state: EnvelopeState;
  isShaking: boolean;
  isInteracting?: boolean;
  isOpening?: boolean;
  seal?: ReactNode;
  onOpen?: () => void;
  onExtract?: () => void;
}

export function Envelope({
  recipientName,
  state,
  isShaking,
  isInteracting = false,
  isOpening = false,
  seal,
  onOpen = () => undefined,
  onExtract = () => undefined,
}: EnvelopeProps) {
  const label = recipientName.trim();
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    if ((event.target as Element).closest('.physical-drag-surface')) return;
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
      <DirectedDragSurface
        className="letter-peek"
        ariaLabel="Tira de la carta hacia arriba para sacarla. También puedes presionar Enter o Espacio."
        disabled={state !== 'opened' || isOpening}
        distanceRatio={0.58}
        rotationDegrees={0.45}
        threshold={0.62}
        onComplete={onExtract}
      >
        <span className="card-pull-cue" aria-hidden="true"><i /> Tira</span>
        {label && <small>Para</small>}
        <span>{label || 'Para ti'}</span>
      </DirectedDragSurface>
      <div className="envelope-front">
        <div className="envelope-address">
          <small>Ábrelo</small>
          <span>{label || 'Para ti'}</span>
        </div>
      </div>
      <DirectedDragSurface
        className="envelope-flap"
        ariaLabel="Desliza la solapa hacia arriba para abrir el sobre. También puedes presionar Enter o Espacio."
        disabled={state !== 'unsealed' || isOpening}
        distanceRatio={0.58}
        rotationDegrees={178}
        threshold={0.56}
        onComplete={onOpen}
      >
        <span className="flap-drag-cue" aria-hidden="true"><i /> Desliza</span>
      </DirectedDragSurface>
      {seal}
    </div>
  );
}
