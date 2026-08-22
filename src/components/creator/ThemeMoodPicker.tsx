import type { ThemeId } from '../../models/giftConfig';

export interface ThemeMood {
  id: ThemeId;
  label: string;
  mood: string;
  style: string;
  intensity: string;
}

export const themeMoods: ThemeMood[] = [
  { id: 'rose', label: 'Rosa vino', mood: 'Romántico', style: 'Papel cálido y acentos de vino', intensity: 'Íntimo' },
  { id: 'midnight', label: 'Medianoche', mood: 'Nocturno', style: 'Contraste profundo y luz suave', intensity: 'Envolvente' },
  { id: 'sage', label: 'Salvia', mood: 'Botánico', style: 'Calma natural y tonos serenos', intensity: 'Sereno' },
  { id: 'sunset', label: 'Atardecer', mood: 'Cálido', style: 'Terracota, crema y presencia solar', intensity: 'Expresivo' },
];

export function getThemeMood(theme: ThemeId): ThemeMood {
  return themeMoods.find((option) => option.id === theme) ?? themeMoods[0];
}

interface ThemeMoodPickerProps {
  value: ThemeId;
  onChange: (theme: ThemeId) => void;
}

export function ThemeMoodPicker({ value, onChange }: ThemeMoodPickerProps) {
  return (
    <div className="theme-mood-picker" role="group" aria-label="Atmósfera del regalo">
      {themeMoods.map((theme) => {
        const isSelected = value === theme.id;

        return (
          <button
            key={theme.id}
            type="button"
            className={`theme-choice theme-swatch-${theme.id} ${isSelected ? 'selected' : ''}`}
            aria-pressed={isSelected}
            onClick={() => onChange(theme.id)}
          >
            <span className="theme-choice-art" aria-hidden="true"><i /></span>
            <span className="theme-choice-copy">
              <strong>{theme.label}</strong>
              <small>{theme.style}</small>
            </span>
            <span className="theme-choice-state">
              <em>{theme.mood}</em>
              <small>{isSelected ? 'Elegido' : theme.intensity}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}
