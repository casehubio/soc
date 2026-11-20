import { describe, it, expect } from 'vitest';
import { lightnessShift } from './lightness-shift.js';
import { lightnessSteps } from './lightness-steps.js';
import { chromaCurve } from './chroma-curve.js';
import { semanticHues } from './semantic-hues.js';
import { override } from './override.js';
import type { TokenMap, TokenLeaf } from '../types.js';

const baseTokens: TokenMap = {
  $mode: { $value: 'dark', $type: 'meta' },
  accent: {
    '1': { $value: 'oklch(8.0% 0.036 245)', $type: 'color' },
    '6': { $value: 'oklch(34.0% 0.120 245)', $type: 'color' },
    '12': { $value: 'oklch(93.0% 0.036 245)', $type: 'color' },
  },
  neutral: {
    '1': { $value: 'oklch(8.0% 0.018 220)', $type: 'color' },
    '6': { $value: 'oklch(34.0% 0.018 220)', $type: 'color' },
  },
  success: {
    '1': { $value: 'oklch(8.0% 0.120 145)', $type: 'color' },
    '6': { $value: 'oklch(34.0% 0.120 145)', $type: 'color' },
    '9': { $value: 'oklch(55.0% 0.120 145)', $type: 'color' },
  },
  spacing: { '1': { $value: '4px', $type: 'dimension' } },
};

describe('lightnessShift', () => {
  it('shifts lightness of all colour tokens by offset', () => {
    const result = lightnessShift(baseTokens, { offset: 10 });
    const step1 = ((result['accent'] as TokenMap)['1'] as TokenLeaf).$value;
    expect(step1).toBe('oklch(18.0% 0.036 245)');
  });

  it('clamps to 0-100 range', () => {
    const result = lightnessShift(baseTokens, { offset: -20 });
    const step1 = ((result['accent'] as TokenMap)['1'] as TokenLeaf).$value;
    const lightness = parseFloat(step1.match(/oklch\((\d+\.?\d*)%/)![1]!);
    expect(lightness).toBeGreaterThanOrEqual(0);
  });

  it('preserves non-colour tokens', () => {
    const result = lightnessShift(baseTokens, { offset: 10 });
    expect((result['spacing'] as TokenMap)['1']).toEqual({ $value: '4px', $type: 'dimension' });
  });

  it('is a no-op for offset=0', () => {
    const result = lightnessShift(baseTokens, { offset: 0 });
    expect(((result['accent'] as TokenMap)['1'] as TokenLeaf).$value).toBe('oklch(8.0% 0.036 245)');
  });

  it('preserves $mode metadata', () => {
    const result = lightnessShift(baseTokens, { offset: 5 });
    expect((result['$mode'] as TokenLeaf).$value).toBe('dark');
  });
});

describe('lightnessSteps', () => {
  it('replaces lightness values with provided steps', () => {
    const steps = [10, 15, 20, 25, 30, 40, 50, 55, 60, 70, 80, 95];
    const result = lightnessSteps(baseTokens, { steps });
    const step1 = ((result['accent'] as TokenMap)['1'] as TokenLeaf).$value;
    expect(step1).toBe('oklch(10.0% 0.036 245)');
    const step6 = ((result['accent'] as TokenMap)['6'] as TokenLeaf).$value;
    expect(step6).toBe('oklch(40.0% 0.120 245)');
  });

  it('throws if steps array is not length 12', () => {
    expect(() => lightnessSteps(baseTokens, { steps: [1, 2, 3] })).toThrow(/12/);
  });

  it('preserves non-colour groups', () => {
    const steps = [10, 15, 20, 25, 30, 40, 50, 55, 60, 70, 80, 95];
    const result = lightnessSteps(baseTokens, { steps });
    expect((result['spacing'] as TokenMap)['1']).toEqual({ $value: '4px', $type: 'dimension' });
  });
});

describe('chromaCurve', () => {
  it('applies per-hue multiplier', () => {
    const result = chromaCurve(baseTokens, { curve: 'flat', neutral: 0.5 });
    const neutral6 = ((result['neutral'] as TokenMap)['6'] as TokenLeaf).$value;
    const chroma = parseFloat(neutral6.match(/oklch\(\d+\.?\d*% (\d+\.?\d*)/)![1]!);
    expect(chroma).toBeCloseTo(0.018 * 0.5, 4);
  });

  it('applies gaussian curve shape — extremes have lower chroma', () => {
    const result = chromaCurve(baseTokens, { curve: 'gaussian' });
    const step1 = ((result['accent'] as TokenMap)['1'] as TokenLeaf).$value;
    const step6 = ((result['accent'] as TokenMap)['6'] as TokenLeaf).$value;
    const chroma1 = parseFloat(step1.match(/oklch\(\d+\.?\d*% (\d+\.?\d*)/)![1]!);
    const chroma6 = parseFloat(step6.match(/oklch\(\d+\.?\d*% (\d+\.?\d*)/)![1]!);
    expect(chroma1).toBeLessThan(chroma6);
  });

  it('applies bezier curve shape', () => {
    const result = chromaCurve(baseTokens, { curve: 'bezier' });
    const step1 = ((result['accent'] as TokenMap)['1'] as TokenLeaf).$value;
    const step6 = ((result['accent'] as TokenMap)['6'] as TokenLeaf).$value;
    const chroma1 = parseFloat(step1.match(/oklch\(\d+\.?\d*% (\d+\.?\d*)/)![1]!);
    const chroma6 = parseFloat(step6.match(/oklch\(\d+\.?\d*% (\d+\.?\d*)/)![1]!);
    expect(chroma1).toBeLessThan(chroma6);
  });

  it('flat curve preserves original chroma when multiplier is 1', () => {
    const result = chromaCurve(baseTokens, { curve: 'flat' });
    const step6 = ((result['accent'] as TokenMap)['6'] as TokenLeaf).$value;
    const chroma = parseFloat(step6.match(/oklch\(\d+\.?\d*% (\d+\.?\d*)/)![1]!);
    expect(chroma).toBeCloseTo(0.120, 3);
  });
});

describe('semanticHues', () => {
  it('replaces success hue while preserving scale structure', () => {
    const result = semanticHues(baseTokens, { success: 175 });
    const step9 = ((result['success'] as TokenMap)['9'] as TokenLeaf).$value;
    expect(step9).toContain('175');
  });

  it('does not modify non-semantic hues', () => {
    const result = semanticHues(baseTokens, { success: 175 });
    expect(((result['accent'] as TokenMap)['1'] as TokenLeaf).$value).toBe('oklch(8.0% 0.036 245)');
  });

  it('ignores non-number params', () => {
    const result = semanticHues(baseTokens, { success: 'not-a-number' });
    expect(((result['success'] as TokenMap)['9'] as TokenLeaf).$value).toContain('145');
  });
});

describe('override', () => {
  it('overrides a specific token value', () => {
    const result = override(baseTokens, { 'accent.1': 'oklch(20% 0.05 240)' });
    expect(((result['accent'] as TokenMap)['1'] as TokenLeaf).$value).toBe('oklch(20% 0.05 240)');
  });

  it('creates group if not present', () => {
    const result = override(baseTokens, { 'brand.primary': 'oklch(50% 0.2 270)' });
    expect(((result['brand'] as TokenMap)['primary'] as TokenLeaf).$value).toBe('oklch(50% 0.2 270)');
  });

  it('preserves other tokens in the group', () => {
    const result = override(baseTokens, { 'accent.1': 'oklch(20% 0.05 240)' });
    expect(((result['accent'] as TokenMap)['6'] as TokenLeaf).$value).toBe('oklch(34.0% 0.120 245)');
  });
});
