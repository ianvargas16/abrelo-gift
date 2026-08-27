import { useState } from 'react';

export function getGiftBackgroundImageUrl(hasBackgroundImage: boolean, pathname: string): string | null {
  if (!hasBackgroundImage || !/^\/g\/[A-Za-z0-9_-]{22}\/?$/u.test(pathname)) {
    return null;
  }

  // Keep the Milestone 28 route so already-published R2 objects remain available.
  return `${pathname.replace(/\/$/u, '')}/cover`;
}

interface GiftBackgroundProps {
  hasBackgroundImage: boolean;
  pathname?: string;
}

export function GiftBackground({
  hasBackgroundImage,
  pathname = typeof window === 'undefined' ? '' : window.location.pathname,
}: GiftBackgroundProps) {
  const [hasFailed, setHasFailed] = useState(false);
  const source = getGiftBackgroundImageUrl(hasBackgroundImage, pathname);

  if (!source || hasFailed) return null;

  return (
    <div className="gift-background" aria-hidden="true">
      <img
        src={source}
        alt=""
        onError={() => setHasFailed(true)}
      />
      <div className="gift-background-overlay" />
    </div>
  );
}
