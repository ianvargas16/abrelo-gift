import type { ReactNode } from 'react';

interface EnvelopeProps {
  recipientName: string;
  isOpen: boolean;
  isShaking: boolean;
  seal?: ReactNode;
}

export function Envelope({ recipientName, isOpen, isShaking, seal }: EnvelopeProps) {
  return (
    <div className={`envelope ${isOpen ? 'is-open' : ''} ${isShaking ? 'shake' : ''}`}>
      <div className="envelope-back" />
      <div className="letter-peek">
        <span>{recipientName}</span>
      </div>
      <div className="envelope-front" />
      <div className="envelope-flap" />
      {seal}
    </div>
  );
}
