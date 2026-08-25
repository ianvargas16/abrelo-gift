import type { GiftAudioStatus } from './useGiftAudio';

interface GiftAudioControlProps {
  status: GiftAudioStatus;
  onToggle: () => void;
}

export function getGiftAudioLabel(status: GiftAudioStatus): string {
  if (status === 'loading') return 'Cargando audio…';
  if (status === 'playing') return 'Reproduciendo…';
  if (status === 'paused') return 'Reanudar';
  if (status === 'error') return 'Reintentar audio';
  return 'Reproducir mensaje';
}

export function GiftAudioControl({ status, onToggle }: GiftAudioControlProps) {
  const isLoading = status === 'loading';
  const isPlaying = status === 'playing';
  const label = getGiftAudioLabel(status);

  return (
    <div className={`gift-audio-control is-${status}`} aria-live="polite">
      <span className="gift-audio-control-mark" aria-hidden="true">{isPlaying ? '◍' : '◌'}</span>
      <div>
        <small>Audio especial</small>
        <strong>{label}</strong>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={isLoading}
        aria-label={isPlaying ? 'Pausar mensaje' : label}
      >
        {isPlaying ? 'Pausar' : isLoading ? 'Cargando' : 'Escuchar'}
      </button>
    </div>
  );
}
