import celebrationTrack from '../../assets/audio/celebration-atmosphere.mp3';
import romanticTrack from '../../assets/audio/romantic-atmosphere.mp3';
import softTrack from '../../assets/audio/soft-atmosphere.mp3';
import type { GiftAtmosphere } from '../../models/giftAtmosphere';

const atmosphereTracks: Record<GiftAtmosphere, string> = {
  soft: softTrack,
  celebration: celebrationTrack,
  romantic: romanticTrack,
};

const ACTIVE_VOLUME = 0.38;
const FADE_IN_MS = 900;
const FADE_OUT_MS = 180;

type AtmosphereAudio = Pick<HTMLAudioElement, 'currentTime' | 'loop' | 'pause' | 'play' | 'preload' | 'volume'>;

interface AnimationScheduler {
  now: () => number;
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (frame: number) => void;
}

const browserScheduler: AnimationScheduler = {
  now: () => performance.now(),
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (frame) => cancelAnimationFrame(frame),
};

export function getAtmosphereTrack(atmosphere: GiftAtmosphere): string {
  return atmosphereTracks[atmosphere];
}

export interface AtmospherePlayer {
  start: () => Promise<void>;
  setMuted: (muted: boolean) => void;
  dispose: () => void;
}

export function createAtmospherePlayer(
  atmosphere: GiftAtmosphere,
  createAudio: (source: string) => AtmosphereAudio = (source) => new Audio(source),
  scheduler: AnimationScheduler = browserScheduler,
): AtmospherePlayer {
  let audio: AtmosphereAudio | null = null;
  let muted = false;
  let fadeFrame: number | null = null;

  const cancelFade = () => {
    if (fadeFrame !== null) scheduler.cancelFrame(fadeFrame);
    fadeFrame = null;
  };

  const fadeTo = (targetVolume: number, duration: number, onComplete?: () => void) => {
    if (!audio) return;
    cancelFade();

    const startVolume = audio.volume;
    const startedAt = scheduler.now();
    const tick = (timestamp: number) => {
      if (!audio) return;
      const progress = Math.min(1, Math.max(0, (timestamp - startedAt) / duration));
      audio.volume = startVolume + ((targetVolume - startVolume) * progress);

      if (progress < 1) {
        fadeFrame = scheduler.requestFrame(tick);
        return;
      }

      fadeFrame = null;
      onComplete?.();
    };

    fadeFrame = scheduler.requestFrame(tick);
  };

  const prepareAudio = () => {
    if (audio) return audio;
    audio = createAudio(getAtmosphereTrack(atmosphere));
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
    return audio;
  };

  return {
    async start() {
      const activeAudio = prepareAudio();
      await activeAudio.play();
      fadeTo(muted ? 0 : ACTIVE_VOLUME, FADE_IN_MS, muted ? () => activeAudio.pause() : undefined);
    },
    setMuted(nextMuted) {
      muted = nextMuted;
      if (!audio) return;

      if (muted) {
        fadeTo(0, FADE_OUT_MS, () => audio?.pause());
        return;
      }

      void audio.play().then(() => fadeTo(ACTIVE_VOLUME, FADE_IN_MS)).catch(() => undefined);
    },
    dispose() {
      cancelFade();
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      audio = null;
    },
  };
}
