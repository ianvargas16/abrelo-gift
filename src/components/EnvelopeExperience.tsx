import { useEffect, useRef, useState } from 'react';
import type { GiftConfig } from '../types/gift';
import { Confetti } from './Confetti';
import { Ticket } from './Ticket';

type Stage = 'sealed' | 'unsealed' | 'opened' | 'letter' | 'revealed';

interface EnvelopeExperienceProps {
  gift: GiftConfig;
  onOpenEditor: () => void;
}

const HOLD_MS = 1350;

export function EnvelopeExperience({ gift, onOpenEditor }: EnvelopeExperienceProps) {
  const [stage, setStage] = useState<Stage>('sealed');
  const [progress, setProgress] = useState(0);
  const [failedAttempt, setFailedAttempt] = useState(false);
  const holdStartedAt = useRef<number | null>(null);
  const animationFrame = useRef<number | null>(null);

  const stopHold = () => {
    if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    animationFrame.current = null;
    holdStartedAt.current = null;
  };

  useEffect(() => () => stopHold(), []);

  const tick = () => {
    if (!holdStartedAt.current) return;
    const elapsed = performance.now() - holdStartedAt.current;
    const next = Math.min(100, (elapsed / HOLD_MS) * 100);
    setProgress(next);

    if (next >= 100) {
      stopHold();
      setStage('unsealed');
      setProgress(100);
      setFailedAttempt(false);
      return;
    }

    animationFrame.current = requestAnimationFrame(tick);
  };

  const startHold = () => {
    if (stage !== 'sealed') return;
    setFailedAttempt(false);
    holdStartedAt.current = performance.now();
    animationFrame.current = requestAnimationFrame(tick);
  };

  const releaseHold = () => {
    if (stage !== 'sealed' || !holdStartedAt.current) return;
    stopHold();
    setProgress(0);
    setFailedAttempt(true);
    window.setTimeout(() => setFailedAttempt(false), 650);
  };

  const reset = () => {
    setStage('sealed');
    setProgress(0);
    setFailedAttempt(false);
  };

  if (stage === 'revealed') {
    return (
      <main className={`experience theme-${gift.theme}`}>
        <Confetti />
        <Ticket gift={gift} onRestart={reset} />
        <button className="editor-shortcut" onClick={onOpenEditor}>Configurar</button>
      </main>
    );
  }

  return (
    <main className={`experience theme-${gift.theme}`}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="experience-heading">
        <p>{gift.introEyebrow}</p>
        <h1>{stage === 'letter' ? gift.letterTitle : gift.introTitle}</h1>
        <span>{stage === 'letter' ? `Para ${gift.recipientName}` : `Para ${gift.recipientName}, con cariño.`}</span>
      </header>

      {stage !== 'letter' ? (
        <section className="envelope-zone">
          <div className={`envelope ${stage === 'opened' ? 'is-open' : ''} ${failedAttempt ? 'shake' : ''}`}>
            <div className="envelope-back" />
            <div className="letter-peek">
              <span>{gift.recipientName}</span>
            </div>
            <div className="envelope-front" />
            <div className="envelope-flap" />

            {stage === 'sealed' && (
              <button
                className="wax-seal"
                onPointerDown={startHold}
                onPointerUp={releaseHold}
                onPointerCancel={releaseHold}
                onPointerLeave={releaseHold}
                aria-label="Mantén presionado para romper el sello"
                style={{ '--progress': `${progress * 3.6}deg` } as React.CSSProperties}
              >
                <span>✦</span>
              </button>
            )}
          </div>

          <div className="interaction-copy">
            {stage === 'sealed' && <><strong>{gift.envelopeHint}</strong><span>{failedAttempt ? 'Casi… no lo sueltes todavía.' : 'El sello necesita un poquito de paciencia.'}</span></>}
            {stage === 'unsealed' && <><strong>El sello cedió.</strong><button onClick={() => setStage('opened')}>Abrir el sobre</button></>}
            {stage === 'opened' && <><strong>Ahora sí.</strong><button onClick={() => setStage('letter')}>Sacar la tarjeta ↑</button></>}
          </div>
        </section>
      ) : (
        <section className="letter-stage">
          <article className="birthday-letter">
            <div className="letter-mark">✦</div>
            <p>{gift.letterMessage}</p>
            <div className="letter-signature">— {gift.senderName}</div>
            <button className="reveal-button" onClick={() => setStage('revealed')}>Descubrir mi regalo</button>
          </article>
        </section>
      )}

      <button className="editor-shortcut" onClick={onOpenEditor}>Configurar</button>
    </main>
  );
}
