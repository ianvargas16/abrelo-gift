export const MAX_GIFT_AUDIO_BYTES = 5 * 1024 * 1024;
export const giftAudioMimeTypes = ['audio/mpeg', 'audio/mp4'] as const;

export type GiftAudioMimeType = typeof giftAudioMimeTypes[number];

export interface GiftAudio {
  mimeType: GiftAudioMimeType;
}

export function isGiftAudioMimeType(value: unknown): value is GiftAudioMimeType {
  return typeof value === 'string' && giftAudioMimeTypes.includes(value as GiftAudioMimeType);
}
