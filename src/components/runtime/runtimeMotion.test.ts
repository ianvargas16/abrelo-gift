import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const runtimeCss = readFileSync(new URL('../../styles/runtime.css', import.meta.url), 'utf8');

describe('Runtime reduced motion presentation', () => {
  it('removes memory story transitions when reduced motion is requested', () => {
    const reducedMotionRules = runtimeCss.slice(runtimeCss.indexOf('@media (prefers-reduced-motion: reduce)'));

    expect(reducedMotionRules).toContain('.memory-story');
    expect(reducedMotionRules).toContain('.memory-story-moment');
    expect(reducedMotionRules).toContain('.memory-story-ending');
    expect(reducedMotionRules).toMatch(/animation:\s*none/u);
    expect(reducedMotionRules).toMatch(/transition:\s*none/u);
  });
});
