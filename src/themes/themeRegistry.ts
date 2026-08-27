export const THEME_IDS = ['rose', 'midnight', 'sage', 'sunset'] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME_ID: ThemeId = 'rose';

export interface ThemeVisualTokens {
  page: string;
  surface: string;
  elevatedSurface: string;
  paper: string;
  secondaryPaper: string;
  pageInk: string;
  mutedPageInk: string;
  subtlePageInk: string;
  paperInk: string;
  mutedPaperInk: string;
  subtlePaperInk: string;
  border: string;
  accent: string;
  strongAccent: string;
  focus: string;
  glow: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  mood: string;
  intensity: string;
  className: `theme-${ThemeId}`;
  tokens: ThemeVisualTokens;
}

export const themeDefinitions: readonly ThemeDefinition[] = [
  {
    id: 'rose',
    name: 'Rosa vino',
    description: 'Papel cálido y acentos de vino para una sorpresa íntima.',
    mood: 'Romántico',
    intensity: 'Íntimo',
    className: 'theme-rose',
    tokens: {
      page: '#efe6df',
      surface: 'rgba(255, 251, 247, 0.74)',
      elevatedSurface: 'rgba(255, 251, 247, 0.88)',
      paper: '#f8f1ea',
      secondaryPaper: '#ead8cc',
      pageInk: '#261d21',
      mutedPageInk: '#675c61',
      subtlePageInk: '#9a8d91',
      paperInk: '#261d21',
      mutedPaperInk: '#675c61',
      subtlePaperInk: '#75686d',
      border: 'rgba(68, 45, 55, 0.14)',
      accent: '#7f3656',
      strongAccent: '#5d243f',
      focus: '#c58aa5',
      glow: 'rgba(127, 54, 86, 0.12)',
    },
  },
  {
    id: 'midnight',
    name: 'Medianoche',
    description: 'Contraste profundo y luz suave para una escena envolvente.',
    mood: 'Nocturno',
    intensity: 'Envolvente',
    className: 'theme-midnight',
    tokens: {
      page: '#171a24',
      surface: 'rgba(29, 33, 45, 0.74)',
      elevatedSurface: 'rgba(37, 42, 58, 0.9)',
      paper: '#eff1f5',
      secondaryPaper: '#d4d8e4',
      pageInk: '#eff2fb',
      mutedPageInk: '#bcc4da',
      subtlePageInk: '#8b93a8',
      paperInk: '#202536',
      mutedPaperInk: '#596174',
      subtlePaperInk: '#656d80',
      border: 'rgba(214, 223, 242, 0.12)',
      accent: '#8091d7',
      strongAccent: '#5667af',
      focus: '#9eb0f1',
      glow: 'rgba(128, 145, 215, 0.18)',
    },
  },
  {
    id: 'sage',
    name: 'Salvia',
    description: 'Verdes apagados y papel natural para un momento sereno.',
    mood: 'Botánico',
    intensity: 'Sereno',
    className: 'theme-sage',
    tokens: {
      page: '#ece9de',
      surface: 'rgba(249, 248, 242, 0.74)',
      elevatedSurface: 'rgba(250, 249, 244, 0.88)',
      paper: '#f7f4ec',
      secondaryPaper: '#dce0d1',
      pageInk: '#242a24',
      mutedPageInk: '#5f655e',
      subtlePageInk: '#8f968e',
      paperInk: '#242a24',
      mutedPaperInk: '#5f655e',
      subtlePaperInk: '#697068',
      border: 'rgba(55, 65, 56, 0.13)',
      accent: '#6d7f66',
      strongAccent: '#495641',
      focus: '#98aa92',
      glow: 'rgba(109, 127, 102, 0.12)',
    },
  },
  {
    id: 'sunset',
    name: 'Atardecer',
    description: 'Terracota y crema para una sorpresa cálida y expresiva.',
    mood: 'Cálido',
    intensity: 'Expresivo',
    className: 'theme-sunset',
    tokens: {
      page: '#efe3d5',
      surface: 'rgba(255, 250, 243, 0.74)',
      elevatedSurface: 'rgba(255, 250, 243, 0.9)',
      paper: '#fcf3e9',
      secondaryPaper: '#eccfb2',
      pageInk: '#2b211e',
      mutedPageInk: '#66554c',
      subtlePageInk: '#9b8778',
      paperInk: '#2b211e',
      mutedPaperInk: '#66554c',
      subtlePaperInk: '#786458',
      border: 'rgba(74, 52, 40, 0.12)',
      accent: '#b36244',
      strongAccent: '#874730',
      focus: '#cf8a69',
      glow: 'rgba(179, 98, 68, 0.14)',
    },
  },
];

const themesById = new Map(themeDefinitions.map((theme) => [theme.id, theme]));

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEME_IDS.includes(value as ThemeId);
}

export function resolveThemeId(value: unknown): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME_ID;
}

export function resolveTheme(value: unknown): ThemeDefinition {
  return themesById.get(resolveThemeId(value)) ?? themeDefinitions[0];
}

export function getThemeCssVariables(theme: ThemeDefinition): Record<`--${string}`, string> {
  return {
    '--color-page': theme.tokens.page,
    '--color-surface': theme.tokens.surface,
    '--color-surface-elevated': theme.tokens.elevatedSurface,
    '--color-paper': theme.tokens.paper,
    '--color-paper-secondary': theme.tokens.secondaryPaper,
    '--color-page-ink': theme.tokens.pageInk,
    '--color-page-ink-muted': theme.tokens.mutedPageInk,
    '--color-page-ink-subtle': theme.tokens.subtlePageInk,
    '--color-paper-ink': theme.tokens.paperInk,
    '--color-paper-ink-muted': theme.tokens.mutedPaperInk,
    '--color-paper-ink-subtle': theme.tokens.subtlePaperInk,
    '--color-ink': theme.tokens.pageInk,
    '--color-ink-muted': theme.tokens.mutedPageInk,
    '--color-ink-subtle': theme.tokens.subtlePageInk,
    '--color-border': theme.tokens.border,
    '--color-accent': theme.tokens.accent,
    '--color-accent-strong': theme.tokens.strongAccent,
    '--color-focus': theme.tokens.focus,
    '--theme-glow': theme.tokens.glow,
  };
}
