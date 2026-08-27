import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BackgroundImagePicker } from './BackgroundImagePicker';

describe('Creator background image picker', () => {
  it('presents an uploaded image as the gift background', () => {
    const file = new File(['image'], 'momento.webp', { type: 'image/webp' });
    const markup = renderToStaticMarkup(
      <BackgroundImagePicker
        file={file}
        previewUrl="blob:background"
        error=""
        onChange={vi.fn()}
        onError={vi.fn()}
      />,
    );

    expect(markup).toContain('Vista previa del fondo del regalo');
    expect(markup).toContain('Reemplazar fondo');
    expect(markup).toContain('Quitar fondo');
    expect(markup).not.toMatch(/portada/i);
  });
});
