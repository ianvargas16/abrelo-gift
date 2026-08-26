import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { defaultGift } from '../../config/defaultGift';
import { MAX_GIFT_TITLE_CHARACTERS } from '../../models/giftConfig';
import { PublishPanel } from './PublishPanel';

describe('PublishPanel personalization guard', () => {
  it('prevents publication when canonical personalization exceeds its limit', () => {
    const invalidGift = {
      ...defaultGift,
      intro: { ...defaultGift.intro, title: 'T'.repeat(MAX_GIFT_TITLE_CHARACTERS + 1) },
    };
    const markup = renderToStaticMarkup(
      <PublishPanel gift={invalidGift} publication={null} onPublicationChange={vi.fn()} />,
    );

    expect(markup).toContain('Revisa el título y el mensaje antes de publicar.');
    expect(markup).toContain('disabled=""');
  });

  it('blocks publication while an oversized local draft is being corrected', () => {
    const markup = renderToStaticMarkup(
      <PublishPanel
        gift={defaultGift}
        publication={null}
        onPublicationChange={vi.fn()}
        hasPersonalizationDraftError
      />,
    );

    expect(markup).toContain('Revisa el título y el mensaje antes de publicar.');
    expect(markup).toContain('disabled=""');
  });
});
