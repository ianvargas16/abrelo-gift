import { useEffect, useRef, useState } from 'react';

export function useGiftAudio(hasAudio: boolean) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  useEffect(() => () => { audio.current?.pause(); audio.current = null; }, []);
  const activate = () => {
    if (!hasAudio || audio.current) return;
    const source = new Audio(`${window.location.pathname.replace(/\/$/u, '')}/audio`);
    source.loop = true;
    source.preload = 'none';
    audio.current = source;
    void source.play().then(() => setIsActive(true)).catch(() => { audio.current = null; });
  };
  const toggleMuted = () => {
    if (!audio.current) return;
    const muted = !audio.current.muted;
    audio.current.muted = muted;
    setIsMuted(muted);
  };
  return { activate, isActive, isMuted, toggleMuted };
}
