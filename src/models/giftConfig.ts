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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function readTheme(value: unknown, fallback: ThemeId): ThemeId {
  return value === 'rose' || value === 'midnight' || value === 'sage' || value === 'sunset' ? value : fallback;
}

function readGiftType(value: unknown): GiftType {
  return value === 'voucher' ? value : 'voucher';
}

export function createGiftFile(gift: GiftConfig): GiftFile {
  return {
    schema: GIFT_FILE_SCHEMA,
    version: GIFT_FILE_VERSION,
    gift,
  };
}

export function normalizeGiftConfig(value: unknown, fallback: GiftConfig): GiftConfig {
  if (!isRecord(value)) {
    return fallback;
  }

  const introSource = isRecord(value.intro) ? value.intro : value;
  const letterSource = isRecord(value.letter) ? value.letter : value;
  const giftSource = isRecord(value.gift) ? value.gift : value;

  return {
    version: GIFT_FILE_VERSION,
    recipientName: readString(value.recipientName, fallback.recipientName),
    senderName: readString(value.senderName, fallback.senderName),
    theme: readTheme(value.theme, fallback.theme),
    intro: {
      eyebrow: readString(introSource.eyebrow ?? introSource.introEyebrow, fallback.intro.eyebrow),
      title: readString(introSource.title ?? introSource.introTitle, fallback.intro.title),
      envelopeHint: readString(introSource.envelopeHint, fallback.intro.envelopeHint),
    },
    letter: {
      title: readString(letterSource.title ?? letterSource.letterTitle, fallback.letter.title),
      message: readString(letterSource.message ?? letterSource.letterMessage, fallback.letter.message),
    },
    gift: {
      type: readGiftType(giftSource.type ?? giftSource.giftType),
      title: readString(giftSource.title ?? giftSource.voucherTitle, fallback.gift.title),
      description: readString(giftSource.description ?? giftSource.voucherDescription, fallback.gift.description),
      finePrint: readString(giftSource.finePrint ?? giftSource.voucherFinePrint, fallback.gift.finePrint),
      code: readString(giftSource.code ?? giftSource.voucherCode, fallback.gift.code),
    },
  };
}

export function parseGiftFile(value: unknown, fallback: GiftConfig): GiftConfig {
  if (!isRecord(value)) {
    return fallback;
  }

  const candidate = value.schema === GIFT_FILE_SCHEMA ? value.gift : value;
  return normalizeGiftConfig(candidate, fallback);
}

export function createGiftDownloadName(gift: GiftConfig): string {
  const slug = gift.recipientName.trim().toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-');
  return `${slug || 'regalo'}.gift.json`;
}
