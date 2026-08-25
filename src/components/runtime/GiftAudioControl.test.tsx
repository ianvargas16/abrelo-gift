import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { GiftAudioControl, getGiftAudioLabel } from './GiftAudioControl';
import type { GiftAudioStatus } from './useGiftAudio';

describe('recipient gift audio control', () => {
  it.each([
    ['loading', 'Cargando audio…'],
    ['ready', 'Reproducir mensaje'],
    ['playing', 'Reproduciendo…'],
    ['paused', 'Reanudar'],
    ['error', 'Reintentar audio'],
  ] satisfies Array<[GiftAudioStatus, string]>)('presents the %s state clearly', (status, label) => {
    expect(getGiftAudioLabel(status)).toBe(label);
    expect(renderToStaticMarkup(<GiftAudioControl status={status} onToggle={vi.fn()} />)).toContain(label);
  });

  it('disables playback while the audio is loading', () => {
    const markup = renderToStaticMarkup(<GiftAudioControl status="loading" onToggle={vi.fn()} />);

    expect(markup).toContain('disabled=""');
    expect(markup).toContain('aria-live="polite"');
  });
});
