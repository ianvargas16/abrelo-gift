import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { defaultGift } from '../../config/defaultGift';
import { createCreatorPublication } from '../../publishing/creatorPublication';
import { PublishedGiftSharePanel } from './PublishedGiftSharePanel';

describe('PublishedGiftSharePanel', () => {
  it('presents the published URL, QR, copy, share, and recipient preview actions', () => {
    const publication = createCreatorPublication(
      { id: 'L8k4Pq2xR7mN9vY3sW1aFg', url: 'https://share.example/g/L8k4Pq2xR7mN9vY3sW1aFg' },
      defaultGift,
    );
    const markup = renderToStaticMarkup(
      <PublishedGiftSharePanel
        publication={publication}
        qrDataUrl="data:image/png;base64,qr"
        hasUnpublishedChanges={false}
        copyLabel="Copiar enlace"
        statusMessage=""
        onCopy={vi.fn()}
        onShare={vi.fn()}
        onShareMessageChange={vi.fn()}
        shareMessagePlaceholder="Te preparé una sorpresa."
      />,
    );

    expect(markup).toContain(publication.gift.url);
    expect(markup).toContain('data:image/png;base64,qr');
    expect(markup).toContain('Código QR del enlace publicado');
    expect(markup).toContain('Copiar enlace');
    expect(markup).toContain('Compartir');
    expect(markup).toContain('Ver regalo');
  });

  it('keeps a stable loading surface while the client-side QR is generated', () => {
    const publication = createCreatorPublication(
      { id: 'L8k4Pq2xR7mN9vY3sW1aFg', url: 'https://share.example/g/L8k4Pq2xR7mN9vY3sW1aFg' },
      defaultGift,
    );
    const markup = renderToStaticMarkup(
      <PublishedGiftSharePanel
        publication={publication}
        qrDataUrl=""
        hasUnpublishedChanges
        copyLabel="Enlace copiado"
        statusMessage="Listo para compartir."
        onCopy={vi.fn()}
        onShare={vi.fn()}
        onShareMessageChange={vi.fn()}
        shareMessagePlaceholder="Te preparé una sorpresa."
      />,
    );

    expect(markup).toContain('Preparando QR');
    expect(markup).toContain('Este enlace conserva la versión publicada');
    expect(markup).toContain('Listo para compartir');
  });
});
