import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { hasGiftMemories, type GiftConfig } from '../models/giftConfig';
import { Envelope } from './runtime/Envelope';
import { GiftReveal } from './runtime/GiftReveal';
import { GiftAudioControl } from './runtime/GiftAudioControl';
import { Letter } from './runtime/Letter';
import { Memories } from './runtime/Memories';
import { useGiftAudio } from './runtime/useGiftAudio';
import {
  createSealHoldController,
  getRuntimePhase,
  getRuntimeTransitionDelay,
  runtimePresentationTiming,
  shouldShowGiftAudioControl,
  transitionRuntimeStage,
  type RuntimeStage,
  type SealHoldController,
} from './runtime/runtimeInteraction';
import { WaxSeal } from './runtime/WaxSeal';
import { getThemeCssVariables, resolveTheme } from '../themes/themeRegistry';
import { GiftBackground } from './runtime/GiftBackground';

interface EnvelopeExperienceProps {
  gift: GiftConfig;
}

const HOLD_MS = 1350;

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
  const [isSealReleasing, setIsSealReleasing] = useState(false);
  const [isEnvelopeOpening, setIsEnvelopeOpening] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [isMemoryRevealing, setIsMemoryRevealing] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const prefersReducedMotionRef = useRef(prefersReducedMotion);
  const giftAudio = useGiftAudio(Boolean(gift.audio));
  prefersReducedMotionRef.current = prefersReducedMotion;
  const holdController = useRef<SealHoldController | null>(null);
  const feedbackTimer = useRef<number | null>(null);
  const transitionTimer = useRef<number | null>(null);
  const runtimeMotionStyle = {
    '--runtime-seal-release-duration': `${runtimePresentationTiming.sealRelease}ms`,
    '--runtime-envelope-open-duration': `${runtimePresentationTiming.envelopeOpen}ms`,
    '--runtime-card-extraction-duration': `${runtimePresentationTiming.cardExtraction}ms`,
    '--runtime-gift-reveal-duration': `${runtimePresentationTiming.giftReveal}ms`,
    '--runtime-ticket-reveal-delay': `${runtimePresentationTiming.ticketRevealDelay}ms`,
  } as CSSProperties;
  const theme = resolveTheme(gift.theme);
  const experienceStyle = {
    ...getThemeCssVariables(theme),
    ...runtimeMotionStyle,
  } as CSSProperties;
  const recipientName = gift.recipientName.trim();
  const senderName = gift.senderName.trim();
  const introEyebrow = gift.intro.eyebrow.trim() || 'ÁBRELO';
  const introTitle = gift.intro.title.trim() || 'Hay algo para ti';
  const letterTitle = gift.letter.title.trim() || 'Carta';
  const sealHint = gift.intro.envelopeHint.trim() || 'Mantén presionado el sello';
  const hasMemories = hasGiftMemories(gift);
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

  const schedulePresentation = (callback: () => void, duration: number) => {
    clearTimer(transitionTimer);
    const delay = getRuntimeTransitionDelay(duration, prefersReducedMotionRef.current);
    if (delay === 0) {
      callback();
      return;
    }
    transitionTimer.current = window.setTimeout(() => {
      transitionTimer.current = null;
      callback();
    }, delay);
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
        setIsSealReleasing(true);
        giftAudio.completeReveal();
        setStage((current) => transitionRuntimeStage(current, 'seal-complete'));
        schedulePresentation(() => setIsSealReleasing(false), runtimePresentationTiming.sealRelease);
        navigator.vibrate?.(14);
      },
      onCancel: () => {
        setIsHolding(false);
        setFailedAttempt(true);
        giftAudio.cancelGesture();
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
    if (stage !== 'sealed') return false;
    setFailedAttempt(false);
    const started = holdController.current?.start() ?? false;
    if (started) {
      setIsHolding(true);
      giftAudio.beginGesture();
    }
    return started;
  };

  const releaseHold = () => {
    holdController.current?.release();
  };

  const cancelHold = () => {
    holdController.current?.cancel();
  };

  const interruptHold = () => {
    holdController.current?.interrupt();
    giftAudio.cancelGesture();
    clearTimer(feedbackTimer);
    setIsHolding(false);
    setFailedAttempt(false);
  };

  const scheduleStage = (event: 'show-letter' | 'reveal-gift', delay: number) => {
    schedulePresentation(() => setStage((current) => transitionRuntimeStage(current, event)), delay);
  };

  const openEnvelope = () => {
    if (stage !== 'unsealed' || isSealReleasing || transitionTimer.current !== null) return;
    setStage((current) => transitionRuntimeStage(current, 'open-envelope'));
    setIsEnvelopeOpening(true);
    schedulePresentation(() => setIsEnvelopeOpening(false), runtimePresentationTiming.envelopeOpen);
  };

  const extractLetter = () => {
    if (stage !== 'opened' || isEnvelopeOpening || isExtracting || transitionTimer.current !== null) return;
    setIsExtracting(true);
    scheduleStage('show-letter', runtimePresentationTiming.cardExtraction);
  };

  const revealGift = () => {
    if (stage !== 'letter' || isRevealing) return;
    setIsRevealing(true);
    schedulePresentation(() => {
      setStage((current) => transitionRuntimeStage(current, hasMemories ? 'show-memories' : 'reveal-gift'));
      setIsRevealing(false);
    }, runtimePresentationTiming.giftReveal);
  };

  const revealGiftFromMemories = () => {
    if (stage !== 'memories' || isMemoryRevealing) return;
    setIsMemoryRevealing(true);
    schedulePresentation(() => {
      setStage((current) => transitionRuntimeStage(current, 'reveal-gift'));
      setIsMemoryRevealing(false);
    }, runtimePresentationTiming.giftReveal);
  };

  const reset = () => {
    clearTimer(feedbackTimer);
    clearTimer(transitionTimer);
    holdController.current?.reset();
    giftAudio.resetReveal();
    setStage((current) => transitionRuntimeStage(current, 'reset'));
    setIsHolding(false);
    setFailedAttempt(false);
    setIsSealReleasing(false);
    setIsEnvelopeOpening(false);
    setIsExtracting(false);
    setIsRevealing(false);
    setIsMemoryRevealing(false);
  };

  if (stage === 'revealed') {
    return (
      <main
        className={`experience ${theme.className} stage-${stage}`}
        data-runtime-phase={getRuntimePhase(stage)}
        aria-busy={isRevealing || isMemoryRevealing}
        style={experienceStyle}
      >
        <GiftBackground hasBackgroundImage={Boolean(gift.backgroundImage)} />
        {shouldShowGiftAudioControl(stage, Boolean(gift.audio)) && (
          <GiftAudioControl status={giftAudio.status} onToggle={giftAudio.togglePlayback} />
        )}
        <GiftReveal gift={gift} onRestart={reset} />
      </main>
    );
  }

  return (
    <main
      className={`experience ${theme.className} stage-${stage}`}
      data-runtime-phase={getRuntimePhase(stage)}
      aria-busy={isSealReleasing || isEnvelopeOpening || isExtracting || isRevealing || isMemoryRevealing}
      style={experienceStyle}
    >
      <GiftBackground hasBackgroundImage={Boolean(gift.backgroundImage)} />
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="experience-grain" aria-hidden="true" />
      <div className="experience-halo" aria-hidden="true" />

      <div className="experience-frame">
        <header className={`experience-heading ${isExtracting ? 'is-extracting' : ''}`}>
          {stage !== 'letter' && stage !== 'memories' && <><p>{introEyebrow}</p><h1>{introTitle}</h1></>}
          <span>{recipientLine}</span>
        </header>

        {stage !== 'letter' && stage !== 'memories' ? (
          <section className="envelope-zone">
            <Envelope
              recipientName={recipientName}
              state={envelopeState}
              isShaking={failedAttempt}
              isInteracting={isHolding}
              isOpening={isEnvelopeOpening}
              seal={stage === 'sealed' || stage === 'unsealed' ? (
                <WaxSeal
                  progress={stage === 'unsealed' ? 1 : progress}
                  status={stage === 'unsealed' ? 'released' : isHolding ? 'holding' : 'idle'}
                  onStart={startHold}
                  onRelease={releaseHold}
                  onCancel={cancelHold}
                  onInterrupt={interruptHold}
                />
              ) : undefined}
            />

            <div className={`interaction-copy ${isExtracting ? 'is-extracting' : ''}`} aria-live="polite">
              {stage === 'sealed' && <>
                <strong>{sealHint}</strong>
                <div
                  className={`hold-progress ${isHolding ? 'is-active' : ''}`}
                  role="progressbar"
                  aria-live="off"
                  aria-label="Progreso para abrir el sello"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress * 100)}
                >
                  <span style={{ '--hold-progress': progress } as CSSProperties} />
                </div>
                <span>{failedAttempt ? 'Casi… no lo sueltes todavía.' : isHolding ? 'Sigue presionando…' : 'El sello necesita una presión continua y tranquila.'}</span>
              </>}
              {stage === 'unsealed' && <><strong>{isSealReleasing ? 'El sello se está soltando.' : 'El sello cedió.'}</strong><button onClick={openEnvelope} disabled={isSealReleasing}>{isSealReleasing ? 'Un instante…' : 'Abrir el sobre'}</button></>}
              {stage === 'opened' && <><strong>{isEnvelopeOpening ? 'El sobre se está abriendo.' : 'Ahora sí.'}</strong><button onClick={extractLetter} disabled={isEnvelopeOpening || isExtracting}>{isEnvelopeOpening ? 'Abriendo el sobre…' : isExtracting ? 'Sacando la carta…' : 'Sacar la carta'}</button></>}
            </div>
          </section>
        ) : (
          stage === 'letter' ? (
            <section className="letter-stage">
              <Letter
                title={letterTitle}
                message={gift.letter.message}
                senderName={senderName}
                isRevealing={isRevealing}
                onReveal={revealGift}
                revealLabel={hasMemories ? 'Ver nuestros recuerdos' : undefined}
              />
            </section>
          ) : (
            <Memories memories={gift.memories!} isRevealing={isMemoryRevealing} onReveal={revealGiftFromMemories} />
          )
        )}
      </div>
    </main>
  );
}
