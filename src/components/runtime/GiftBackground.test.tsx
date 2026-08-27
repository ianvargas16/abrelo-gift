import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GiftBackground, getGiftBackgroundImageUrl } from './GiftBackground';

const giftPath = `/g/${'A'.repeat(22)}`;

describe('recipient gift background', () => {
  it('uses the compatible Worker asset route only for a public gift', () => {
    expect(getGiftBackgroundImageUrl(true, giftPath)).toBe(`${giftPath}/cover`);
    expect(getGiftBackgroundImageUrl(true, `${giftPath}/`)).toBe(`${giftPath}/cover`);
    expect(getGiftBackgroundImageUrl(true, '/creator')).toBeNull();
  });

  it('renders a lowest-layer background and readability overlay only when configured', () => {
    const configured = renderToStaticMarkup(<GiftBackground hasBackgroundImage pathname={giftPath} />);
    const legacy = renderToStaticMarkup(<GiftBackground hasBackgroundImage={false} pathname={giftPath} />);

    expect(configured).toContain('class="gift-background"');
    expect(configured).toContain('class="gift-background-overlay"');
    expect(configured).toContain(`src="${giftPath}/cover"`);
    expect(legacy).toBe('');
  });
});
