import { useEffect, useRef, useState } from 'react';
import type { GiftAtmosphere } from '../../models/giftAtmosphere';
import { createAtmospherePlayer, type AtmospherePlayer } from './atmospherePlayer';

export function useGiftAtmosphere(atmosphere?: GiftAtmosphere) {
  const player = useRef<AtmospherePlayer | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    setIsActive(false);
    setIsMuted(false);

    return () => {
      player.current?.dispose();
      player.current = null;
    };
  }, [atmosphere]);

  const activate = () => {
    if (!atmosphere) return;

    player.current ??= createAtmospherePlayer(atmosphere);
    void player.current.start()
      .then(() => setIsActive(true))
      .catch(() => {
        player.current?.dispose();
        player.current = null;
      });
  };

  const toggleMuted = () => {
    if (!player.current || !isActive) return;
    const nextMuted = !isMuted;
    player.current.setMuted(nextMuted);
    setIsMuted(nextMuted);
  };

  return { activate, isActive, isMuted, toggleMuted };
}
