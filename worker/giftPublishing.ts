import { createGiftFile, parseGiftFile, type GiftFile } from '../src/models/giftConfig';

export const GIFT_ID_BYTES = 16;
export const GIFT_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;
// D1 stores the serialized GiftFile in one row, whose maximum string/BLOB value is 2 MB.
export const MAX_GIFT_FILE_BYTES = 1024 * 1024;
export const DEFAULT_PUBLIC_GIFT_TITLE = 'Tienes un regalo especial';
export const DEFAULT_PUBLIC_GIFT_DESCRIPTION = 'Alguien preparó una sorpresa para ti.';

const RUNTIME_GIFT_PLACEHOLDER = '<script id="abrelo-gift-data" type="application/json"></script>';
const RUNTIME_METADATA_PLACEHOLDER = '<!-- abrelo:public-metadata -->';
const INLINE_JSON_ESCAPES: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};
const HTML_ATTRIBUTE_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '"': '&quot;',
  "'": '&#39;',
  '<': '&lt;',
  '>': '&gt;',
};

export function generateOpaqueGiftId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(GIFT_ID_BYTES));
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
}

export function parseCanonicalGiftFile(value: unknown): GiftFile {
  return createGiftFile(parseGiftFile(value));
}

export function serializeGiftFileForHtml(giftFile: GiftFile): string {
  return JSON.stringify(giftFile).replace(/[<>&\u2028\u2029]/gu, (character) => INLINE_JSON_ESCAPES[character]);
}

export function injectGiftFileIntoRuntimeHtml(runtimeHtml: string, giftFile: GiftFile): string {
  if (!runtimeHtml.includes(RUNTIME_GIFT_PLACEHOLDER)) {
    throw new Error('Runtime gift bootstrap placeholder is missing');
  }

  const serializedGift = serializeGiftFileForHtml(giftFile);
  return runtimeHtml.replace(
    RUNTIME_GIFT_PLACEHOLDER,
    `<script id="abrelo-gift-data" type="application/json">${serializedGift}</script>`,
  );
}

export interface PublicGiftMetadata {
  title: string;
  description: string;
  imageUrl: string;
}

function escapeHtmlAttribute(value: string): string {
  return value.replace(/[&"'<>]/gu, (character) => HTML_ATTRIBUTE_ESCAPES[character]);
}

export function getPublicGiftMetadata(giftFile: GiftFile, publicUrl: string): PublicGiftMetadata {
  const title = giftFile.gift.intro.title.trim() || DEFAULT_PUBLIC_GIFT_TITLE;
  const imageUrl = giftFile.gift.backgroundImage
    ? `${publicUrl}/cover`
    : new URL('/icon.png', publicUrl).toString();

  return {
    title,
    description: DEFAULT_PUBLIC_GIFT_DESCRIPTION,
    imageUrl,
  };
}

export function injectPublicMetadataIntoRuntimeHtml(runtimeHtml: string, publicUrl: string, giftFile: GiftFile): string {
  if (!runtimeHtml.includes(RUNTIME_METADATA_PLACEHOLDER)) {
    throw new Error('Runtime metadata placeholder is missing');
  }

  const publicMetadata = getPublicGiftMetadata(giftFile, publicUrl);
  const escapedUrl = escapeHtmlAttribute(publicUrl);
  const escapedTitle = escapeHtmlAttribute(publicMetadata.title);
  const escapedDescription = escapeHtmlAttribute(publicMetadata.description);
  const escapedImageUrl = escapeHtmlAttribute(publicMetadata.imageUrl);
  const metadata = `<link rel="canonical" href="${escapedUrl}" />
    <meta name="description" content="${escapedDescription}" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDescription}" />
    <meta property="og:image" content="${escapedImageUrl}" />
    <meta property="og:url" content="${escapedUrl}" />
    <meta property="og:site_name" content="Ábrelo" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedDescription}" />
    <meta name="twitter:image" content="${escapedImageUrl}" />`;

  return runtimeHtml
    .replace(RUNTIME_METADATA_PLACEHOLDER, metadata)
    .replace(/<title>[\s\S]*?<\/title>/u, `<title>${escapedTitle} · Ábrelo</title>`);
}

export async function readGiftRequestBody(request: Request): Promise<string> {
  const declaredLength = request.headers.get('content-length');

  if (declaredLength && Number(declaredLength) > MAX_GIFT_FILE_BYTES) {
    throw new GiftPayloadTooLargeError();
  }

  if (!request.body) {
    return '';
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > MAX_GIFT_FILE_BYTES) {
      await reader.cancel();
      throw new GiftPayloadTooLargeError();
    }

    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(body);
}

export class GiftPayloadTooLargeError extends Error {
  constructor() {
    super('Gift payload exceeds the configured limit');
    this.name = 'GiftPayloadTooLargeError';
  }
}
