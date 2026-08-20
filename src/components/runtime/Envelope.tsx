import type { ReactNode } from 'react';

interface EnvelopeProps {
  recipientName: string;
  isOpen: boolean;
  isShaking: boolean;
  seal?: ReactNode;
}

export function Envelope({ recipientName, isOpen, isShaking, seal }: EnvelopeProps) {
  const label = recipientName.trim() || 'Para ti';

  return (
    <div className={`envelope ${isOpen ? 'is-open' : ''} ${isShaking ? 'shake' : ''}`}>
      <div className="envelope-shadow" aria-hidden="true" />
      <div className="envelope-back">
        <div className="envelope-lining" aria-hidden="true" />
      </div>
      <div className="letter-peek">
        <small>Para</small>
        <span>{label}</span>
      </div>
      <div className="envelope-front">
        <div className="envelope-address">
          <small>Ábrelo</small>
          <span>{label}</span>
        </div>
      </div>
      <div className="envelope-flap" />
      {seal}
    </div>
  );
}
