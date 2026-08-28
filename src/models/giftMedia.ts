export const MAX_GIFT_IMAGE_BYTES = 5 * 1024 * 1024;

export const giftImageMimeTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type GiftImageMimeType = (typeof giftImageMimeTypes)[number];

export interface GiftMediaAsset {
  mimeType: GiftImageMimeType;
  size: number;
}

export const GIFT_MEDIA_ASSET_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/u;

export interface GiftMemoryAsset extends GiftMediaAsset {
  id: string;
}

export function isGiftMediaAssetId(value: unknown): value is string {
  return typeof value === 'string' && GIFT_MEDIA_ASSET_ID_PATTERN.test(value);
}

export function isGiftImageMimeType(value: unknown): value is GiftImageMimeType {
  return typeof value === 'string' && giftImageMimeTypes.includes(value as GiftImageMimeType);
}

export function assertGiftImageFile(file: Pick<File, 'size' | 'type'>): void {
  if (!isGiftImageMimeType(file.type)) {
    throw new Error('Usa una imagen JPG, PNG o WebP.');
  }

  if (file.size <= 0) {
    throw new Error('La imagen está vacía.');
  }

  if (file.size > MAX_GIFT_IMAGE_BYTES) {
    throw new Error('La imagen no puede superar 5 MB.');
  }
}
