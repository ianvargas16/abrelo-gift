import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { defaultGift } from '../../config/defaultGift';
import type { GiftProject } from '../../projects/giftProject';
import { resolveTheme } from '../../themes/themeRegistry';
import { GiftEditor } from './GiftEditor';

function renderEditor(theme: 'rose' | 'midnight' | 'sage' | 'sunset') {
  const gift = { ...defaultGift, theme };
  const project: GiftProject = {
    id: 'project-theme-test',
    name: 'Regalo de prueba',
    gift,
    createdAt: '2026-08-27T12:00:00.000Z',
    updatedAt: '2026-08-27T12:00:00.000Z',
  };

  return renderToStaticMarkup(
    <GiftEditor
      gift={gift}
      project={project}
      projects={[project]}
      storageError=""
      backgroundImageFile={null}
      backgroundImagePreviewUrl=""
      onBackgroundImageChange={vi.fn()}
      publication={null}
      onChange={vi.fn()}
      onPreview={vi.fn()}
      onReset={vi.fn()}
      onExport={vi.fn()}
      onImport={vi.fn()}
      onPublicationChange={vi.fn()}
      onCreateProject={vi.fn()}
      onSelectProject={vi.fn()}
      onRenameProject={vi.fn()}
      onDuplicateProject={vi.fn()}
      onDeleteProject={vi.fn()}
    />,
  );
}

describe('GiftEditor theme preview', () => {
  it('renders preview metadata and tokens from the selected registry definition', () => {
    const theme = resolveTheme('sage');
    const markup = renderEditor('sage');

    expect(markup).toContain(theme.className);
    expect(markup).toContain(theme.name);
    expect(markup).toContain(theme.description);
    expect(markup).toContain(`--color-page:${theme.tokens.page}`);
    expect(markup).toContain(`--color-paper:${theme.tokens.paper}`);
  });

  it('changes the preview definition when GiftConfig selects another theme', () => {
    const roseMarkup = renderEditor('rose');
    const midnight = resolveTheme('midnight');
    const midnightMarkup = renderEditor('midnight');

    expect(roseMarkup).toContain('theme-rose');
    expect(midnightMarkup).toContain(midnight.className);
    expect(midnightMarkup).toContain(`--color-accent:${midnight.tokens.accent}`);
    expect(midnightMarkup).not.toContain('--color-accent:#7f3656');
  });

  it('keeps identity, theme, and background controls in one personalization layer', () => {
    const file = new File(['background'], 'momento.webp', { type: 'image/webp' });
    const gift = {
      ...defaultGift,
      theme: 'sunset' as const,
      intro: { ...defaultGift.intro, title: 'Una tarde para recordar' },
      letter: { ...defaultGift.letter, message: 'Primera línea.\nUna segunda línea.' },
    };
    const project: GiftProject = {
      id: 'project-personalization-test',
      name: 'Regalo personalizado',
      gift,
      createdAt: '2026-08-27T12:00:00.000Z',
      updatedAt: '2026-08-27T12:00:00.000Z',
    };
    const markup = renderToStaticMarkup(
      <GiftEditor
        gift={gift}
        project={project}
        projects={[project]}
        storageError=""
        backgroundImageFile={file}
        backgroundImagePreviewUrl="blob:personalized-background"
        onBackgroundImageChange={vi.fn()}
        publication={null}
        onChange={vi.fn()}
        onPreview={vi.fn()}
        onReset={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onPublicationChange={vi.fn()}
        onCreateProject={vi.fn()}
        onSelectProject={vi.fn()}
        onRenameProject={vi.fn()}
        onDuplicateProject={vi.fn()}
        onDeleteProject={vi.fn()}
      />,
    );

    expect(markup).toContain('Personaliza tu regalo');
    expect(markup).toContain('value="Una tarde para recordar"');
    expect(markup).toContain('Primera línea.\nUna segunda línea.');
    expect(markup).toContain('Atardecer');
    expect(markup).toContain('Fondo del regalo');
    expect(markup).toContain('src="blob:personalized-background"');
    expect(markup.match(/Fondo del regalo/g)).toHaveLength(1);
  });
});
