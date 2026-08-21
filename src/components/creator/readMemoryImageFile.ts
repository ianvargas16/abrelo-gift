import { assertMemoryImageDataUrl, assertMemoryImageFile } from '../../models/memoryMedia';

export function readMemoryImageFile(file: File): Promise<string> {
  assertMemoryImageFile(file);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No pude leer esa imagen.'));
    reader.onload = () => {
      try {
        resolve(assertMemoryImageDataUrl(reader.result, 'memories.items.image'));
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsDataURL(file);
  });
}
