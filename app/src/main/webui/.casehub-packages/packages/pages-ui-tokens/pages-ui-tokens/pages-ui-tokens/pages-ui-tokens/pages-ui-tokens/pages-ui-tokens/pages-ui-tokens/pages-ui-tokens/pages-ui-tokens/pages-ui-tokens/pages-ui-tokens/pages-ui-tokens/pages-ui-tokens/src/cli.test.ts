import { describe, it, expect, beforeAll } from 'vitest';
import { initPresets } from './transforms/index.js';
import { runPipeline } from './pipeline.js';
import { generateCSS, generateDTCG, generateDensityCSS } from './output.js';
import { getBuiltinPreset, listBuiltinPresets } from './preset-loader.js';

describe('CLI build integration', () => {
  beforeAll(() => { initPresets(); });

  it('lists all four built-in presets', () => {
    const names = listBuiltinPresets();
    expect(names).toContain('default-light');
    expect(names).toContain('default-dark');
    expect(names).toContain('casehub-light');
    expect(names).toContain('casehub-dark');
  });

  it('builds all four built-in presets without errors', () => {
    for (const name of listBuiltinPresets()) {
      const preset = getBuiltinPreset(name);
      expect(preset, `preset ${name} not found`).toBeDefined();
      const tokens = runPipeline(preset!);
      const css = generateCSS(tokens, name);
      const dtcg = generateDTCG(tokens, name);
      expect(css).toContain(`.pages-theme-${name}`);
      expect(dtcg['$name']).toBe(name);
    }
  });

  it('density CSS is independent of preset', () => {
    const css = generateDensityCSS();
    expect(css).toContain('.pages-density-compact');
    expect(css).toContain('--pages-space-1: 3px;');
  });

  it('CSS output contains no NaN or undefined for any preset', () => {
    for (const name of listBuiltinPresets()) {
      const tokens = runPipeline(getBuiltinPreset(name)!);
      const css = generateCSS(tokens, name);
      expect(css, `${name} contains NaN`).not.toContain('NaN');
      expect(css, `${name} contains undefined`).not.toContain('undefined');
    }
  });

  it('DTCG output has correct structure for each preset', () => {
    for (const name of listBuiltinPresets()) {
      const tokens = runPipeline(getBuiltinPreset(name)!);
      const dtcg = generateDTCG(tokens, name);
      expect(dtcg['$name']).toBe(name);
      expect(dtcg['accent']).toBeDefined();
      expect(dtcg['neutral']).toBeDefined();
    }
  });
});
