import type { CreatorPublication } from '../../publishing/creatorPublication';

interface PublishedGiftSharePanelProps {
  publication: CreatorPublication;
  qrDataUrl: string;
  hasUnpublishedChanges: boolean;
  copyLabel: string;
  statusMessage: string;
  onCopy: () => void;
  onShare: () => void;
  onShareMessageChange: (message: string) => void;
  shareMessagePlaceholder: string;
}

export function PublishedGiftSharePanel({
  publication,
  qrDataUrl,
  hasUnpublishedChanges,
  copyLabel,
  statusMessage,
  onCopy,
  onShare,
  onShareMessageChange,
  shareMessagePlaceholder,
}: PublishedGiftSharePanelProps) {
  return (
    <article className="gift-share-panel" aria-labelledby="gift-share-title">
      <header className="gift-share-header">
        <span className="publish-success-mark" aria-hidden="true">✦</span>
        <div>
          <p className="section-kicker">Publicado</p>
          <h3 id="gift-share-title">Tu regalo está listo para encontrar a su persona.</h3>
          <p>Compártelo por mensaje o deja que lo descubran escaneando el código.</p>
        </div>
      </header>

      {hasUnpublishedChanges && (
        <p className="publish-snapshot-note">
          Este enlace conserva la versión publicada. Publica otra vez para compartir tus cambios.
        </p>
      )}

      <div className="gift-share-body">
        <div className="gift-share-details">
          <span className="gift-share-label">Enlace del regalo</span>
          <a className="publish-link" href={publication.gift.url} target="_blank" rel="noreferrer">
            {publication.gift.url}
          </a>

          <div className="publish-share-row">
            <button type="button" className="primary-button" onClick={onShare}>Compartir</button>
            <button type="button" className="ghost-button" onClick={onCopy}>{copyLabel}</button>
          </div>

          <span className="publish-copy-status" aria-live="polite">{statusMessage}</span>
        </div>

        <figure className="publish-qr">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Código QR del enlace publicado" width="180" height="180" />
          ) : (
            <span className="publish-qr-placeholder" role="status">Preparando QR…</span>
          )}
          <figcaption>Escanea para abrir el regalo</figcaption>
          {qrDataUrl && (
            <a className="gift-share-download" href={qrDataUrl} download="abrelo-regalo-qr.png">
              Guardar código QR
            </a>
          )}
        </figure>
      </div>

      <a className="ghost-button publish-recipient-preview" href={publication.gift.url} target="_blank" rel="noreferrer">
        Ver regalo como destinatario
      </a>

      <label className="field publish-message-field">
        <span>Mensaje para acompañar el enlace</span>
        <textarea
          value={publication.shareMessage ?? ''}
          placeholder={shareMessagePlaceholder}
          onChange={(event) => onShareMessageChange(event.target.value)}
          rows={3}
        />
        <small>Este mensaje sólo vive en tu estudio y acompaña la acción de compartir.</small>
      </label>
    </article>
  );
}
