import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { getThemeMood, ThemeMoodPicker } from './ThemeMoodPicker';

describe('ThemeMoodPicker', () => {
  it('keeps the four persisted theme IDs available with distinct presentation details', () => {
    expect(getThemeMood('rose').mood).toBe('Romántico');
    expect(getThemeMood('midnight').intensity).toBe('Envolvente');
    expect(getThemeMood('sage').style).toContain('Calma natural');
    expect(getThemeMood('sunset').label).toBe('Atardecer');
  });

  it('marks the current GiftConfig theme as selected', () => {
    const markup = renderToStaticMarkup(<ThemeMoodPicker value="midnight" onChange={vi.fn()} />);

    expect(markup).toContain('Medianoche');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('Elegido');
  });
});
