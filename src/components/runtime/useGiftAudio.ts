import { useEffect, useRef, useState } from 'react';

export type GiftAudioStatus = 'idle' | 'ready' | 'loading' | 'playing' | 'paused' | 'error';

export function getGiftAudioUrl(hasAudio: boolean, pathname: string): string | null {
  return hasAudio ? `${pathname.replace(/\/$/u, '')}/audio` : null;
}

export function useGiftAudio(hasAudio: boolean) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const removeListeners = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<GiftAudioStatus>(hasAudio ? 'ready' : 'idle');

  useEffect(() => () => {
    removeListeners.current?.();
    audio.current?.pause();
    audio.current = null;
  }, []);

  const play = (source: HTMLAudioElement) => {
    setStatus('loading');
    void source.play().catch(() => setStatus('ready'));
  };

  const activate = () => {
    if (!hasAudio) return;
    if (audio.current) {
      if (audio.current.paused) play(audio.current);
      return;
    }

    const source = new Audio();
    source.loop = true;
    source.preload = 'none';
    source.src = getGiftAudioUrl(true, window.location.pathname)!;

    const onLoadStart = () => setStatus('loading');
    const onCanPlay = () => {
      if (source.paused) setStatus('ready');
    };
    const onPlay = () => setStatus('playing');
    const onPause = () => setStatus('paused');
    const onError = () => setStatus('error');
    source.addEventListener('loadstart', onLoadStart);
    source.addEventListener('canplay', onCanPlay);
    source.addEventListener('play', onPlay);
    source.addEventListener('pause', onPause);
    source.addEventListener('error', onError);
    removeListeners.current = () => {
      source.removeEventListener('loadstart', onLoadStart);
      source.removeEventListener('canplay', onCanPlay);
      source.removeEventListener('play', onPlay);
      source.removeEventListener('pause', onPause);
      source.removeEventListener('error', onError);
    };
    audio.current = source;
    play(source);
  };

  const togglePlayback = () => {
    if (!audio.current) {
      activate();
      return;
    }

    if (audio.current.paused) play(audio.current);
    else audio.current.pause();
  };

  return { activate, status, togglePlayback };
}
