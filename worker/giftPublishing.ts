import { createGiftFile, parseGiftFile, type GiftFile } from '../src/models/giftConfig';

export const GIFT_ID_BYTES = 16;
export const GIFT_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;
export const MAX_GIFT_FILE_BYTES = 64 * 1024;

const RUNTIME_GIFT_PLACEHOLDER = '<script id="abrelo-gift-data" type="application/json"></script>';
const INLINE_JSON_ESCAPES: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
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
