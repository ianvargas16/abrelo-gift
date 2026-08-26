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
});
