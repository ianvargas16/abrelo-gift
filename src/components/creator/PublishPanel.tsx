import { useEffect, useRef, useState } from 'react';
import { hasGiftPersonalizationErrors, type GiftConfig } from '../../models/giftConfig';
import {
  createCreatorPublication,
  hasUnpublishedChanges as checkUnpublishedChanges,
  type CreatorPublication,
} from '../../publishing/creatorPublication';
import { publishGift } from '../../publishing/publishGift';
import {
  copyPublishedGiftUrl,
  createPublishedGiftQrDataUrl,
  getPublishedGiftShareMessage,
  sharePublishedGift,
} from '../../publishing/sharePublishedGift';
import { PublishedGiftSharePanel } from './PublishedGiftSharePanel';

interface PublishPanelProps {
  gift: GiftConfig;
  publication: CreatorPublication | null;
  onPublicationChange: (publication: CreatorPublication) => void;
  audioFile?: File | null;
  backgroundImageFile?: File | null;
  memoryImageFiles?: Record<string, File>;
  hasPersonalizationDraftError?: boolean;
}

export function PublishPanel({ gift, publication, onPublicationChange, audioFile, backgroundImageFile, memoryImageFiles, hasPersonalizationDraftError = false }: PublishPanelProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'manual'>('idle');
  const [shareStatus, setShareStatus] = useState<'idle' | 'shared' | 'fallback'>('idle');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const publishingLock = useRef(false);
  const hasUnpublishedChanges = checkUnpublishedChanges(publication, gift);
  const hasInvalidPersonalization = hasPersonalizationDraftError || hasGiftPersonalizationErrors(gift);

  useEffect(() => {
    if (copyStatus === 'idle') {
      return undefined;
    }

    const timeout = window.setTimeout(() => setCopyStatus('idle'), 2200);
    return () => window.clearTimeout(timeout);
  }, [copyStatus]);

  useEffect(() => {
    if (shareStatus === 'idle') {
      return undefined;
    }

    const timeout = window.setTimeout(() => setShareStatus('idle'), 2600);
    return () => window.clearTimeout(timeout);
  }, [shareStatus]);

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
    if (publishingLock.current || hasInvalidPersonalization) {
      if (hasInvalidPersonalization) {
        setError('Revisa el título y el mensaje antes de publicar.');
      }
      return;
    }

    publishingLock.current = true;
    setIsPublishing(true);
    setError('');
    setCopyStatus('idle');

    try {
      const publishedGift = await publishGift(gift, { audioFile, backgroundImageFile, memoryImageFiles });
      onPublicationChange(createCreatorPublication(publishedGift, gift, publication?.shareMessage));
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
      const shared = await sharePublishedGift(publication.gift.url, publication.shareMessage, undefined, gift.intro.title);

      if (shared) {
        setShareStatus('shared');
        return;
      }

      await handleCopy();
      setShareStatus('fallback');
    } catch {
      // Dismissing the native share sheet is not an application error.
    }
  };

  const handleShareMessageChange = (shareMessage: string) => {
    if (!publication) {
      return;
    }

    onPublicationChange({ ...publication, shareMessage });
  };

  const statusMessage = copyStatus === 'manual'
    ? 'Selecciona el enlace y cópialo manualmente.'
    : shareStatus === 'shared'
      ? 'Listo para compartir.'
      : shareStatus === 'fallback'
        ? 'Tu dispositivo no permite compartir aquí. Copiamos el enlace.'
        : '';

  return (
    <section className="studio-publish-panel" aria-labelledby="publish-title">
      <div className="publish-intro">
        <p className="section-kicker">Entrega</p>
        <h2 id="publish-title">Cuando esté listo, entrégalo como una sorpresa.</h2>
        <p>Cada enlace conserva esta versión del regalo. Tus próximos cambios no alterarán lo que ya compartiste.</p>
      </div>

      <div className="publish-flow">
        {publication && (
          <PublishedGiftSharePanel
            publication={publication}
            qrDataUrl={qrDataUrl}
            hasUnpublishedChanges={hasUnpublishedChanges}
            copyLabel={copyStatus === 'copied' ? 'Enlace copiado' : 'Copiar enlace'}
            statusMessage={statusMessage}
            onCopy={handleCopy}
            onShare={handleShare}
            onShareMessageChange={handleShareMessageChange}
            shareMessagePlaceholder={getPublishedGiftShareMessage()}
          />
        )}

        {hasInvalidPersonalization && (
          <p className="publish-error" role="alert">Revisa el título y el mensaje antes de publicar.</p>
        )}
        {!hasInvalidPersonalization && error && <p className="publish-error" role="alert">{error}</p>}

        <button
          type="button"
          className="primary-button publish-button"
          onClick={handlePublish}
          disabled={isPublishing || hasInvalidPersonalization}
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
