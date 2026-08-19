export const GIFT_FILE_SCHEMA = 'abrelo.gift';
export const GIFT_FILE_VERSION = 1 as const;

export type ThemeId = 'rose' | 'midnight' | 'sage' | 'sunset';
export type GiftType = 'voucher';

export interface GiftIntro {
  eyebrow: string;
  title: string;
  envelopeHint: string;
}

export interface GiftLetter {
  title: string;
  message: string;
}

export interface VoucherGiftContent {
  type: 'voucher';
  title: string;
  description: string;
  finePrint: string;
  code: string;
}

export interface GiftConfig {
  version: typeof GIFT_FILE_VERSION;
  recipientName: string;
  senderName: string;
  theme: ThemeId;
  intro: GiftIntro;
  letter: GiftLetter;
  gift: VoucherGiftContent;
}

export interface GiftFile {
  schema: typeof GIFT_FILE_SCHEMA;
  version: typeof GIFT_FILE_VERSION;
  gift: GiftConfig;
}

interface LegacyGiftConfig {
  recipientName: string;
  senderName: string;
  introEyebrow: string;
  introTitle: string;
  envelopeHint: string;
  letterTitle: string;
  letterMessage: string;
  giftType: GiftType;
  voucherTitle: string;
  voucherDescription: string;
  voucherFinePrint: string;
  voucherCode: string;
  theme: ThemeId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertRecord(value: unknown, message: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(message);
  }

  return value;
}

function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Campo inválido: ${fieldName}`);
  }

  return value;
}

function assertTheme(value: unknown): ThemeId {
  if (value === 'rose' || value === 'midnight' || value === 'sage' || value === 'sunset') {
    return value;
  }

  throw new Error('Tema inválido');
}

function assertGiftType(value: unknown): GiftType {
  if (value === 'voucher') {
    return value;
  }

  throw new Error('Tipo de regalo no soportado');
}

export function createGiftFile(gift: GiftConfig): GiftFile {
  return {
    schema: GIFT_FILE_SCHEMA,
    version: GIFT_FILE_VERSION,
    gift,
  };
}

function parseStructuredGiftConfig(value: unknown): GiftConfig {
  const source = assertRecord(value, 'GiftConfig inválido');
  const intro = assertRecord(source.intro, 'Intro inválido');
  const letter = assertRecord(source.letter, 'Carta inválida');
  const gift = assertRecord(source.gift, 'Regalo inválido');

  return {
    version: GIFT_FILE_VERSION,
    recipientName: assertString(source.recipientName, 'recipientName'),
    senderName: assertString(source.senderName, 'senderName'),
    theme: assertTheme(source.theme),
    intro: {
      eyebrow: assertString(intro.eyebrow, 'intro.eyebrow'),
      title: assertString(intro.title, 'intro.title'),
      envelopeHint: assertString(intro.envelopeHint, 'intro.envelopeHint'),
    },
    letter: {
      title: assertString(letter.title, 'letter.title'),
      message: assertString(letter.message, 'letter.message'),
    },
    gift: {
      type: assertGiftType(gift.type),
      title: assertString(gift.title, 'gift.title'),
      description: assertString(gift.description, 'gift.description'),
      finePrint: assertString(gift.finePrint, 'gift.finePrint'),
      code: assertString(gift.code, 'gift.code'),
    },
  };
}

function parseLegacyGiftConfig(value: unknown): LegacyGiftConfig {
  const source = assertRecord(value, 'Formato legacy inválido');

  return {
    recipientName: assertString(source.recipientName, 'recipientName'),
    senderName: assertString(source.senderName, 'senderName'),
    introEyebrow: assertString(source.introEyebrow, 'introEyebrow'),
    introTitle: assertString(source.introTitle, 'introTitle'),
    envelopeHint: assertString(source.envelopeHint, 'envelopeHint'),
    letterTitle: assertString(source.letterTitle, 'letterTitle'),
    letterMessage: assertString(source.letterMessage, 'letterMessage'),
    giftType: assertGiftType(source.giftType),
    voucherTitle: assertString(source.voucherTitle, 'voucherTitle'),
    voucherDescription: assertString(source.voucherDescription, 'voucherDescription'),
    voucherFinePrint: assertString(source.voucherFinePrint, 'voucherFinePrint'),
    voucherCode: assertString(source.voucherCode, 'voucherCode'),
    theme: assertTheme(source.theme),
  };
}

function isGiftFileRecord(source: Record<string, unknown>): boolean {
  return 'schema' in source;
}

function isStructuredGiftConfigRecord(source: Record<string, unknown>): boolean {
  return 'intro' in source || 'letter' in source;
}

export function normalizeGiftConfig(gift: GiftConfig): GiftConfig {
  return {
    ...gift,
    version: GIFT_FILE_VERSION,
  };
}

export function normalizeLegacyGiftConfig(legacyGift: LegacyGiftConfig): GiftConfig {
  return {
    version: GIFT_FILE_VERSION,
    recipientName: legacyGift.recipientName,
    senderName: legacyGift.senderName,
    theme: legacyGift.theme,
    intro: {
      eyebrow: legacyGift.introEyebrow,
      title: legacyGift.introTitle,
      envelopeHint: legacyGift.envelopeHint,
    },
    letter: {
      title: legacyGift.letterTitle,
      message: legacyGift.letterMessage,
    },
    gift: {
      type: legacyGift.giftType,
      title: legacyGift.voucherTitle,
      description: legacyGift.voucherDescription,
      finePrint: legacyGift.voucherFinePrint,
      code: legacyGift.voucherCode,
    },
  };
}

export function parseGiftFile(value: unknown): GiftConfig {
  const source = assertRecord(value, 'Archivo de regalo inválido');

  if (isGiftFileRecord(source)) {
    if (source.schema !== GIFT_FILE_SCHEMA) {
      throw new Error('Schema no soportado');
    }

    if (source.version !== GIFT_FILE_VERSION) {
      throw new Error(`Versión de regalo no soportada: ${String(source.version)}`);
    }

    return normalizeGiftConfig(parseStructuredGiftConfig(source.gift));
  }

  if (isStructuredGiftConfigRecord(source)) {
    return normalizeGiftConfig(parseStructuredGiftConfig(source));
  }

  return normalizeLegacyGiftConfig(parseLegacyGiftConfig(source));
}

export function createGiftDownloadName(gift: GiftConfig): string {
  const slug = gift.recipientName.trim().toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-');
  return `${slug || 'regalo'}.gift.json`;
}
