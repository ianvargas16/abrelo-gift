import { MAX_AUDIO_SIZE, isGiftAudioMimeType, type GiftAudio } from '../src/models/giftAudio';
import {
  isGiftImageMimeType,
  MAX_GIFT_IMAGE_BYTES,
  type GiftMediaAsset,
  type GiftImageMimeType,
} from '../src/models/giftMedia';
import { MAX_GIFT_FILE_BYTES, GiftPayloadTooLargeError, parseCanonicalGiftFile, readGiftRequestBody } from './giftPublishing';

export const MAX_MULTIPART_BYTES = MAX_AUDIO_SIZE + MAX_GIFT_IMAGE_BYTES + MAX_GIFT_FILE_BYTES + (192 * 1024);

export interface ParsedPublishRequest {
  giftFile: ReturnType<typeof parseCanonicalGiftFile>;
  audio?: { file: File; metadata: GiftAudio };
  backgroundImage?: { file: File; metadata: GiftMediaAsset };
}

export class UnsupportedAudioError extends Error {}
export class AudioTooLargeError extends Error {}
export class UnsupportedImageError extends Error {}
export class ImageTooLargeError extends Error {}
export class MalformedPublishRequestError extends Error {}

async function readBoundedBody(request: Request, maxBytes: number): Promise<Uint8Array> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (declaredLength > maxBytes) throw new GiftPayloadTooLargeError();
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new GiftPayloadTooLargeError();
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}

async function hasSupportedImageSignature(file: File, mimeType: GiftImageMimeType): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  if (mimeType === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (mimeType === 'image/png') {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return signature.every((byte, index) => bytes[index] === byte);
  }

  return bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
}

export async function parsePublishRequest(request: Request): Promise<ParsedPublishRequest> {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType === 'application/json') {
    const body = await readGiftRequestBody(request);
    return { giftFile: parseCanonicalGiftFile(JSON.parse(body)) };
  }
  if (contentType !== 'multipart/form-data') throw new MalformedPublishRequestError();

  const body = await readBoundedBody(request, MAX_MULTIPART_BYTES);
  let form: FormData;
  try {
    form = await new Request('https://multipart.invalid', {
      method: 'POST', headers: { 'Content-Type': request.headers.get('content-type')! }, body,
    }).formData();
  } catch { throw new MalformedPublishRequestError(); }

  const entries = [...form.entries()];
  const allowedFields = new Set(['gift', 'audio', 'coverImage']);
  if (entries.some(([name]) => !allowedFields.has(name))) throw new MalformedPublishRequestError();
  const gifts = entries.filter(([name]) => name === 'gift');
  const audios = entries.filter(([name]) => name === 'audio');
  const coverImages = entries.filter(([name]) => name === 'coverImage');
  if (gifts.length !== 1 || audios.length > 1 || coverImages.length > 1 || typeof gifts[0][1] !== 'string') {
    throw new MalformedPublishRequestError();
  }
  if (new TextEncoder().encode(gifts[0][1] as string).byteLength > MAX_GIFT_FILE_BYTES) throw new GiftPayloadTooLargeError();
  const giftFile = parseCanonicalGiftFile(JSON.parse(gifts[0][1] as string));
  const result: ParsedPublishRequest = { giftFile };

  if (audios.length === 1) {
    const file = audios[0][1];
    if (!(file instanceof File) || file.size <= 0) throw new MalformedPublishRequestError();
    if (file.size > MAX_AUDIO_SIZE) throw new AudioTooLargeError();
    if (!isGiftAudioMimeType(file.type)) throw new UnsupportedAudioError();
    result.audio = { file, metadata: { mimeType: file.type } };
  }

  if (coverImages.length === 1) {
    const file = coverImages[0][1];
    if (!(file instanceof File) || file.size <= 0) throw new MalformedPublishRequestError();
    if (file.size > MAX_GIFT_IMAGE_BYTES) throw new ImageTooLargeError();
    if (!isGiftImageMimeType(file.type) || !(await hasSupportedImageSignature(file, file.type))) {
      throw new UnsupportedImageError();
    }
    result.backgroundImage = { file, metadata: { mimeType: file.type, size: file.size } };
  }

  return result;
}

export function getGiftAudioKey(id: string): string { return `gifts/${id}/audio`; }
// Preserve the original object path so Milestone 28 assets need no storage migration.
export function getGiftBackgroundImageKey(id: string): string { return `gifts/${id}/cover`; }
