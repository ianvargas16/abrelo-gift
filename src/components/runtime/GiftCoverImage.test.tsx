import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GiftCoverImage, getGiftCoverImageUrl } from './GiftCoverImage';

const giftPath = `/g/${'A'.repeat(22)}`;

describe('recipient gift cover image', () => {
  it('uses only the Worker-owned cover route for published gifts', () => {
    expect(getGiftCoverImageUrl(true, giftPath)).toBe(`${giftPath}/cover`);
    expect(getGiftCoverImageUrl(true, `${giftPath}/`)).toBe(`${giftPath}/cover`);
    expect(getGiftCoverImageUrl(true, '/creator')).toBeNull();
  });

  it('renders the cover when configured and performs no image request for legacy gifts', () => {
    const configured = renderToStaticMarkup(<GiftCoverImage hasCoverImage pathname={giftPath} />);
    const legacy = renderToStaticMarkup(<GiftCoverImage hasCoverImage={false} pathname={giftPath} />);

    expect(configured).toContain(`src="${giftPath}/cover"`);
    expect(configured).toContain('alt="Imagen de portada del regalo"');
    expect(legacy).toBe('');
  });
});
