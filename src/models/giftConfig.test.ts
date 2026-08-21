import { describe, expect, it } from 'vitest';
import { defaultGift } from '../config/defaultGift';
import { createGiftFile, GIFT_FILE_SCHEMA, GIFT_FILE_VERSION, hasGiftMemories, parseGiftFile } from './giftConfig';
import { assertMemoryImageFile, MAX_MEMORY_IMAGE_BYTES, MAX_MEMORY_ITEMS } from './memoryMedia';

const memoryImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLQ9wAAAABJRU5ErkJggg==';

describe('parseGiftFile', () => {
  it('parses a current exported GiftFile', () => {
    const parsed = parseGiftFile({
      schema: GIFT_FILE_SCHEMA,
      version: GIFT_FILE_VERSION,
      gift: {
        version: GIFT_FILE_VERSION,
        recipientName: 'Sofía',
        senderName: 'Jean',
        theme: 'rose',
        intro: {
          eyebrow: '19 · 08 · 2026',
          title: 'Hay algo para ti',
          envelopeHint: 'Mantén presionado el sello',
        },
        letter: {
          title: 'Feliz cumpleaños ✦',
          message: 'Carta',
        },
        gift: {
          type: 'voucher',
          title: 'Cena',
          description: 'Lugar libre',
          finePrint: 'Sin vencimiento',
          code: 'BDAY-001',
        },
      },
    });

    expect(parsed.gift.type).toBe('voucher');
    expect(parsed.recipientName).toBe('Sofía');
  });

  it('round-trips exported gift files with empty editor fields', () => {
    const giftWithEmptyFields = {
      ...defaultGift,
      recipientName: '',
      senderName: '',
      intro: {
        eyebrow: '',
        title: '',
        envelopeHint: '',
      },
      letter: {
        title: '',
        message: '',
      },
      gift: {
        ...defaultGift.gift,
        title: '',
        description: '',
        finePrint: '',
        code: '',
      },
    };

    expect(parseGiftFile(createGiftFile(giftWithEmptyFields))).toEqual(giftWithEmptyFields);
  });

  it('rejects unsupported future file versions', () => {
    expect(() =>
      parseGiftFile({
        schema: GIFT_FILE_SCHEMA,
        version: 99,
        gift: {},
      }),
    ).toThrow(/Versión de regalo no soportada/);
  });

  it('rejects bare structured GiftConfig files with unsupported versions', () => {
    expect(() =>
      parseGiftFile({
        ...defaultGift,
        version: 99,
      }),
    ).toThrow(/Versión de regalo no soportada/);
  });

  it('rejects malformed exported files', () => {
    expect(() =>
      parseGiftFile({
        schema: GIFT_FILE_SCHEMA,
        version: GIFT_FILE_VERSION,
        gift: {
          intro: {},
        },
      }),
    ).toThrow();
  });

  it('parses bare structured GiftConfig files', () => {
    expect(parseGiftFile(defaultGift)).toEqual(defaultGift);
  });

  it('preserves draft-compatible GiftConfig values through createGiftFile and parseGiftFile', () => {
    const creatorCompatibleGift = {
      ...defaultGift,
      recipientName: '',
      senderName: '   ',
      intro: {
        eyebrow: '',
        title: '  ',
        envelopeHint: '',
      },
      letter: {
        title: '',
        message: '',
      },
      gift: {
        ...defaultGift.gift,
        title: '',
        description: '   ',
        finePrint: '',
        code: '',
      },
    };

    expect(parseGiftFile(createGiftFile(creatorCompatibleGift))).toEqual(creatorCompatibleGift);
  });

  it('round-trips an optional memories section through GiftFile export and import', () => {
    const giftWithMemories = {
      ...defaultGift,
      memories: {
        enabled: true,
        title: 'Pequeños momentos',
        items: [{ image: memoryImage, caption: 'Una tarde que quiero repetir.', alt: 'Dos personas caminando al atardecer.' }],
      },
    };

    expect(parseGiftFile(createGiftFile(giftWithMemories))).toEqual(giftWithMemories);
  });

  it('keeps legacy gifts on the original Runtime path when memories are absent or empty', () => {
    expect(hasGiftMemories(defaultGift)).toBe(false);
    expect(hasGiftMemories({ ...defaultGift, memories: { enabled: true, items: [] } })).toBe(false);
    expect(hasGiftMemories({ ...defaultGift, memories: { enabled: false, items: [{ image: memoryImage }] } })).toBe(false);
    expect(hasGiftMemories({ ...defaultGift, memories: { enabled: true, items: [{ image: memoryImage }] } })).toBe(true);
  });

  it('drops unknown local memory ids while parsing an imported GiftFile', () => {
    const parsed = parseGiftFile({
      ...createGiftFile(defaultGift),
      gift: {
        ...defaultGift,
        memories: {
          enabled: true,
          items: [{ id: 'local-only-id', image: memoryImage }],
        },
      },
    });

    expect(parsed.memories?.items).toEqual([{ image: memoryImage }]);
    expect(JSON.stringify(createGiftFile(parsed))).not.toContain('local-only-id');
  });

  it('rejects malformed or unsupported memory images', () => {
    const invalidImageGift = {
      ...defaultGift,
      memories: {
        enabled: true,
        items: [{ image: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==' }],
      },
    };

    expect(() => parseGiftFile(createGiftFile(invalidImageGift))).toThrow(/Imagen inválida/);
  });

  it('rejects malformed optional memory alt text', () => {
    const invalidAltGift = {
      ...defaultGift,
      memories: {
        enabled: true,
        items: [{ image: memoryImage, alt: 42 }],
      },
    };

    expect(() => parseGiftFile({ ...createGiftFile(defaultGift), gift: invalidAltGift })).toThrow(/memories.items.0.alt/);
  });

  it('rejects memory images over the local 5 MB limit', () => {
    const tooLargePayload = `iVBORw0KGgoA${'A'.repeat(Math.ceil((MAX_MEMORY_IMAGE_BYTES + 1) / 3) * 4)}`;
    const giftWithLargeMemory = {
      ...defaultGift,
      memories: {
        enabled: true,
        items: [{ image: `data:image/png;base64,${tooLargePayload}` }],
      },
    };

    expect(() => parseGiftFile(createGiftFile(giftWithLargeMemory))).toThrow(/Imagen demasiado grande/);
  });

  it('rejects more than the maximum number of memories', () => {
    const giftWithTooManyMemories = {
      ...defaultGift,
      memories: {
        enabled: true,
        items: Array.from({ length: MAX_MEMORY_ITEMS + 1 }, () => ({ image: memoryImage })),
      },
    };

    expect(() => parseGiftFile(createGiftFile(giftWithTooManyMemories))).toThrow(/Cantidad inválida/);
  });

  it('validates selected image types and file sizes before reading them', () => {
    expect(() => assertMemoryImageFile({ type: 'image/gif', size: 1024 })).toThrow(/JPG, PNG o WebP/);
    expect(() => assertMemoryImageFile({ type: 'image/png', size: MAX_MEMORY_IMAGE_BYTES + 1 })).toThrow(/5 MB/);
    expect(() => assertMemoryImageFile({ type: 'image/webp', size: 1024 })).not.toThrow();
  });

  it('parses the legacy flat GiftConfig shape', () => {
    const parsed = parseGiftFile({
      recipientName: 'Sofía',
      senderName: 'Jean',
      introEyebrow: '19 · 08 · 2026',
      introTitle: 'Hay algo para ti',
      envelopeHint: 'Mantén presionado el sello',
      letterTitle: 'Feliz cumpleaños ✦',
      letterMessage: 'Carta',
      giftType: 'voucher',
      voucherTitle: 'Cena',
      voucherDescription: 'Lugar libre',
      voucherFinePrint: 'Sin vencimiento',
      voucherCode: 'BDAY-001',
      theme: 'rose',
    });

    expect(parsed.intro.title).toBe('Hay algo para ti');
    expect(parsed.gift.code).toBe('BDAY-001');
  });
});
