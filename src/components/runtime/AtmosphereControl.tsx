interface AtmosphereControlProps {
  isMuted: boolean;
  onToggle: () => void;
}

export function AtmosphereControl({ isMuted, onToggle }: AtmosphereControlProps) {
  return (
    <button
      type="button"
      className="atmosphere-control"
      aria-pressed={isMuted}
      aria-label={isMuted ? 'Activar sonido ambiental' : 'Silenciar sonido ambiental'}
      onClick={onToggle}
    >
      <span aria-hidden="true">{isMuted ? '◌' : '◍'}</span>
      {isMuted ? 'Sonido apagado' : 'Sonido activo'}
    </button>
  );
}
