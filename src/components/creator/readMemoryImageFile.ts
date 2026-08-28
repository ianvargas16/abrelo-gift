import {
  assertMemoryImageFile,
  getMemoryImageDimensions,
  MEMORY_IMAGE_QUALITY,
} from '../../models/memoryMedia';

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No pude abrir esa imagen.'));
    image.src = url;
  });
}

function createOptimizedBlob(image: HTMLImageElement, type: string): Promise<Blob> {
  const dimensions = getMemoryImageDimensions(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext('2d');
  if (!context) {
    return Promise.reject(new Error('No pude preparar esa imagen.'));
  }

  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('No pude preparar esa imagen.'));
        return;
      }

      resolve(blob);
    }, type, type === 'image/png' ? undefined : MEMORY_IMAGE_QUALITY);
  });
}

export async function readMemoryImageFile(file: File): Promise<File> {
  assertMemoryImageFile(file);
  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(sourceUrl);
    const optimizedBlob = await createOptimizedBlob(image, file.type);
    assertMemoryImageFile({ type: optimizedBlob.type, size: optimizedBlob.size });
    return new File([optimizedBlob], file.name, {
      type: optimizedBlob.type,
      lastModified: file.lastModified,
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
