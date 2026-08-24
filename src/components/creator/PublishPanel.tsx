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
  getPublishedGiftShareMessage,
  sharePublishedGift,
} from '../../publishing/sharePublishedGift';

interface PublishPanelProps {
  gift: GiftConfig;
  publication: CreatorPublication | null;
  onPublicationChange: (publication: CreatorPublication) => void;
  audioFile?: File | null;
}

export function PublishPanel({ gift, publication, onPublicationChange, audioFile }: PublishPanelProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'manual'>('idle');
  const [shareStatus, setShareStatus] = useState<'idle' | 'shared' | 'fallback'>('idle');
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
    if (publishingLock.current) {
      return;
    }

    publishingLock.current = true;
    setIsPublishing(true);
    setError('');
    setCopyStatus('idle');

    try {
      const publishedGift = await publishGift(gift, { audioFile });
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
      const shared = await sharePublishedGift(publication.gift.url, publication.shareMessage);

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

  return (
    <section className="studio-publish-panel" aria-labelledby="publish-title">
      <div className="publish-intro">
        <p className="section-kicker">Entrega</p>
        <h2 id="publish-title">Cuando esté listo, entrégalo como una sorpresa.</h2>
        <p>Cada enlace conserva esta versión del regalo. Tus próximos cambios no alterarán lo que ya compartiste.</p>
      </div>

      <div className="publish-flow">
        {publication && (
          <div className="publish-result" aria-live="polite">
            <div className="publish-result-copy">
              <span className="publish-success-mark" aria-hidden="true">✦</span>
              <div>
                <p className="section-kicker">Publicado</p>
                <h3>Tu sorpresa está lista para salir.</h3>
                <a className="publish-link" href={publication.gift.url} target="_blank" rel="noreferrer">
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
              <button type="button" className="ghost-button" onClick={handleShare}>Compartir sorpresa</button>
              <a className="ghost-button publish-recipient-preview" href={publication.gift.url} target="_blank" rel="noreferrer">
                Ver como destinatario
              </a>
              <span className="publish-copy-status" aria-live="polite">
                {copyStatus === 'manual' ? 'Selecciona el enlace y cópialo manualmente.' : ''}
                {shareStatus === 'shared' ? 'Listo para compartir.' : ''}
                {shareStatus === 'fallback' ? 'Tu dispositivo no permite compartir aquí. Copiamos el enlace.' : ''}
              </span>
            </div>

            <label className="field publish-message-field">
              <span>Mensaje para acompañar el enlace</span>
              <textarea
                value={publication.shareMessage ?? ''}
                placeholder={getPublishedGiftShareMessage()}
                onChange={(event) => handleShareMessageChange(event.target.value)}
                rows={3}
              />
              <small>Solo se usa al compartir desde este estudio.</small>
            </label>

            {qrDataUrl && (
              <div className="publish-qr">
                <img src={qrDataUrl} alt="Código QR del enlace publicado" width="160" height="160" />
                <div>
                  <span>Escanea para abrir el regalo</span>
                  <div className="publish-qr-actions">
                    <a className="ghost-button" href={qrDataUrl} download="abrelo-regalo-qr.png">Guardar QR</a>
                    <button type="button" className="ghost-button" onClick={handleCopy}>Copiar enlace del QR</button>
                  </div>
                </div>
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
