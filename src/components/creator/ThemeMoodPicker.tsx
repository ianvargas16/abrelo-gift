import type { CSSProperties } from 'react';
import { themeDefinitions, type ThemeId } from '../../themes/themeRegistry';

interface ThemeMoodPickerProps {
  value: ThemeId;
  onChange: (theme: ThemeId) => void;
}

export function ThemeMoodPicker({ value, onChange }: ThemeMoodPickerProps) {
  return (
    <div className="theme-mood-picker" role="group" aria-label="Atmósfera del regalo">
      {themeDefinitions.map((theme) => {
        const isSelected = value === theme.id;

        return (
          <button
            key={theme.id}
            type="button"
            className={`theme-choice ${isSelected ? 'selected' : ''}`}
            style={{ '--swatch': theme.tokens.accent } as CSSProperties}
            aria-pressed={isSelected}
            onClick={() => onChange(theme.id)}
          >
            <span className="theme-choice-art" aria-hidden="true"><i /></span>
            <span className="theme-choice-copy">
              <strong>{theme.name}</strong>
              <small>{theme.description}</small>
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
