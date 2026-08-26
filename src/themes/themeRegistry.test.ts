import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME_ID,
  getThemeCssVariables,
  resolveTheme,
  resolveThemeId,
  THEME_IDS,
  themeDefinitions,
} from './themeRegistry';

describe('theme registry', () => {
  it('defines every persisted ThemeId once with complete metadata and visual tokens', () => {
    expect(themeDefinitions.map((theme) => theme.id)).toEqual(THEME_IDS);
    expect(new Set(themeDefinitions.map((theme) => theme.id)).size).toBe(THEME_IDS.length);

    for (const theme of themeDefinitions) {
      expect(theme.name).not.toBe('');
      expect(theme.description).not.toBe('');
      expect(theme.mood).not.toBe('');
      expect(theme.intensity).not.toBe('');
      expect(theme.className).toBe(`theme-${theme.id}`);
      expect(Object.values(theme.tokens).every(Boolean)).toBe(true);
      expect(getThemeCssVariables(theme)).toMatchObject({
        '--color-page': theme.tokens.page,
        '--color-paper': theme.tokens.paper,
        '--color-paper-ink': theme.tokens.paperInk,
        '--color-accent': theme.tokens.accent,
        '--theme-glow': theme.tokens.glow,
      });
    }
  });

  it('resolves known themes and safely falls back for unknown or missing values', () => {
    expect(resolveTheme('sage').id).toBe('sage');
    expect(resolveThemeId('old-theme')).toBe(DEFAULT_THEME_ID);
    expect(resolveTheme('old-theme')).toBe(resolveTheme(DEFAULT_THEME_ID));
    expect(resolveTheme(undefined).id).toBe(DEFAULT_THEME_ID);
  });

  it('returns the same definition to every visual consumer', () => {
    const creatorDefinition = resolveTheme('midnight');
    const runtimeDefinition = resolveTheme('midnight');

    expect(runtimeDefinition).toBe(creatorDefinition);
    expect(getThemeCssVariables(runtimeDefinition)).toEqual(getThemeCssVariables(creatorDefinition));
  });
});
