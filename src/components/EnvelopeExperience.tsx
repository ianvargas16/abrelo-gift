import { useEffect, useRef, useState } from 'react';
import type { GiftConfig } from '../models/giftConfig';
import { Envelope } from './runtime/Envelope';
import { GiftReveal } from './runtime/GiftReveal';
import { Letter } from './runtime/Letter';
import {
  createSealHoldController,
  getRuntimeTransitionDelay,
  transitionRuntimeStage,
  type RuntimeStage,
  type SealHoldController,
} from './runtime/runtimeInteraction';
import { WaxSeal } from './runtime/WaxSeal';

interface EnvelopeExperienceProps {
  gift: GiftConfig;
}

const HOLD_MS = 1350;
const CARD_EXTRACTION_MS = 720;
const GIFT_REVEAL_MS = 560;

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(media.matches);
    updatePreference();
    media.addEventListener('change', updatePreference);
    return () => media.removeEventListener('change', updatePreference);
  }, []);

  return reducedMotion;
}

export function EnvelopeExperience({ gift }: EnvelopeExperienceProps) {
  const [stage, setStage] = useState<RuntimeStage>('sealed');
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [failedAttempt, setFailedAttempt] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const holdController = useRef<SealHoldController | null>(null);
  const feedbackTimer = useRef<number | null>(null);
  const transitionTimer = useRef<number | null>(null);
  const recipientName = gift.recipientName.trim();
  const senderName = gift.senderName.trim();
  const introEyebrow = gift.intro.eyebrow.trim() || 'ÁBRELO';
  const introTitle = gift.intro.title.trim() || 'Hay algo para ti';
  const letterTitle = gift.letter.title.trim() || 'Carta';
  const sealHint = gift.intro.envelopeHint.trim() || 'Mantén presionado el sello';
  const envelopeState = isExtracting
    ? 'extracting'
    : stage === 'opened'
      ? 'opened'
      : stage === 'unsealed'
        ? 'unsealed'
        : 'sealed';
  const recipientLine = recipientName && senderName
    ? `Para ${recipientName}, de ${senderName}.`
    : recipientName
      ? `Para ${recipientName}.`
      : senderName
        ? `De ${senderName}.`
        : 'Un regalo pensado para ti.';

  const clearTimer = (timer: typeof feedbackTimer) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => {
    holdController.current = createSealHoldController({
      durationMs: HOLD_MS,
      now: () => performance.now(),
      requestFrame: (callback) => requestAnimationFrame(callback),
      cancelFrame: (handle) => cancelAnimationFrame(handle),
      onProgress: setProgress,
      onComplete: () => {
        setIsHolding(false);
        setFailedAttempt(false);
        setStage((current) => transitionRuntimeStage(current, 'seal-complete'));
        navigator.vibrate?.(14);
      },
      onCancel: () => {
        setIsHolding(false);
        setFailedAttempt(true);
        clearTimer(feedbackTimer);
        feedbackTimer.current = window.setTimeout(() => setFailedAttempt(false), 650);
      },
    });

    return () => {
      holdController.current?.dispose();
      clearTimer(feedbackTimer);
      clearTimer(transitionTimer);
    };
  }, []);

  const startHold = () => {
    if (stage !== 'sealed') return;
    setFailedAttempt(false);
    if (holdController.current?.start()) setIsHolding(true);
  };

  const releaseHold = () => {
    holdController.current?.release();
  };

  const cancelHold = () => {
    holdController.current?.cancel();
  };

  const scheduleStage = (event: 'show-letter' | 'reveal-gift', delay: number) => {
    clearTimer(transitionTimer);
    const transitionDelay = getRuntimeTransitionDelay(delay, prefersReducedMotion);
    if (transitionDelay === 0) {
      setStage((current) => transitionRuntimeStage(current, event));
      return;
    }
    transitionTimer.current = window.setTimeout(() => {
      setStage((current) => transitionRuntimeStage(current, event));
      transitionTimer.current = null;
    }, transitionDelay);
  };

  const extractLetter = () => {
    if (stage !== 'opened' || isExtracting) return;
    setIsExtracting(true);
    scheduleStage('show-letter', CARD_EXTRACTION_MS);
  };

  const revealGift = () => {
    if (stage !== 'letter' || isRevealing) return;
    setIsRevealing(true);
    scheduleStage('reveal-gift', GIFT_REVEAL_MS);
  };

  const reset = () => {
    clearTimer(feedbackTimer);
    clearTimer(transitionTimer);
    holdController.current?.reset();
    setStage((current) => transitionRuntimeStage(current, 'reset'));
    setIsHolding(false);
    setFailedAttempt(false);
    setIsExtracting(false);
    setIsRevealing(false);
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
        <header className={`experience-heading ${isExtracting ? 'is-extracting' : ''}`}>
          {stage !== 'letter' && <><p>{introEyebrow}</p><h1>{introTitle}</h1></>}
          <span>{recipientLine}</span>
        </header>

        {stage !== 'letter' ? (
          <section className="envelope-zone">
            <Envelope
              recipientName={recipientName}
              state={envelopeState}
              isShaking={failedAttempt}
              seal={stage === 'sealed' || stage === 'unsealed' ? (
                <WaxSeal
                  progress={stage === 'unsealed' ? 1 : progress}
                  status={stage === 'unsealed' ? 'released' : isHolding ? 'holding' : 'idle'}
                  onStart={startHold}
                  onRelease={releaseHold}
                  onCancel={cancelHold}
                />
              ) : undefined}
            />

            <div className={`interaction-copy ${isExtracting ? 'is-extracting' : ''}`} aria-live="polite">
              {stage === 'sealed' && <><strong>{sealHint}</strong><span>{failedAttempt ? 'Casi… no lo sueltes todavía.' : 'El sello necesita una presión continua y tranquila.'}</span></>}
              {stage === 'unsealed' && <><strong>El sello cedió.</strong><button onClick={() => setStage((current) => transitionRuntimeStage(current, 'open-envelope'))}>Abrir el sobre</button></>}
              {stage === 'opened' && <><strong>Ahora sí.</strong><button onClick={extractLetter} disabled={isExtracting}>{isExtracting ? 'Sacando la carta…' : 'Sacar la carta'}</button></>}
            </div>
          </section>
        ) : (
          <section className="letter-stage">
            <Letter title={letterTitle} message={gift.letter.message} senderName={senderName} isRevealing={isRevealing} onReveal={revealGift} />
          </section>
        )}
      </div>
    </main>
  );
}
