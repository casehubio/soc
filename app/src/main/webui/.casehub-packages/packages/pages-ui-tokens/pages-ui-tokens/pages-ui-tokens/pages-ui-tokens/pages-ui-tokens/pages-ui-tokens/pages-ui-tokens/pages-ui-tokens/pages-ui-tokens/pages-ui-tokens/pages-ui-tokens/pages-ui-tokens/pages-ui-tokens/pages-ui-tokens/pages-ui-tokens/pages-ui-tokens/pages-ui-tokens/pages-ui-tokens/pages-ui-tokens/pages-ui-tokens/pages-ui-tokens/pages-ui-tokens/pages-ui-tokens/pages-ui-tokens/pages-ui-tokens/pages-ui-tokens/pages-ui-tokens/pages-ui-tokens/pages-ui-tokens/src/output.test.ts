import { describe, it, expect } from 'vitest';
import { generateCSS, generateDTCG, generateDensityCSS } from './output.js';
import type { TokenMap } from './types.js';

const sampleTokens: TokenMap = {
  accent: {
    '1': { $value: 'oklch(98.5% 0.036 245)', $type: 'color' },
    '2': { $value: 'oklch(96.0% 0.072 245)', $type: 'color' },
  },
  shadow: {
    '1': { $value: '0 1px 2px oklch(0% 0 0 / 0.05)', $type: 'shadow' },
  },
  spacing: {
    '1': { $value: '4px', $type: 'dimension' },
    '0-5': { $value: '2px', $type: 'dimension' },
  },
  'font-family': { $value: "'Inter', system-ui", $type: 'fontFamily' },
  radius: {
    'sm': { $value: '4px', $type: 'dimension' },
  },
  $mode: { $value: 'dark', $type: 'meta' },
};

describe('generateCSS', () => {
  it('scopes under .pages-theme-{name}', () => {
    const css = generateCSS(sampleTokens, 'casehub-dark');
    expect(css).toContain('.pages-theme-casehub-dark {');
    expect(css).toMatch(/\}$/);
  });

  it('generates --pages- prefixed custom properties for colour scales', () => {
    const css = generateCSS(sampleTokens, 'test');
    expect(css).toContain('--pages-accent-1: oklch(98.5% 0.036 245);');
    expect(css).toContain('--pages-accent-2: oklch(96.0% 0.072 245);');
  });

  it('generates shadow tokens', () => {
    const css = generateCSS(sampleTokens, 'test');
    expect(css).toContain('--pages-shadow-1:');
  });

  it('generates spacing tokens with space- prefix', () => {
    const css = generateCSS(sampleTokens, 'test');
    expect(css).toContain('--pages-space-1: 4px;');
    expect(css).toContain('--pages-space-0-5: 2px;');
  });

  it('generates font-family as flat token', () => {
    const css = generateCSS(sampleTokens, 'test');
    expect(css).toContain("--pages-font-family: 'Inter', system-ui;");
  });

  it('generates radius tokens', () => {
    const css = generateCSS(sampleTokens, 'test');
    expect(css).toContain('--pages-radius-sm: 4px;');
  });

  it('skips $-prefixed metadata keys', () => {
    const css = generateCSS(sampleTokens, 'test');
    expect(css).not.toContain('$mode');
    expect(css).not.toContain('meta');
  });
});

describe('generateDTCG', () => {
  it('includes $name in output', () => {
    const dtcg = generateDTCG(sampleTokens, 'casehub-dark');
    expect(dtcg['$name']).toBe('casehub-dark');
  });

  it('preserves token groups with $value and $type', () => {
    const dtcg = generateDTCG(sampleTokens, 'test');
    const accent = dtcg['accent'] as Record<string, unknown>;
    expect(accent['1']).toEqual({ $value: 'oklch(98.5% 0.036 245)', $type: 'color' });
  });

  it('excludes $-prefixed metadata', () => {
    const dtcg = generateDTCG(sampleTokens, 'test');
    expect(dtcg['$mode']).toBeUndefined();
  });
});

describe('generateDensityCSS', () => {
  it('generates .pages-density-compact class', () => {
    const css = generateDensityCSS();
    expect(css).toContain('.pages-density-compact {');
  });

  it('contains compact spacing overrides', () => {
    const css = generateDensityCSS();
    expect(css).toContain('--pages-space-1: 3px;');
  });

  it('contains compact font overrides', () => {
    const css = generateDensityCSS();
    expect(css).toContain('--pages-font-size-base: 13px;');
  });
});
