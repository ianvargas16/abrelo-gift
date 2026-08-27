import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CoverImagePicker } from './CoverImagePicker';

describe('Creator cover image picker', () => {
  it('shows selected file metadata and replace/remove controls without persisting the blob', () => {
    const file = new File(['cover'], 'nuestra-foto.webp', { type: 'image/webp' });
    const markup = renderToStaticMarkup(
      <CoverImagePicker
        file={file}
        previewUrl="blob:creator-preview"
        error=""
        onChange={vi.fn()}
        onError={vi.fn()}
      />,
    );

    expect(markup).toContain('nuestra-foto.webp');
    expect(markup).toContain('Reemplazar imagen');
    expect(markup).toContain('Quitar imagen');
    expect(markup).toContain('blob:creator-preview');
  });
});
