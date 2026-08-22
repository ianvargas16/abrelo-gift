import { describe, expect, it, vi } from 'vitest';
import { createAtmospherePlayer, getAtmosphereVoices } from './atmospherePlayer';

function createAudioContextHarness() {
  const gainNodes: Array<{ gain: { value: number }; connect: ReturnType<typeof vi.fn> }> = [];
  const oscillators: Array<{
    type: OscillatorType;
    frequency: { value: number };
    connect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }> = [];
  const context = {
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(() => {
      const gain = { gain: { value: 0 }, connect: vi.fn() };
      gainNodes.push(gain);
      return gain;
    }),
    createOscillator: vi.fn(() => {
      const oscillator = {
        type: 'sine' as OscillatorType,
        frequency: { value: 0 },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      oscillators.push(oscillator);
      return oscillator;
    }),
  };

  return { context, gainNodes, oscillators };
}

describe('atmosphere player', () => {
  it('keeps each soundscape intentionally small', () => {
    expect(getAtmosphereVoices('soft')).toHaveLength(1);
    expect(getAtmosphereVoices('celebration')).toHaveLength(2);
    expect(getAtmosphereVoices('romantic')).toHaveLength(2);
  });

  it('does not create browser audio until Runtime explicitly activates it', async () => {
    const harness = createAudioContextHarness();
    const createContext = vi.fn(() => harness.context as unknown as AudioContext);
    const player = createAtmospherePlayer('soft', createContext);

    expect(createContext).not.toHaveBeenCalled();

    await player.start();

    expect(createContext).toHaveBeenCalledOnce();
    expect(harness.context.resume).toHaveBeenCalledOnce();
    expect(harness.oscillators).toHaveLength(1);
    expect(harness.oscillators[0].start).toHaveBeenCalledOnce();
  });

  it('mutes the active layer and releases browser audio on disposal', async () => {
    const harness = createAudioContextHarness();
    const player = createAtmospherePlayer('romantic', () => harness.context as unknown as AudioContext);

    await player.start();
    player.setMuted(true);
    expect(harness.gainNodes[0].gain.value).toBe(0);

    player.dispose();
    expect(harness.oscillators.every((oscillator) => oscillator.stop.mock.calls.length === 1)).toBe(true);
    expect(harness.context.close).toHaveBeenCalledOnce();
  });
});
