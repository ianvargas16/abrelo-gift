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

  it('simplifies physical envelope drag settling without disabling the controls', () => {
    const reducedMotionRules = runtimeCss.slice(runtimeCss.indexOf('@media (prefers-reduced-motion: reduce)'));

    expect(reducedMotionRules).toContain('.envelope-flap');
    expect(reducedMotionRules).toContain('.letter-peek');
    expect(reducedMotionRules).toMatch(/transition:\s*none/u);
    expect(reducedMotionRules).not.toMatch(/\.physical-drag-surface\s*\{[^}]*display:\s*none/su);
  });
});

describe('Runtime physical drag presentation', () => {
  it('keeps live dragging direct and gives cancelled drags a soft return', () => {
    expect(runtimeCss).toMatch(/\.letter-peek\.is-dragging\s*\{[^}]*transition-duration:\s*0ms/su);
    expect(runtimeCss).toMatch(/\.card-pull-cue\s*\{[^}]*white-space:\s*nowrap/su);
    expect(runtimeCss).toMatch(/\.card-pull-cue\s*\{[^}]*font-size:\s*0\.48rem/su);
    expect(runtimeCss).toMatch(/\.letter-peek\.is-settling\s*\{[^}]*var\(--ease-spring\)/su);
  });
});
