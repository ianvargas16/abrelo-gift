import { resolveThemeId, type ThemeId } from '../themes/themeRegistry';
import { assertMemoryImageDataUrl, MAX_MEMORY_ITEMS } from './memoryMedia';
import { isGiftAudioMimeType, type GiftAudio } from './giftAudio';
import type { GiftAtmosphere } from './giftAtmosphere';
import { isGiftAtmosphere } from './giftAtmosphere';
import {
  isGiftImageMimeType,
  MAX_GIFT_IMAGE_BYTES,
  type GiftMediaAsset,
} from './giftMedia';

export type { ThemeId } from '../themes/themeRegistry';

export const GIFT_FILE_SCHEMA = 'abrelo.gift';
export const GIFT_FILE_VERSION = 1 as const;
export const MAX_GIFT_TITLE_CHARACTERS = 80;
export const MAX_GIFT_MESSAGE_CHARACTERS = 500;

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

export interface MemoryItem {
  image: string;
  caption?: string;
  alt?: string;
}

export interface MemorySection {
  enabled: boolean;
  title?: string;
  items: MemoryItem[];
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
  audio?: GiftAudio;
  coverImage?: GiftMediaAsset;
  /** @deprecated Legacy field accepted only to preserve old local projects. */
  atmosphere?: GiftAtmosphere;
  intro: GiftIntro;
  letter: GiftLetter;
  memories?: MemorySection;
  gift: VoucherGiftContent;
}

export interface GiftFile {
  schema: typeof GIFT_FILE_SCHEMA;
  version: typeof GIFT_FILE_VERSION;
  gift: GiftConfig;
}

export interface GiftPersonalizationErrors {
  title?: string;
  message?: string;
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
  if (typeof value !== 'string') {
    throw new Error(`Campo inválido: ${fieldName}`);
  }

  return value;
}

function assertNonEmptyString(value: unknown, fieldName: string): string {
  const parsed = assertString(value, fieldName);

  if (parsed.trim().length === 0) {
    throw new Error(`Campo inválido: ${fieldName}`);
  }

  return parsed;
}

function assertTheme(value: unknown): ThemeId {
  return resolveThemeId(value);
}

function parseGiftAudio(value: unknown): GiftAudio {
  const source = assertRecord(value, 'Audio inválido');
  if (!isGiftAudioMimeType(source.mimeType)) throw new Error('Audio inválido');
  return { mimeType: source.mimeType };
}

function parseGiftMediaAsset(value: unknown): GiftMediaAsset {
  const source = assertRecord(value, 'Imagen de portada inválida');
  if (!isGiftImageMimeType(source.mimeType)) {
    throw new Error('Imagen de portada inválida');
  }
  if (!Number.isSafeInteger(source.size) || (source.size as number) <= 0 || (source.size as number) > MAX_GIFT_IMAGE_BYTES) {
    throw new Error('Tamaño de portada inválido');
  }

  return {
    mimeType: source.mimeType,
    size: source.size as number,
  };
}

function assertAtmosphere(value: unknown): GiftAtmosphere {
  if (isGiftAtmosphere(value)) return value;
  throw new Error('Atmósfera sonora inválida');
}

function assertGiftType(value: unknown): GiftType {
  if (value === 'voucher') {
    return value;
  }

  throw new Error('Tipo de regalo no soportado');
}

function parseMemorySection(value: unknown): MemorySection {
  const source = assertRecord(value, 'Recuerdos inválidos');

  if (typeof source.enabled !== 'boolean') {
    throw new Error('Campo inválido: memories.enabled');
  }

  if (!Array.isArray(source.items) || source.items.length > MAX_MEMORY_ITEMS) {
    throw new Error('Cantidad inválida de recuerdos');
  }

  const title = source.title === undefined ? undefined : assertString(source.title, 'memories.title');
  const items = source.items.map((item, index) => {
    const memory = assertRecord(item, `Recuerdo inválido: memories.items.${index}`);
    const caption = memory.caption === undefined
      ? undefined
      : assertString(memory.caption, `memories.items.${index}.caption`);
    const alt = memory.alt === undefined
      ? undefined
      : assertString(memory.alt, `memories.items.${index}.alt`);

    return {
      image: assertMemoryImageDataUrl(memory.image, `memories.items.${index}.image`),
      ...(caption === undefined ? {} : { caption }),
      ...(alt === undefined ? {} : { alt }),
    };
  });

  return {
    enabled: source.enabled,
    ...(title === undefined ? {} : { title }),
    items,
  };
}

function assertGiftConfigVersion(value: unknown, fieldName: string): typeof GIFT_FILE_VERSION {
  if (value === undefined || value === GIFT_FILE_VERSION) {
    return GIFT_FILE_VERSION;
  }

  throw new Error(`Versión de regalo no soportada: ${fieldName}`);
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

  const memories = source.memories === undefined ? undefined : parseMemorySection(source.memories);
  const audio = source.audio === undefined ? undefined : parseGiftAudio(source.audio);
  const coverImage = source.coverImage === undefined ? undefined : parseGiftMediaAsset(source.coverImage);
  const atmosphere = source.atmosphere === undefined ? undefined : assertAtmosphere(source.atmosphere);

  return {
    version: assertGiftConfigVersion(source.version, 'gift.version'),
    recipientName: assertString(source.recipientName, 'recipientName'),
    senderName: assertString(source.senderName, 'senderName'),
    theme: assertTheme(source.theme),
    ...(audio === undefined ? {} : { audio }),
    ...(coverImage === undefined ? {} : { coverImage }),
    ...(atmosphere === undefined ? {} : { atmosphere }),
    intro: {
      eyebrow: assertString(intro.eyebrow, 'intro.eyebrow'),
      title: assertString(intro.title, 'intro.title'),
      envelopeHint: assertString(intro.envelopeHint, 'intro.envelopeHint'),
    },
    letter: {
      title: assertString(letter.title, 'letter.title'),
      message: assertString(letter.message, 'letter.message'),
    },
    ...(memories === undefined ? {} : { memories }),
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

export function normalizeGiftConfigVersion(gift: GiftConfig): GiftConfig {
  return {
    ...gift,
    version: GIFT_FILE_VERSION,
  };
}

export function hasGiftMemories(gift: GiftConfig): boolean {
  return gift.memories?.enabled === true && gift.memories.items.length > 0;
}

export function validateGiftPersonalization(gift: Pick<GiftConfig, 'intro' | 'letter'>): GiftPersonalizationErrors {
  return {
    ...(gift.intro.title.length > MAX_GIFT_TITLE_CHARACTERS
      ? { title: `El título puede tener hasta ${MAX_GIFT_TITLE_CHARACTERS} caracteres.` }
      : {}),
    ...(gift.letter.message.length > MAX_GIFT_MESSAGE_CHARACTERS
      ? { message: `El mensaje puede tener hasta ${MAX_GIFT_MESSAGE_CHARACTERS} caracteres.` }
      : {}),
  };
}

export function hasGiftPersonalizationErrors(gift: Pick<GiftConfig, 'intro' | 'letter'>): boolean {
  return Object.keys(validateGiftPersonalization(gift)).length > 0;
}

export function assertValidGiftPersonalization(gift: Pick<GiftConfig, 'intro' | 'letter'>): void {
  const errors = validateGiftPersonalization(gift);

  if (errors.title) throw new Error(errors.title);
  if (errors.message) throw new Error(errors.message);
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

    return normalizeGiftConfigVersion(parseStructuredGiftConfig(source.gift));
  }

  if (isStructuredGiftConfigRecord(source)) {
    return normalizeGiftConfigVersion(parseStructuredGiftConfig(source));
  }

  return normalizeLegacyGiftConfig(parseLegacyGiftConfig(source));
}

export function parseCreatorGiftConfig(value: unknown): GiftConfig {
  const gift = parseGiftFile(value);
  assertValidGiftPersonalization(gift);
  return gift;
}

export function createGiftDownloadName(gift: GiftConfig): string {
  const slug = gift.recipientName.trim().toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-');
  return `${slug || 'regalo'}.gift.json`;
}
