import { MAX_GIFT_AUDIO_BYTES, isGiftAudioMimeType, type GiftAudio } from '../src/models/giftAudio';
import { MAX_GIFT_FILE_BYTES, GiftPayloadTooLargeError, parseCanonicalGiftFile, readGiftRequestBody } from './giftPublishing';

export const MAX_MULTIPART_BYTES = MAX_GIFT_AUDIO_BYTES + MAX_GIFT_FILE_BYTES + (128 * 1024);

export interface ParsedPublishRequest {
  giftFile: ReturnType<typeof parseCanonicalGiftFile>;
  audio?: { file: File; metadata: GiftAudio };
}

export class UnsupportedAudioError extends Error {}
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

export async function parsePublishRequest(request: Request): Promise<ParsedPublishRequest> {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType === 'application/json') {
    const body = await readGiftRequestBody(request);
    return { giftFile: parseCanonicalGiftFile(JSON.parse(body)) };
  }
  if (contentType !== 'multipart/form-data') throw new UnsupportedAudioError();

  const body = await readBoundedBody(request, MAX_MULTIPART_BYTES);
  let form: FormData;
  try {
    form = await new Request('https://multipart.invalid', {
      method: 'POST', headers: { 'Content-Type': request.headers.get('content-type')! }, body,
    }).formData();
  } catch { throw new MalformedPublishRequestError(); }

  const entries = [...form.entries()];
  if (entries.some(([name]) => name !== 'gift' && name !== 'audio')) throw new MalformedPublishRequestError();
  const gifts = entries.filter(([name]) => name === 'gift');
  const audios = entries.filter(([name]) => name === 'audio');
  if (gifts.length !== 1 || audios.length > 1 || typeof gifts[0][1] !== 'string') throw new MalformedPublishRequestError();
  if (new TextEncoder().encode(gifts[0][1] as string).byteLength > MAX_GIFT_FILE_BYTES) throw new GiftPayloadTooLargeError();
  const giftFile = parseCanonicalGiftFile(JSON.parse(gifts[0][1] as string));
  if (audios.length === 0) return { giftFile };
  const file = audios[0][1];
  if (!(file instanceof File)) throw new MalformedPublishRequestError();
  if (file.size > MAX_GIFT_AUDIO_BYTES) throw new GiftPayloadTooLargeError();
  if (!isGiftAudioMimeType(file.type)) throw new UnsupportedAudioError();
  return { giftFile, audio: { file, metadata: { mimeType: file.type } } };
}

export function getGiftAudioKey(id: string): string { return `gifts/${id}/audio`; }
