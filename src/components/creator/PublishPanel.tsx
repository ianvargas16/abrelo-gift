import { useEffect, useRef, useState } from 'react';
import type { GiftConfig } from '../../models/giftConfig';
import {
  createCreatorPublication,
  hasUnpublishedChanges as checkUnpublishedChanges,
  type CreatorPublication,
} from '../../publishing/creatorPublication';
import { publishGift } from '../../publishing/publishGift';
import {
  copyPublishedGiftUrl,
  createPublishedGiftQrDataUrl,
  isWebShareAvailable,
  sharePublishedGift,
} from '../../publishing/sharePublishedGift';

interface PublishPanelProps {
  gift: GiftConfig;
  publication: CreatorPublication | null;
  onPublicationChange: (publication: CreatorPublication) => void;
}

export function PublishPanel({ gift, publication, onPublicationChange }: PublishPanelProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'manual'>('idle');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const publishingLock = useRef(false);
  const hasUnpublishedChanges = checkUnpublishedChanges(publication, gift);

  useEffect(() => {
    if (copyStatus === 'idle') {
      return undefined;
    }

    const timeout = window.setTimeout(() => setCopyStatus('idle'), 2200);
    return () => window.clearTimeout(timeout);
  }, [copyStatus]);

  useEffect(() => {
    let cancelled = false;
    setQrDataUrl('');

    if (!publication) {
      return undefined;
    }

    createPublishedGiftQrDataUrl(publication.gift.url)
      .then((dataUrl) => {
        if (!cancelled) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [publication]);

  const handlePublish = async () => {
    if (publishingLock.current) {
      return;
    }

    publishingLock.current = true;
    setIsPublishing(true);
    setError('');
    setCopyStatus('idle');

    try {
      const publishedGift = await publishGift(gift);
      onPublicationChange(createCreatorPublication(publishedGift, gift));
    } catch {
      setError('No pudimos publicar el regalo. Inténtalo de nuevo.');
    } finally {
      publishingLock.current = false;
      setIsPublishing(false);
    }
  };

  const handleCopy = async () => {
    if (!publication) {
      return;
    }

    const copied = await copyPublishedGiftUrl(publication.gift.url);
    setCopyStatus(copied ? 'copied' : 'manual');
  };

  const handleShare = async () => {
    if (!publication) {
      return;
    }

    try {
      await sharePublishedGift(publication.gift.url);
    } catch {
      // Dismissing the native share sheet is not an application error.
    }
  };

  return (
    <section className="studio-publish-panel" aria-labelledby="publish-title">
      <div className="publish-intro">
        <p className="section-kicker">Entrega</p>
        <h2 id="publish-title">Convierte este borrador en un enlace único para compartir.</h2>
        <p>Cada publicación guarda una versión independiente. Tus próximos cambios no alterarán un enlace ya compartido.</p>
      </div>

      <div className="publish-flow">
        {publication && (
          <div className="publish-result" aria-live="polite">
            <div className="publish-result-copy">
              <span className="publish-success-mark" aria-hidden="true">✦</span>
              <div>
                <p className="section-kicker">Tu regalo está listo</p>
                <a href={publication.gift.url} target="_blank" rel="noreferrer">
                  {publication.gift.url}
                </a>
              </div>
            </div>

            {hasUnpublishedChanges && (
              <p className="publish-snapshot-note">
                Este enlace conserva la versión publicada. Publica otra vez para compartir tus cambios.
              </p>
            )}

            <div className="publish-share-row">
              <button type="button" className="ghost-button" onClick={handleCopy}>
                {copyStatus === 'copied' ? 'Enlace copiado' : 'Copiar enlace'}
              </button>
              {isWebShareAvailable() && (
                <button type="button" className="ghost-button" onClick={handleShare}>Compartir</button>
              )}
              <span className="publish-copy-status" aria-live="polite">
                {copyStatus === 'manual' ? 'Selecciona el enlace y cópialo manualmente.' : ''}
              </span>
            </div>

            {qrDataUrl && (
              <div className="publish-qr">
                <img src={qrDataUrl} alt="Código QR del enlace publicado" width="160" height="160" />
                <span>Escanea para abrir el regalo</span>
              </div>
            )}
          </div>
        )}

        {error && <p className="publish-error" role="alert">{error}</p>}

        <button
          type="button"
          className="primary-button publish-button"
          onClick={handlePublish}
          disabled={isPublishing}
        >
          {isPublishing
            ? 'Publicando…'
            : publication
              ? hasUnpublishedChanges ? 'Publicar cambios' : 'Publicar otra versión'
              : 'Publicar regalo'}
        </button>
      </div>
    </section>
  );
}
