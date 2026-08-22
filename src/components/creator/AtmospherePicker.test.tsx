import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AtmospherePicker, getAtmosphereOption } from './AtmospherePicker';

describe('AtmospherePicker', () => {
  it('treats an absent persisted setting as the silent option', () => {
    expect(getAtmosphereOption()).toMatchObject({ id: 'silent', label: 'Silencio' });
  });

  it('marks the active optional soundscape without making silence unavailable', () => {
    const markup = renderToStaticMarkup(<AtmospherePicker value="romantic" onChange={vi.fn()} />);

    expect(markup).toContain('Silencio');
    expect(markup).toContain('Romántico');
    expect(markup).toContain('aria-pressed="true"');
  });
});
