import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const creatorCss = readFileSync(new URL('../../styles/creator.css', import.meta.url), 'utf8');

describe('CreatorDialog presentation', () => {
  it('keeps headings in normal flow while the reusable close control remains visible', () => {
    expect(creatorCss).toMatch(/\.creator-dialog-heading\s*\{[^}]*position:\s*relative/su);
    expect(creatorCss).toMatch(/\.creator-dialog-close\s*\{[^}]*position:\s*sticky/su);
    expect(creatorCss).not.toContain('.creator-dialog-heading::before');
  });
});
