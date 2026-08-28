import { describe, expect, it } from 'vitest';
import { defaultGift } from '../config/defaultGift';
import { createGiftFile, parseGiftFile } from '../models/giftConfig';
import {
  applyGiftTemplate,
  giftTemplates,
  getGiftTemplate,
  templateWouldChangeGift,
} from './giftTemplates';

describe('giftTemplates', () => {
  it('contains the curated occasion set with complete metadata', () => {
    expect(giftTemplates.map((template) => template.id)).toEqual([
      'birthday',
      'anniversary',
      'thank-you',
      'invitation',
      'motivation',
    ]);

    giftTemplates.forEach((template) => {
      expect(template.name.trim()).not.toBe('');
      expect(template.description.trim()).not.toBe('');
      expect(template.marker.trim()).not.toBe('');
      expect(template.theme).toBe(template.createGift().theme);
    });
  });

  it.each(giftTemplates)('creates a valid GiftConfig for $name', (template) => {
    const gift = template.createGift();
    expect(parseGiftFile(createGiftFile(gift))).toEqual(gift);
  });

  it('returns independent GiftConfig objects for the same template', () => {
    const birthday = getGiftTemplate('birthday');
    const projectAGift = birthday.createGift();
    const projectBGift = birthday.createGift();

    projectAGift.intro.title = 'Un cumpleaños distinto';
    projectAGift.gift.title = 'Una cena especial';

    expect(projectBGift.intro.title).toBe('Hay algo para celebrar');
    expect(projectBGift.gift.title).toBe('Un plan elegido por ti');
  });

  it('applies template copy and theme while preserving people and personal media', () => {
    const currentGift = {
      ...getGiftTemplate('birthday').createGift(),
      recipientName: 'Sofía',
      senderName: 'Jean',
      audio: { mimeType: 'audio/mpeg' as const },
      backgroundImage: { mimeType: 'image/webp' as const, size: 2048 },
      memories: {
        enabled: true,
        title: 'Nuestra historia',
        items: [{ image: 'data:image/png;base64,iVBORw0KGgo=', caption: 'Un día especial' }],
      },
    };

    const applied = applyGiftTemplate(currentGift, getGiftTemplate('thank-you'));

    expect(applied).toMatchObject({
      recipientName: 'Sofía',
      senderName: 'Jean',
      theme: 'sage',
      intro: { title: 'Esto es para darte las gracias' },
      audio: currentGift.audio,
      backgroundImage: currentGift.backgroundImage,
      memories: currentGift.memories,
    });
    expect(applied.audio).not.toBe(currentGift.audio);
    expect(applied.backgroundImage).not.toBe(currentGift.backgroundImage);
    expect(applied.memories).not.toBe(currentGift.memories);
  });

  it('requires confirmation only when applying the template would replace current values', () => {
    const invitation = getGiftTemplate('invitation');
    const untouchedGift = invitation.createGift();
    const customizedGift = {
      ...untouchedGift,
      intro: { ...untouchedGift.intro, title: 'Una invitación completamente personal' },
    };

    expect(templateWouldChangeGift(untouchedGift, invitation)).toBe(false);
    expect(templateWouldChangeGift(customizedGift, invitation)).toBe(true);
  });

  it('keeps published GiftFiles independent from the template registry', () => {
    const template = getGiftTemplate('motivation');
    const giftFile = createGiftFile(template.createGift());
    const serialized = JSON.stringify(giftFile);

    expect(parseGiftFile(giftFile)).toEqual(template.createGift());
    expect(serialized).not.toContain('templateId');
    expect(serialized).not.toContain('motivation');
  });

  it('loads existing gifts without template metadata unchanged', () => {
    const legacyGiftFile = createGiftFile(defaultGift);
    const parsed = parseGiftFile(legacyGiftFile);

    expect(parsed).toEqual(defaultGift);
    expect(JSON.stringify(parsed)).not.toContain('templateId');
  });
});
