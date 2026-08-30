import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const creatorCss = readFileSync(new URL('../../styles/creator.css', import.meta.url), 'utf8');
const dialogSource = readFileSync(new URL('./CreatorDialog.tsx', import.meta.url), 'utf8');

describe('CreatorDialog mobile flow', () => {
  it('keeps the heading in normal flow above dialog content', () => {
    expect(creatorCss).toMatch(/\.creator-dialog-heading\s*\{[^}]*position:\s*relative/su);
    expect(creatorCss).not.toMatch(/\.creator-dialog-heading\s*\{[^}]*position:\s*sticky/su);
  });

  it('keeps template scrolling inside the rounded dialog frame', () => {
    expect(dialogSource).toContain('className="creator-dialog-body"');
    expect(creatorCss).toMatch(/\.template-dialog\s*\{[^}]*overflow:\s*hidden/su);
    expect(creatorCss).toMatch(/\.template-dialog\s*>\s*\.creator-dialog-body\s*\{[^}]*overflow-y:\s*auto/su);
  });
});
