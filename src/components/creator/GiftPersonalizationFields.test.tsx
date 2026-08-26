import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { defaultGift } from '../../config/defaultGift';
import { MAX_GIFT_MESSAGE_CHARACTERS, MAX_GIFT_TITLE_CHARACTERS } from '../../models/giftConfig';
import { GiftPersonalizationFields } from './GiftPersonalizationFields';

describe('GiftPersonalizationFields', () => {
  it('edits the canonical GiftConfig title, message, and theme values without parallel state', () => {
    const gift = {
      ...defaultGift,
      theme: 'sage' as const,
      intro: { ...defaultGift.intro, title: 'Un detalle solo para ti' },
      letter: { ...defaultGift.letter, message: 'Una línea.\nOtra línea.' },
    };
    const markup = renderToStaticMarkup(
      <GiftPersonalizationFields
        gift={gift}
        onTitleChange={vi.fn()}
        onMessageChange={vi.fn()}
        onThemeChange={vi.fn()}
        onValidityChange={vi.fn()}
      />,
    );

    expect(markup).toContain('Título principal');
    expect(markup).toContain('value="Un detalle solo para ti"');
    expect(markup).toContain('Una línea.\nOtra línea.');
    expect(markup).toContain(`/${MAX_GIFT_TITLE_CHARACTERS}`);
    expect(markup).toContain(`/${MAX_GIFT_MESSAGE_CHARACTERS}`);
    expect(markup).toContain('Salvia');
    expect(markup).toContain('aria-pressed="true"');
  });

  it('shows accessible validation feedback for oversized canonical values', () => {
    const invalidGift = {
      ...defaultGift,
      intro: { ...defaultGift.intro, title: 'T'.repeat(MAX_GIFT_TITLE_CHARACTERS + 1) },
      letter: { ...defaultGift.letter, message: 'M'.repeat(MAX_GIFT_MESSAGE_CHARACTERS + 1) },
    };
    const markup = renderToStaticMarkup(
      <GiftPersonalizationFields
        gift={invalidGift}
        onTitleChange={vi.fn()}
        onMessageChange={vi.fn()}
        onThemeChange={vi.fn()}
        onValidityChange={vi.fn()}
      />,
    );

    expect(markup).toContain(`El título puede tener hasta ${MAX_GIFT_TITLE_CHARACTERS} caracteres.`);
    expect(markup).toContain(`El mensaje puede tener hasta ${MAX_GIFT_MESSAGE_CHARACTERS} caracteres.`);
    expect(markup.match(/aria-invalid="true"/g)).toHaveLength(2);
  });
});
