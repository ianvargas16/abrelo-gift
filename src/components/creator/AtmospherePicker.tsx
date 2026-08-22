import type { GiftAtmosphere } from '../../models/giftAtmosphere';

interface AtmosphereOption {
  id: GiftAtmosphere | 'silent';
  label: string;
  description: string;
  mark: string;
}

export const atmosphereOptions: AtmosphereOption[] = [
  { id: 'silent', label: 'Silencio', description: 'Solo papel, gestos y espera.', mark: '—' },
  { id: 'soft', label: 'Suave', description: 'Un fondo cálido y discreto.', mark: '≈' },
  { id: 'celebration', label: 'Celebración', description: 'Un brillo ligero para el momento.', mark: '✦' },
  { id: 'romantic', label: 'Romántico', description: 'Una capa íntima y envolvente.', mark: '♡' },
];

interface AtmospherePickerProps {
  value?: GiftAtmosphere;
  onChange: (atmosphere: GiftAtmosphere | undefined) => void;
}

export function getAtmosphereOption(atmosphere?: GiftAtmosphere) {
  return atmosphereOptions.find((option) => option.id === (atmosphere ?? 'silent')) ?? atmosphereOptions[0];
}

export function AtmospherePicker({ value, onChange }: AtmospherePickerProps) {
  const selectedId = value ?? 'silent';

  return (
    <div className="sound-atmosphere-picker" role="group" aria-label="Atmósfera sonora">
      {atmosphereOptions.map((option) => {
        const isSelected = option.id === selectedId;
        return (
          <button
            key={option.id}
            type="button"
            className={`sound-atmosphere-choice sound-atmosphere-${option.id} ${isSelected ? 'selected' : ''}`}
            aria-pressed={isSelected}
            onClick={() => onChange(option.id === 'silent' ? undefined : option.id)}
          >
            <span className="sound-atmosphere-mark" aria-hidden="true">{option.mark}</span>
            <span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}
