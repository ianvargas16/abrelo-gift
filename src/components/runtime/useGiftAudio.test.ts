import { describe, expect, it } from 'vitest';
import { getGiftAudioUrl } from './useGiftAudio';

describe('Gift audio activation', () => {
  it('does not produce an audio request URL for silent Runtime gifts', () => {
    expect(getGiftAudioUrl(false, '/g/opaque-gift')).toBeNull();
  });

  it('uses only the Worker-owned audio route when audio is configured', () => {
    expect(getGiftAudioUrl(true, '/g/opaque-gift/')).toBe('/g/opaque-gift/audio');
  });
});
