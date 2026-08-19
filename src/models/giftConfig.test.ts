import { describe, expect, it } from 'vitest';
import { defaultGift } from '../config/defaultGift';
import { GIFT_FILE_SCHEMA, GIFT_FILE_VERSION, parseGiftFile } from './giftConfig';

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

  it('rejects unsupported future file versions', () => {
    expect(() =>
      parseGiftFile({
        schema: GIFT_FILE_SCHEMA,
        version: 99,
        gift: {},
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
