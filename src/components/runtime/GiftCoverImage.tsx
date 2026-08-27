import { useState } from 'react';

export function getGiftCoverImageUrl(hasCoverImage: boolean, pathname: string): string | null {
  if (!hasCoverImage || !/^\/g\/[A-Za-z0-9_-]{22}\/?$/u.test(pathname)) {
    return null;
  }

  return `${pathname.replace(/\/$/u, '')}/cover`;
}

interface GiftCoverImageProps {
  hasCoverImage: boolean;
  pathname?: string;
}

export function GiftCoverImage({
  hasCoverImage,
  pathname = typeof window === 'undefined' ? '' : window.location.pathname,
}: GiftCoverImageProps) {
  const [hasFailed, setHasFailed] = useState(false);
  const source = getGiftCoverImageUrl(hasCoverImage, pathname);

  if (!source || hasFailed) return null;

  return (
    <div className="gift-cover-image">
      <img
        src={source}
        alt="Imagen de portada del regalo"
        onError={() => setHasFailed(true)}
      />
    </div>
  );
}
