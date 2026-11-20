import { describe, it, expect } from 'vitest';
import { generateScale } from './index.js';

describe('generateScale', () => {
  it('produces 12 steps keyed 1-12', () => {
    const scale = generateScale(250, 30, 0.5, false);
    expect(Object.keys(scale)).toEqual(
      Array.from({ length: 12 }, (_, i) => String(i + 1))
    );
  });

  it('step 1 is lightest in light mode', () => {
    const scale = generateScale(250, 30, 0.5, false);
    // OKLCH lightness: step 1 should have highest L value
    const l1 = parseLightness(scale['1']!);
    const l12 = parseLightness(scale['12']!);
    expect(l1).toBeGreaterThan(l12);
  });

  it('step 1 is darkest in dark mode', () => {
    const scale = generateScale(250, 30, 0.5, true);
    const l1 = parseLightness(scale['1']!);
    const l12 = parseLightness(scale['12']!);
    expect(l1).toBeLessThan(l12);
  });

  it('all values are valid CSS oklch() strings', () => {
    const scale = generateScale(250, 30, 0.5, false);
    for (const value of Object.values(scale)) {
      expect(value).toMatch(/^oklch\(\d+(\.\d+)?% \d+(\.\d+)? \d+(\.\d+)?\)$/);
    }
  });
});

function parseLightness(oklch: string): number {
  const match = oklch.match(/oklch\((\d+(?:\.\d+)?)%/);
  if (!match) throw new Error(`Invalid oklch: ${oklch}`);
  return Number(match[1]);
}
