export const MAX_MEMORY_ITEMS = 5;
export const MAX_MEMORY_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_MEMORY_IMAGE_DIMENSION = 1600;
export const MEMORY_IMAGE_QUALITY = 0.86;

export const MEMORY_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type MemoryImageType = (typeof MEMORY_IMAGE_TYPES)[number];

interface MemoryImageFile {
  type: string;
  size: number;
}

export interface MemoryImageDimensions {
  width: number;
  height: number;
}

function isMemoryImageType(value: string): value is MemoryImageType {
  return (MEMORY_IMAGE_TYPES as readonly string[]).includes(value);
}

function getBase64ByteLength(value: string): number {
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  return (value.length / 4) * 3 - padding;
}

export function assertMemoryImageFile(file: MemoryImageFile): void {
  if (!isMemoryImageType(file.type)) {
    throw new Error('Elige una imagen JPG, PNG o WebP.');
  }

  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_MEMORY_IMAGE_BYTES) {
    throw new Error('Cada recuerdo debe pesar 5 MB o menos.');
  }
}

export function getMemoryImageDimensions(width: number, height: number): MemoryImageDimensions {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('No pude preparar esa imagen.');
  }

  const longestSide = Math.max(width, height);
  if (longestSide <= MAX_MEMORY_IMAGE_DIMENSION) {
    return { width: Math.round(width), height: Math.round(height) };
  }

  const scale = MAX_MEMORY_IMAGE_DIMENSION / longestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function assertMemoryImageDataUrl(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Campo inválido: ${fieldName}`);
  }

  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) {
    throw new Error(`Imagen inválida: ${fieldName}`);
  }

  const [, mediaType, payload] = match;
  const hasExpectedSignature = (mediaType === 'image/png' && payload.startsWith('iVBORw0KGgo'))
    || (mediaType === 'image/jpeg' && payload.startsWith('/9j/'))
    || (mediaType === 'image/webp' && payload.startsWith('UklGR'));
  if (!hasExpectedSignature) {
    throw new Error(`Imagen inválida: ${fieldName}`);
  }

  if (getBase64ByteLength(payload) > MAX_MEMORY_IMAGE_BYTES) {
    throw new Error(`Imagen demasiado grande: ${fieldName}`);
  }

  return value;
}
