import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const creatorCss = readFileSync(new URL('../../styles/creator.css', import.meta.url), 'utf8');

describe('CreatorDialog mobile flow', () => {
  it('keeps the heading in normal flow above dialog content', () => {
    expect(creatorCss).toMatch(/\.creator-dialog-heading\s*\{[^}]*position:\s*relative/su);
    expect(creatorCss).not.toMatch(/\.creator-dialog-heading\s*\{[^}]*position:\s*sticky/su);
  });
});
