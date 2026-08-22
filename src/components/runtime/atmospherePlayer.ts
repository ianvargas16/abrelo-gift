import type { GiftAtmosphere } from '../../models/giftAtmosphere';

interface AtmosphereVoice {
  frequency: number;
  type: OscillatorType;
  gain: number;
}

const atmosphereVoices: Record<GiftAtmosphere, AtmosphereVoice[]> = {
  soft: [{ frequency: 174.61, type: 'sine', gain: 0.012 }],
  celebration: [
    { frequency: 392, type: 'triangle', gain: 0.01 },
    { frequency: 523.25, type: 'sine', gain: 0.008 },
  ],
  romantic: [
    { frequency: 196, type: 'sine', gain: 0.011 },
    { frequency: 293.66, type: 'sine', gain: 0.007 },
  ],
};

export function getAtmosphereVoices(atmosphere: GiftAtmosphere): readonly AtmosphereVoice[] {
  return atmosphereVoices[atmosphere];
}

export interface AtmospherePlayer {
  start: () => Promise<void>;
  setMuted: (muted: boolean) => void;
  dispose: () => void;
}

export function createAtmospherePlayer(
  atmosphere: GiftAtmosphere,
  createContext: () => AudioContext,
): AtmospherePlayer {
  let context: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let sources: OscillatorNode[] = [];
  let muted = false;

  const applyVolume = () => {
    if (masterGain) masterGain.gain.value = muted ? 0 : 1;
  };

  return {
    async start() {
      if (!context) {
        context = createContext();
        masterGain = context.createGain();
        masterGain.gain.value = 0;
        masterGain.connect(context.destination);
        sources = getAtmosphereVoices(atmosphere).map((voice) => {
          const source = context!.createOscillator();
          const voiceGain = context!.createGain();
          source.type = voice.type;
          source.frequency.value = voice.frequency;
          voiceGain.gain.value = voice.gain;
          source.connect(voiceGain);
          voiceGain.connect(masterGain!);
          source.start();
          return source;
        });
      }

      await context.resume();
      applyVolume();
    },
    setMuted(nextMuted) {
      muted = nextMuted;
      applyVolume();
    },
    dispose() {
      sources.forEach((source) => source.stop());
      sources = [];
      void context?.close();
      context = null;
      masterGain = null;
    },
  };
}

export function createBrowserAudioContext(): AudioContext {
  const browserWindow = window as Window & {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioContextConstructor = browserWindow.AudioContext ?? browserWindow.webkitAudioContext;

  if (!AudioContextConstructor) throw new Error('El navegador no admite audio ambiental.');
  return new AudioContextConstructor();
}
