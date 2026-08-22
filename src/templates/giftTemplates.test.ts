import { describe, expect, it } from 'vitest';
import { createGiftFile, parseGiftFile } from '../models/giftConfig';
import { giftTemplates } from './giftTemplates';

describe('giftTemplates', () => {
  it('contains the curated Creator template set', () => {
    expect(giftTemplates.map((template) => template.id)).toEqual([
      'birthday',
      'anniversary',
      'dinner',
      'movie-night',
      'blank',
    ]);
  });

  it('uses optional soundscapes for new guided templates while leaving the blank canvas silent', () => {
    expect(giftTemplates.map((template) => template.createGift().atmosphere)).toEqual([
      'celebration',
      'romantic',
      'soft',
      'soft',
      undefined,
    ]);
  });

  it.each(giftTemplates)('creates a valid GiftConfig for $name', (template) => {
    const gift = template.createGift();

    expect(parseGiftFile(createGiftFile(gift))).toEqual(gift);
  });

  it('returns independent GiftConfig objects for the same template', () => {
    const birthday = giftTemplates.find((template) => template.id === 'birthday')!;
    const projectAGift = birthday.createGift();
    const projectBGift = birthday.createGift();

    projectAGift.recipientName = 'Sofía';
    projectAGift.gift.title = 'Una cena especial';

    expect(projectBGift.recipientName).toBe('');
    expect(projectBGift.gift.title).toBe('Un plan elegido por ti');
  });

  it('keeps the blank canvas valid with editable empty fields', () => {
    const blankCanvas = giftTemplates.find((template) => template.id === 'blank')!;
    const gift = blankCanvas.createGift();

    expect(gift.gift.type).toBe('voucher');
    expect(gift.letter.message).toBe('');
    expect(parseGiftFile(createGiftFile(gift))).toEqual(gift);
  });
});
