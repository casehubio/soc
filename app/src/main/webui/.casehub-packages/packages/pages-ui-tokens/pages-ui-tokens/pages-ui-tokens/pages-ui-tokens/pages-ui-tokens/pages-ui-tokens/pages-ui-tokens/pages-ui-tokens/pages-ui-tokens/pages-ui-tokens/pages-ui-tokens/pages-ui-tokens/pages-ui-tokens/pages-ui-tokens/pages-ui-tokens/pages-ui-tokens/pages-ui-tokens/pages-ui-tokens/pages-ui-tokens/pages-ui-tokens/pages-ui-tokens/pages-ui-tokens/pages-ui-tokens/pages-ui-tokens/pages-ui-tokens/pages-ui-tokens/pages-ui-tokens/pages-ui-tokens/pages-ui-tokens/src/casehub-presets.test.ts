import { describe, it, expect, beforeAll } from 'vitest';
import { runPipeline } from './pipeline.js';
import { generateCSS } from './output.js';
import { initPresets } from './transforms/index.js';
import { getBuiltinPreset } from './preset-loader.js';
import type { TokenMap, TokenLeaf } from './types.js';

describe('casehub-dark preset', () => {
  beforeAll(() => { initPresets(); });

  it('resolves from built-in registry', () => {
    expect(getBuiltinPreset('casehub-dark')).toBeDefined();
  });

  it('extends default-dark', () => {
    expect(getBuiltinPreset('casehub-dark')?.$extends).toBe('default-dark');
  });

  it('generates brand hue scales (violet, green, magenta)', () => {
    const tokens = runPipeline(getBuiltinPreset('casehub-dark')!);
    expect(tokens['violet']).toBeDefined();
    expect(tokens['green']).toBeDefined();
    expect(tokens['magenta']).toBeDefined();
  });

  it('preserves parent hues alongside brand hues ($extends is additive)', () => {
    const tokens = runPipeline(getBuiltinPreset('casehub-dark')!);
    expect(tokens['accent']).toBeDefined();
    expect(tokens['neutral']).toBeDefined();
    expect(tokens['success']).toBeDefined();
    expect(tokens['warning']).toBeDefined();
    expect(tokens['danger']).toBeDefined();
    expect(tokens['info']).toBeDefined();
    expect(tokens['violet']).toBeDefined();
    expect(tokens['green']).toBeDefined();
    expect(tokens['magenta']).toBeDefined();
  });

  it('produces near-achromatic neutrals', () => {
    const tokens = runPipeline(getBuiltinPreset('casehub-dark')!);
    const neutral6 = ((tokens['neutral'] as TokenMap)['6'] as TokenLeaf).$value;
    const chroma = parseFloat(neutral6.match(/oklch\(\d+\.?\d*% (\d+\.?\d*)/)![1]!);
    expect(chroma).toBeLessThan(0.1);
  });

  it('uses shifted success hue (175 = teal)', () => {
    const tokens = runPipeline(getBuiltinPreset('casehub-dark')!);
    const success9 = ((tokens['success'] as TokenMap)['9'] as TokenLeaf).$value;
    expect(success9).toContain('175');
  });

  it('generates semantic role tokens', () => {
    const tokens = runPipeline(getBuiltinPreset('casehub-dark')!);
    const roles = tokens['role'] as TokenMap;
    expect(roles['surface-primary']).toBeDefined();
    expect(roles['text-primary']).toBeDefined();
    expect(roles['interactive']).toBeDefined();
    expect(roles['status-success']).toBeDefined();
  });

  it('produces valid CSS with no NaN or undefined', () => {
    const tokens = runPipeline(getBuiltinPreset('casehub-dark')!);
    const css = generateCSS(tokens, 'casehub-dark');
    expect(css).toContain('.pages-theme-casehub-dark');
    expect(css).not.toContain('NaN');
    expect(css).not.toContain('undefined');
  });
});

describe('casehub-light preset', () => {
  beforeAll(() => { initPresets(); });

  it('extends default-light', () => {
    expect(getBuiltinPreset('casehub-light')?.$extends).toBe('default-light');
  });

  it('generates brand hue scales', () => {
    const tokens = runPipeline(getBuiltinPreset('casehub-light')!);
    expect(tokens['violet']).toBeDefined();
    expect(tokens['green']).toBeDefined();
  });

  it('uses light mode steps (step 1 near-white)', () => {
    const tokens = runPipeline(getBuiltinPreset('casehub-light')!);
    const neutral1 = ((tokens['neutral'] as TokenMap)['1'] as TokenLeaf).$value;
    const lightness = parseFloat(neutral1.match(/oklch\((\d+\.?\d*)%/)![1]!);
    expect(lightness).toBeGreaterThan(90);
  });

  it('produces valid CSS', () => {
    const tokens = runPipeline(getBuiltinPreset('casehub-light')!);
    const css = generateCSS(tokens, 'casehub-light');
    expect(css).toContain('.pages-theme-casehub-light');
    expect(css).not.toContain('NaN');
    expect(css).not.toContain('undefined');
  });
});
