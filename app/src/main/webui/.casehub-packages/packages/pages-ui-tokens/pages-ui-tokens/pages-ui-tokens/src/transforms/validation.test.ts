import { describe, it, expect } from 'vitest';
import { contrastCheck } from './contrast-check.js';
import { gamutClamp } from './gamut-clamp.js';
import type { TokenMap, TokenLeaf } from '../types.js';

describe('contrastCheck', () => {
  const goodTokens: TokenMap = {
    neutral: {
      '1': { $value: 'oklch(8% 0.002 260)', $type: 'color' },
      '8': { $value: 'oklch(47% 0.009 260)', $type: 'color' },
      '11': { $value: 'oklch(78% 0.012 260)', $type: 'color' },
      '12': { $value: 'oklch(93% 0.014 260)', $type: 'color' },
    },
    accent: { '9': { $value: 'oklch(55% 0.120 245)', $type: 'color' } },
    role: {
      'text-primary': { $value: 'var(--pages-neutral-12)', $type: 'color' },
      'text-secondary': { $value: 'var(--pages-neutral-11)', $type: 'color' },
      'text-muted': { $value: 'var(--pages-neutral-8)', $type: 'color' },
      'surface-primary': { $value: 'var(--pages-neutral-1)', $type: 'color' },
      'interactive': { $value: 'var(--pages-accent-9)', $type: 'color' },
    },
  };

  it('passes when contrast is sufficient', () => {
    expect(() => contrastCheck(goodTokens, { minContrast: 30 })).not.toThrow();
  });

  it('throws on violations when fix=false', () => {
    const lowContrast: TokenMap = {
      neutral: {
        '1': { $value: 'oklch(50% 0.002 260)', $type: 'color' },
        '8': { $value: 'oklch(52% 0.009 260)', $type: 'color' },
      },
      role: {
        'text-muted': { $value: 'var(--pages-neutral-8)', $type: 'color' },
        'surface-primary': { $value: 'var(--pages-neutral-1)', $type: 'color' },
      },
    };
    expect(() => contrastCheck(lowContrast, { minContrast: 60 })).toThrow(/Contrast/);
  });

  it('does not throw when fix=true', () => {
    const lowContrast: TokenMap = {
      neutral: {
        '1': { $value: 'oklch(50% 0.002 260)', $type: 'color' },
        '8': { $value: 'oklch(52% 0.009 260)', $type: 'color' },
      },
      role: {
        'text-muted': { $value: 'var(--pages-neutral-8)', $type: 'color' },
        'surface-primary': { $value: 'var(--pages-neutral-1)', $type: 'color' },
      },
    };
    expect(() => contrastCheck(lowContrast, { minContrast: 60, fix: true })).not.toThrow();
  });

  it('returns tokens unchanged when no role tokens present', () => {
    const noRoles: TokenMap = { neutral: { '1': { $value: 'oklch(8% 0.002 260)', $type: 'color' } } };
    expect(contrastCheck(noRoles, {})).toEqual(noRoles);
  });
});

describe('gamutClamp', () => {
  it('passes through in-gamut values unchanged', () => {
    const tokens: TokenMap = {
      accent: { '6': { $value: 'oklch(50.0% 0.100 245)', $type: 'color' } },
    };
    const result = gamutClamp(tokens, {});
    expect(((result['accent'] as TokenMap)['6'] as TokenLeaf).$value).toBe('oklch(50.0% 0.100 245)');
  });

  it('reduces chroma for out-of-gamut values', () => {
    const tokens: TokenMap = {
      accent: { '6': { $value: 'oklch(50.0% 0.500 245)', $type: 'color' } },
    };
    const result = gamutClamp(tokens, {});
    const clamped = ((result['accent'] as TokenMap)['6'] as TokenLeaf).$value;
    const chroma = parseFloat(clamped.match(/oklch\(\d+\.?\d*% (\d+\.?\d*)/)![1]!);
    expect(chroma).toBeLessThan(0.5);
    expect(chroma).toBeGreaterThan(0);
  });

  it('preserves lightness and hue during clamping', () => {
    const tokens: TokenMap = {
      accent: { '6': { $value: 'oklch(50.0% 0.500 245)', $type: 'color' } },
    };
    const result = gamutClamp(tokens, {});
    const clamped = ((result['accent'] as TokenMap)['6'] as TokenLeaf).$value;
    expect(clamped).toMatch(/^oklch\(50\.0%/);
    expect(clamped).toMatch(/245\)$/);
  });

  it('preserves non-colour tokens', () => {
    const tokens: TokenMap = { spacing: { '1': { $value: '4px', $type: 'dimension' } } };
    const result = gamutClamp(tokens, {});
    expect(result).toEqual(tokens);
  });

  it('skips metadata keys', () => {
    const tokens: TokenMap = { $mode: { $value: 'dark', $type: 'meta' } };
    const result = gamutClamp(tokens, {});
    expect(result).toEqual(tokens);
  });

  it('handles values with alpha (non-matching format) gracefully', () => {
    const tokens: TokenMap = {
      surface: { '1': { $value: 'oklch(0% 0 0 / 0.04)', $type: 'color' } },
    };
    const result = gamutClamp(tokens, {});
    expect(((result['surface'] as TokenMap)['1'] as TokenLeaf).$value).toBe('oklch(0% 0 0 / 0.04)');
  });
});
