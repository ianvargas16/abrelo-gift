export const MAX_AUDIO_SIZE = 5 * 1024 * 1024;
// Keep the original export for Creator validation compatibility.
export const MAX_GIFT_AUDIO_BYTES = MAX_AUDIO_SIZE;
export const giftAudioMimeTypes = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav'] as const;

export type GiftAudioMimeType = typeof giftAudioMimeTypes[number];

export interface GiftAudio {
  mimeType: GiftAudioMimeType;
}

export function isGiftAudioMimeType(value: unknown): value is GiftAudioMimeType {
  return typeof value === 'string' && giftAudioMimeTypes.includes(value as GiftAudioMimeType);
}
