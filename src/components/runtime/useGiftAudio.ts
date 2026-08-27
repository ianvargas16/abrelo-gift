import { useEffect, useRef, useState } from 'react';

export type GiftAudioStatus = 'idle' | 'ready' | 'loading' | 'playing' | 'paused' | 'error';

interface GiftAudioSource {
  loop: boolean;
  preload: string;
  src: string;
  paused: boolean;
  muted: boolean;
  volume: number;
  currentTime: number;
  play: () => Promise<void>;
  pause: () => void;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

interface GiftAudioControllerOptions {
  hasAudio: boolean;
  pathname: string;
  createAudio: () => GiftAudioSource;
  onStatus: (status: GiftAudioStatus) => void;
}

export interface GiftAudioController {
  beginGesture: () => void;
  completeReveal: () => void;
  cancelGesture: () => void;
  resetReveal: () => void;
  togglePlayback: () => void;
  dispose: () => void;
}

export function getGiftAudioUrl(hasAudio: boolean, pathname: string): string | null {
  return hasAudio ? `${pathname.replace(/\/$/u, '')}/audio` : null;
}

export function createGiftAudioController({
  hasAudio,
  pathname,
  createAudio,
  onStatus,
}: GiftAudioControllerOptions): GiftAudioController {
  let source: GiftAudioSource | null = null;
  let isAudible = false;
  let removeListeners: (() => void) | null = null;

  const play = (audio: GiftAudioSource) => {
    onStatus('loading');
    void audio.play().catch(() => onStatus(isAudible ? 'error' : 'ready'));
  };

  const ensureSource = () => {
    if (!hasAudio) return null;
    if (source) return source;

    const nextSource = createAudio();
    nextSource.loop = true;
    nextSource.preload = 'none';
    nextSource.src = getGiftAudioUrl(true, pathname)!;

    const onLoadStart = () => onStatus('loading');
    const onCanPlay = () => {
      if (nextSource.paused) onStatus('ready');
    };
    const onPlay = () => onStatus(isAudible ? 'playing' : 'loading');
    const onPause = () => onStatus(isAudible ? 'paused' : 'ready');
    const onError = () => onStatus('error');
    nextSource.addEventListener('loadstart', onLoadStart);
    nextSource.addEventListener('canplay', onCanPlay);
    nextSource.addEventListener('play', onPlay);
    nextSource.addEventListener('pause', onPause);
    nextSource.addEventListener('error', onError);
    removeListeners = () => {
      nextSource.removeEventListener('loadstart', onLoadStart);
      nextSource.removeEventListener('canplay', onCanPlay);
      nextSource.removeEventListener('play', onPlay);
      nextSource.removeEventListener('pause', onPause);
      nextSource.removeEventListener('error', onError);
    };
    source = nextSource;
    return source;
  };

  return {
    beginGesture() {
      const audio = ensureSource();
      if (!audio || !audio.paused) return;
      isAudible = false;
      audio.muted = true;
      audio.volume = 0;
      play(audio);
    },
    completeReveal() {
      const audio = ensureSource();
      if (!audio) return;
      isAudible = true;
      audio.muted = false;
      audio.volume = 1;
      if (audio.paused) play(audio);
      else onStatus('playing');
    },
    cancelGesture() {
      if (!source || isAudible) return;
      source.pause();
      source.currentTime = 0;
      source.muted = false;
      source.volume = 1;
      onStatus('ready');
    },
    resetReveal() {
      if (!source) return;
      isAudible = false;
      source.pause();
      source.currentTime = 0;
      source.muted = false;
      source.volume = 1;
      onStatus('ready');
    },
    togglePlayback() {
      const audio = ensureSource();
      if (!audio) return;
      isAudible = true;
      audio.muted = false;
      audio.volume = 1;
      if (audio.paused) play(audio);
      else audio.pause();
    },
    dispose() {
      removeListeners?.();
      source?.pause();
      source = null;
      removeListeners = null;
    },
  };
}

export function useGiftAudio(hasAudio: boolean) {
  const [status, setStatus] = useState<GiftAudioStatus>(hasAudio ? 'ready' : 'idle');
  const controller = useRef<GiftAudioController | null>(null);

  if (!controller.current) {
    controller.current = createGiftAudioController({
      hasAudio,
      pathname: typeof window === 'undefined' ? '/' : window.location.pathname,
      createAudio: () => new Audio(),
      onStatus: setStatus,
    });
  }

  useEffect(() => () => controller.current?.dispose(), []);

  return {
    beginGesture: () => controller.current?.beginGesture(),
    completeReveal: () => controller.current?.completeReveal(),
    cancelGesture: () => controller.current?.cancelGesture(),
    resetReveal: () => controller.current?.resetReveal(),
    status,
    togglePlayback: () => controller.current?.togglePlayback(),
  };
}
