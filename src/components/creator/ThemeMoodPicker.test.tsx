import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { resolveTheme } from '../../themes/themeRegistry';
import { ThemeMoodPicker } from './ThemeMoodPicker';

describe('ThemeMoodPicker', () => {
  it('keeps the four persisted theme IDs available with distinct presentation details', () => {
    expect(resolveTheme('rose').mood).toBe('Romántico');
    expect(resolveTheme('midnight').intensity).toBe('Envolvente');
    expect(resolveTheme('sage').description).toContain('papel natural');
    expect(resolveTheme('sunset').name).toBe('Atardecer');
  });

  it('marks the current GiftConfig theme as selected', () => {
    const markup = renderToStaticMarkup(<ThemeMoodPicker value="midnight" onChange={vi.fn()} />);

    expect(markup).toContain('Medianoche');
    expect(markup).toContain('Contraste profundo y luz suave');
    expect(markup).toContain('--swatch:#8091d7');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('Elegido');
  });
});
