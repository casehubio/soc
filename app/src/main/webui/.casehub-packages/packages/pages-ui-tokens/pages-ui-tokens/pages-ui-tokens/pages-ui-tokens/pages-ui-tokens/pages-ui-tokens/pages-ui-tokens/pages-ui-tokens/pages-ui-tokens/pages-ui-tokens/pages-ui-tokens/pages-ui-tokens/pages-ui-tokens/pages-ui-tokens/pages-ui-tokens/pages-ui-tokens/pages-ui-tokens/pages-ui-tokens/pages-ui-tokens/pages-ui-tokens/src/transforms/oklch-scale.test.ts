import { describe, it, expect } from 'vitest';
import { oklchScale } from './oklch-scale.js';
import type { TokenMap, TokenLeaf } from '../types.js';
import { isTokenLeaf } from '../types.js';

describe('oklch-scale transform', () => {
  const lightTokens: TokenMap = { $mode: { $value: 'light', $type: 'meta' } };
  const darkTokens: TokenMap = { $mode: { $value: 'dark', $type: 'meta' } };

  it('generates 12-step scale for each hue', () => {
    const result = oklchScale(lightTokens, { hues: { accent: 245 } });
    const accent = result['accent'] as TokenMap;
    for (let i = 1; i <= 12; i++) {
      expect(isTokenLeaf(accent[String(i)]), `step ${i} should be TokenLeaf`).toBe(true);
    }
  });

  it('generates multiple hue scales', () => {
    const result = oklchScale(lightTokens, { hues: { accent: 245, info: 210, success: 145 } });
    expect(result['accent']).toBeDefined();
    expect(result['info']).toBeDefined();
    expect(result['success']).toBeDefined();
  });

  it('applies 0.15 chroma multiplier for neutral', () => {
    const result = oklchScale(lightTokens, { hues: { neutral: 220 }, chroma: 0.12 });
    const neutral = result['neutral'] as TokenMap;
    const step6 = (neutral['6'] as TokenLeaf).$value;
    const chroma = parseFloat(step6.match(/oklch\(\d+\.\d+% (\d+\.\d+)/)![1]!);
    expect(chroma).toBeCloseTo(0.018, 3);
  });

  it('uses light steps when $mode is light', () => {
    const result = oklchScale(lightTokens, { hues: { accent: 245 } });
    const step1 = ((result['accent'] as TokenMap)['1'] as TokenLeaf).$value;
    const lightness = parseFloat(step1.match(/oklch\((\d+\.\d+)%/)![1]!);
    expect(lightness).toBeGreaterThan(97);
  });

  it('uses dark steps when $mode is dark', () => {
    const result = oklchScale(darkTokens, { hues: { accent: 245 } });
    const step1 = ((result['accent'] as TokenMap)['1'] as TokenLeaf).$value;
    const lightness = parseFloat(step1.match(/oklch\((\d+\.\d+)%/)![1]!);
    expect(lightness).toBeLessThan(10);
  });

  it('is additive — preserves existing tokens', () => {
    const existing: TokenMap = { ...lightTokens, existing: { $value: 'keep', $type: 'test' } };
    const result = oklchScale(existing, { hues: { accent: 245 } });
    expect(result['existing']).toEqual({ $value: 'keep', $type: 'test' });
  });

  it('defaults to light mode when $mode absent', () => {
    const result = oklchScale({}, { hues: { accent: 245 } });
    const step1 = ((result['accent'] as TokenMap)['1'] as TokenLeaf).$value;
    const lightness = parseFloat(step1.match(/oklch\((\d+\.\d+)%/)![1]!);
    expect(lightness).toBeGreaterThan(97);
  });

  it('returns tokens unchanged when no hues param', () => {
    const result = oklchScale(lightTokens, {});
    expect(result).toEqual(lightTokens);
  });
});
