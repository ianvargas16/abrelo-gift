import { useEffect, useRef, useState } from 'react';
import type { GiftConfig } from '../models/giftConfig';
import { Envelope } from './runtime/Envelope';
import { GiftReveal } from './runtime/GiftReveal';
import { Letter } from './runtime/Letter';
import { WaxSeal } from './runtime/WaxSeal';

type Stage = 'sealed' | 'unsealed' | 'opened' | 'letter' | 'revealed';

interface EnvelopeExperienceProps {
  gift: GiftConfig;
}

const HOLD_MS = 1350;

export function EnvelopeExperience({ gift }: EnvelopeExperienceProps) {
  const [stage, setStage] = useState<Stage>('sealed');
  const [progress, setProgress] = useState(0);
  const [failedAttempt, setFailedAttempt] = useState(false);
  const holdStartedAt = useRef<number | null>(null);
  const animationFrame = useRef<number | null>(null);
  const recipientName = gift.recipientName.trim();
  const senderName = gift.senderName.trim();
  const introEyebrow = gift.intro.eyebrow.trim() || 'ÁBRELO';
  const introTitle = gift.intro.title.trim() || 'Hay algo para ti';
  const letterTitle = gift.letter.title.trim() || 'Carta';
  const sealHint = gift.intro.envelopeHint.trim() || 'Mantén presionado el sello';
  const recipientLine = recipientName && senderName
    ? `Para ${recipientName}, de ${senderName}.`
    : recipientName
      ? `Para ${recipientName}.`
      : senderName
        ? `De ${senderName}.`
        : 'Un regalo pensado para ti.';

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
      <main className={`experience theme-${gift.theme} stage-${stage}`}>
        <GiftReveal gift={gift} onRestart={reset} />
      </main>
    );
  }

  return (
    <main className={`experience theme-${gift.theme} stage-${stage}`}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="experience-grain" aria-hidden="true" />
      <div className="experience-halo" aria-hidden="true" />

      <div className="experience-frame">
        <header className="experience-heading">
          {stage !== 'letter' && <><p>{introEyebrow}</p><h1>{introTitle}</h1></>}
          <span>{recipientLine}</span>
        </header>

        {stage !== 'letter' ? (
          <section className="envelope-zone">
            <Envelope
              recipientName={recipientName}
              isOpen={stage === 'opened'}
              isShaking={failedAttempt}
              seal={stage === 'sealed' ? <WaxSeal progress={progress} onStart={startHold} onRelease={releaseHold} /> : undefined}
            />

            <div className="interaction-copy">
              {stage === 'sealed' && <><strong>{sealHint}</strong><span>{failedAttempt ? 'Casi… no lo sueltes todavía.' : 'El sello necesita una presión continua y tranquila.'}</span></>}
              {stage === 'unsealed' && <><strong>El sello cedió.</strong><button onClick={() => setStage('opened')}>Abrir el sobre</button></>}
              {stage === 'opened' && <><strong>Ahora sí.</strong><button onClick={() => setStage('letter')}>Sacar la carta</button></>}
            </div>
          </section>
        ) : (
          <section className="letter-stage">
            <Letter title={letterTitle} message={gift.letter.message} senderName={senderName} onReveal={() => setStage('revealed')} />
          </section>
        )}
      </div>
    </main>
  );
}
