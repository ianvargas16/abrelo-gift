import { describe, expect, it, vi } from 'vitest';
import { createAtmospherePlayer, getAtmosphereTrack } from './atmospherePlayer';

function createAudioHarness() {
  let now = 0;
  let nextFrameId = 1;
  const frames = new Map<number, FrameRequestCallback>();
  const audio = {
    currentTime: 0,
    loop: false,
    pause: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    preload: 'none' as const,
    volume: 1,
  };

  return {
    audio,
    scheduler: {
      now: () => now,
      requestFrame: (callback: FrameRequestCallback) => {
        const frame = nextFrameId++;
        frames.set(frame, callback);
        return frame;
      },
      cancelFrame: (frame: number) => frames.delete(frame),
    },
    advance(milliseconds: number) {
      now += milliseconds;
      const pendingFrames = [...frames.values()];
      frames.clear();
      pendingFrames.forEach((callback) => callback(now));
    },
  };
}

describe('atmosphere player', () => {
  it('maps every configured atmosphere to a bundled local audio asset', () => {
    expect(getAtmosphereTrack('soft')).toContain('soft-atmosphere');
    expect(getAtmosphereTrack('celebration')).toContain('celebration-atmosphere');
    expect(getAtmosphereTrack('romantic')).toContain('romantic-atmosphere');
  });

  it('does not create or load audio until Runtime explicitly activates it', async () => {
    const harness = createAudioHarness();
    const createAudio = vi.fn(() => harness.audio);
    const player = createAtmospherePlayer('soft', createAudio, harness.scheduler);

    expect(createAudio).not.toHaveBeenCalled();

    await player.start();

    expect(createAudio).toHaveBeenCalledOnce();
    expect(harness.audio.loop).toBe(true);
    expect(harness.audio.preload).toBe('auto');
    expect(harness.audio.play).toHaveBeenCalledOnce();
    expect(harness.audio.volume).toBe(0);

    harness.advance(900);
    expect(harness.audio.volume).toBeCloseTo(0.38);
  });

  it('fades out and pauses the active track when muted', async () => {
    const harness = createAudioHarness();
    const player = createAtmospherePlayer('romantic', () => harness.audio, harness.scheduler);

    await player.start();
    harness.advance(900);
    player.setMuted(true);
    harness.advance(180);

    expect(harness.audio.volume).toBe(0);
    expect(harness.audio.pause).toHaveBeenCalledOnce();
  });

  it('stops and rewinds the local track on disposal', async () => {
    const harness = createAudioHarness();
    const player = createAtmospherePlayer('celebration', () => harness.audio, harness.scheduler);

    await player.start();
    harness.audio.currentTime = 12;
    player.dispose();

    expect(harness.audio.pause).toHaveBeenCalledOnce();
    expect(harness.audio.currentTime).toBe(0);
  });
});
