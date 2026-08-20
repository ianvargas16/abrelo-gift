import type { GiftConfig } from '../models/giftConfig';

export const defaultGift: GiftConfig = {
  version: 1,
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
    message: 'Quería darte algo de una forma un poco menos normal. Así que antes del regalo… te toca abrirlo de verdad.',
  },
  gift: {
    type: 'voucher',
    title: 'Una cena donde tú elijas',
    description: 'Lugar, día y antojo quedan completamente a tu elección. Yo invito.',
    finePrint: 'Canjeable cuando quieras · Sin fecha de vencimiento · Incluye postre',
    code: 'BDAY-001',
  },
};
