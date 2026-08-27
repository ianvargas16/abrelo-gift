import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { defaultGift } from '../config/defaultGift';
import { resolveTheme } from '../themes/themeRegistry';
import { PreviewView } from './PreviewView';

describe('Creator full experience preview', () => {
  it('uses the canonical GiftConfig and pending background in the recipient presentation', () => {
    const gift = {
      ...defaultGift,
      theme: 'midnight' as const,
      intro: { ...defaultGift.intro, title: 'Una noche solo para ti' },
      letter: { ...defaultGift.letter, message: 'Una historia\ncon dos líneas.' },
    };
    const theme = resolveTheme(gift.theme);
    const markup = renderToStaticMarkup(
      <PreviewView
        gift={gift}
        backgroundImagePreviewUrl="blob:full-preview-background"
        onBackToCreator={vi.fn()}
      />,
    );

    expect(markup).toContain('Vista previa');
    expect(markup).toContain('Una noche solo para ti');
    expect(markup).toContain(theme.className);
    expect(markup).toContain(`--color-page:${theme.tokens.page}`);
    expect(markup).toContain('class="gift-background"');
    expect(markup).toContain('src="blob:full-preview-background"');
    expect(markup).toContain('data-runtime-phase="closed"');
  });
});
