import { describe, expect, it, vi } from 'vitest';
import { createGiftAudioController, getGiftAudioUrl } from './useGiftAudio';

function createAudioHarness(hasAudio = true) {
  const listeners = new Map<string, Set<() => void>>();
  const statuses: string[] = [];
  const source = {
    loop: false,
    preload: '',
    src: '',
    paused: true,
    muted: false,
    volume: 1,
    currentTime: 0,
    play: vi.fn(async () => {
      source.paused = false;
      listeners.get('play')?.forEach((listener) => listener());
    }),
    pause: vi.fn(() => {
      source.paused = true;
      listeners.get('pause')?.forEach((listener) => listener());
    }),
    addEventListener(type: string, listener: () => void) {
      const group = listeners.get(type) ?? new Set();
      group.add(listener);
      listeners.set(type, group);
    },
    removeEventListener(type: string, listener: () => void) {
      listeners.get(type)?.delete(listener);
    },
  };
  const createAudio = vi.fn(() => source);
  const controller = createGiftAudioController({
    hasAudio,
    pathname: '/g/opaque-gift',
    createAudio,
    onStatus: (status) => statuses.push(status),
  });

  return { controller, createAudio, source, statuses };
}

describe('Gift audio activation', () => {
  it('does not produce an audio request URL for silent Runtime gifts', () => {
    expect(getGiftAudioUrl(false, '/g/opaque-gift')).toBeNull();
  });

  it('uses only the Worker-owned audio route when audio is configured', () => {
    expect(getGiftAudioUrl(true, '/g/opaque-gift/')).toBe('/g/opaque-gift/audio');
  });

  it('unlocks configured audio silently and cancels an incomplete hold', async () => {
    const harness = createAudioHarness();

    harness.controller.beginGesture();
    await Promise.resolve();
    expect(harness.source.volume).toBe(0);
    expect(harness.source.muted).toBe(true);
    expect(harness.source.play).toHaveBeenCalledOnce();

    harness.controller.cancelGesture();
    expect(harness.source.pause).toHaveBeenCalledOnce();
    expect(harness.source.currentTime).toBe(0);
    expect(harness.source.volume).toBe(1);
    expect(harness.source.muted).toBe(false);
    expect(harness.statuses.at(-1)).toBe('ready');
  });

  it('makes audio audible once when the hold completes without duplicate playback', async () => {
    const harness = createAudioHarness();

    harness.controller.beginGesture();
    await Promise.resolve();
    harness.controller.completeReveal();

    expect(harness.source.volume).toBe(1);
    expect(harness.source.muted).toBe(false);
    expect(harness.source.play).toHaveBeenCalledOnce();
    expect(harness.statuses.at(-1)).toBe('playing');
  });

  it('stops and rewinds audio when the recipient restarts the experience', async () => {
    const harness = createAudioHarness();

    harness.controller.beginGesture();
    await Promise.resolve();
    harness.controller.completeReveal();
    harness.source.currentTime = 18;
    harness.controller.resetReveal();

    expect(harness.source.pause).toHaveBeenCalledOnce();
    expect(harness.source.currentTime).toBe(0);
    expect(harness.statuses.at(-1)).toBe('ready');
  });

  it('never creates or requests audio for a silent gift', () => {
    const harness = createAudioHarness(false);

    harness.controller.beginGesture();
    harness.controller.completeReveal();

    expect(harness.createAudio).not.toHaveBeenCalled();
  });
});
