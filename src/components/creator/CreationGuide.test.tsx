import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CreationGuide } from './CreationGuide';

describe('CreationGuide', () => {
  it('guides the creator toward the missing personal details', () => {
    const markup = renderToStaticMarkup(
      <CreationGuide hasRecipient={false} hasMessage={false} hasGift={false} isPublished={false} />,
    );

    expect(markup).toContain('0/3');
    expect(markup).toContain('A quién va dirigido');
    expect(markup).toContain('Unas palabras personales');
    expect(markup).toContain('El detalle que vas a regalar');
  });

  it('marks the journey as ready once the gift is complete and published', () => {
    const markup = renderToStaticMarkup(
      <CreationGuide hasRecipient hasMessage hasGift isPublished />,
    );

    expect(markup).toContain('3/3');
    expect(markup).toContain('Ya está en camino');
    expect(markup).toContain('Tu sorpresa ya tiene un lugar al que llegar.');
  });
});
