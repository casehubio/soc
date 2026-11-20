import { describe, it, expect, beforeAll } from 'vitest';
import { generateThemeCSS, DEFAULT_THEME } from './themes.js';
import { runPipeline } from './pipeline.js';
import { generateCSS, generateDensityCSS } from './output.js';
import { initPresets } from './transforms/index.js';
import type { PresetConfig } from './types.js';

function extractCSSProperties(css: string): Map<string, string> {
  const props = new Map<string, string>();
  const regex = /(--pages-[a-z0-9-]+):\s*([^;]+);/g;
  let match;
  while ((match = regex.exec(css)) !== null) {
    props.set(match[1]!, match[2]!.trim());
  }
  return props;
}

describe('backward compatibility — default presets match generateThemeCSS', () => {
  beforeAll(() => {
    initPresets();
  });

  it('default-light produces same colour tokens as generateThemeCSS light block', () => {
    const oldCSS = generateThemeCSS(DEFAULT_THEME);
    const lightBlock = oldCSS.match(/\.pages-theme-light \{([^}]+)\}/s)?.[1] ?? '';
    const oldProps = extractCSSProperties(lightBlock);

    const lightPreset: PresetConfig = {
      $name: 'default-light', pipeline: [
        { transform: 'light-mode' },
        {
          transform: 'oklch-scale', params: {
            hues: { accent: 245, neutral: 220, success: 145, warning: 55, danger: 25, info: 210 },
            chroma: 0.12, contrast: 0.5,
          },
        },
      ],
    };
    const tokens = runPipeline(lightPreset);
    const newCSS = generateCSS(tokens, 'default-light');
    const newProps = extractCSSProperties(newCSS);

    const hues = ['accent', 'neutral', 'success', 'warning', 'danger', 'info'];
    for (const hue of hues) {
      for (let step = 1; step <= 12; step++) {
        const key = `--pages-${hue}-${step}`;
        expect(newProps.get(key), `${key} missing in pipeline output`).toBeDefined();
        expect(newProps.get(key), `${key} value mismatch`).toBe(oldProps.get(key));
      }
    }
  });

  it('default-dark produces same colour tokens as generateThemeCSS dark block', () => {
    const oldCSS = generateThemeCSS(DEFAULT_THEME);
    const darkBlock = oldCSS.match(/\.pages-theme-dark \{([^}]+)\}/s)?.[1] ?? '';
    const oldProps = extractCSSProperties(darkBlock);

    const darkPreset: PresetConfig = {
      $name: 'default-dark', pipeline: [
        { transform: 'dark-mode' },
        {
          transform: 'oklch-scale', params: {
            hues: { accent: 245, neutral: 220, success: 145, warning: 55, danger: 25, info: 210 },
            chroma: 0.12, contrast: 0.5,
          },
        },
      ],
    };
    const tokens = runPipeline(darkPreset);
    const newCSS = generateCSS(tokens, 'default-dark');
    const newProps = extractCSSProperties(newCSS);

    const hues = ['accent', 'neutral', 'success', 'warning', 'danger', 'info'];
    for (const hue of hues) {
      for (let step = 1; step <= 12; step++) {
        const key = `--pages-${hue}-${step}`;
        expect(newProps.get(key), `${key} missing in pipeline output`).toBeDefined();
        expect(newProps.get(key), `${key} value mismatch`).toBe(oldProps.get(key));
      }
    }
  });

  it('shadow tokens match between old and new for both modes', () => {
    const oldCSS = generateThemeCSS(DEFAULT_THEME);

    for (const mode of ['light', 'dark'] as const) {
      const block = oldCSS.match(new RegExp(`\\.pages-theme-${mode} \\{([^}]+)\\}`, 's'))?.[1] ?? '';
      const oldProps = extractCSSProperties(block);

      const presetName = `default-${mode}`;
      const preset: PresetConfig = {
        $name: presetName, pipeline: [
          { transform: mode === 'dark' ? 'dark-mode' : 'light-mode' },
          {
            transform: 'oklch-scale', params: {
              hues: { accent: 245, neutral: 220, success: 145, warning: 55, danger: 25, info: 210 },
              chroma: 0.12, contrast: 0.5,
            },
          },
        ],
      };
      const tokens = runPipeline(preset);
      const newCSS = generateCSS(tokens, presetName);
      const newProps = extractCSSProperties(newCSS);

      for (let i = 1; i <= 4; i++) {
        const shadowKey = `--pages-shadow-${i}`;
        expect(newProps.get(shadowKey), `${shadowKey} (${mode}) missing`).toBeDefined();
        expect(newProps.get(shadowKey), `${shadowKey} (${mode}) mismatch`).toBe(oldProps.get(shadowKey));

        const surfaceKey = `--pages-surface-${i}`;
        expect(newProps.get(surfaceKey), `${surfaceKey} (${mode}) missing`).toBeDefined();
        expect(newProps.get(surfaceKey), `${surfaceKey} (${mode}) mismatch`).toBe(oldProps.get(surfaceKey));
      }
    }
  });

  it('shared tokens (spacing, typography, motion, radius) present in pipeline output', () => {
    const preset: PresetConfig = {
      $name: 'default-light', pipeline: [
        { transform: 'light-mode' },
        {
          transform: 'oklch-scale', params: {
            hues: { accent: 245, neutral: 220, success: 145, warning: 55, danger: 25, info: 210 },
            chroma: 0.12, contrast: 0.5,
          },
        },
      ],
    };
    const tokens = runPipeline(preset);
    const css = generateCSS(tokens, 'default-light');

    expect(css).toContain('--pages-space-1: 4px;');
    expect(css).toContain('--pages-font-size-base: 14px;');
    expect(css).toContain('--pages-duration-fast: 120ms;');
    expect(css).toContain('--pages-radius-md: 6px;');
  });

  it('density CSS is unchanged', () => {
    const oldCSS = generateThemeCSS(DEFAULT_THEME);
    const oldDensity = oldCSS.match(/\.pages-density-compact \{([^}]+)\}/s)?.[1] ?? '';
    const newDensity = generateDensityCSS().match(/\.pages-density-compact \{([^}]+)\}/s)?.[1] ?? '';

    const oldProps = extractCSSProperties(oldDensity);
    const newProps = extractCSSProperties(newDensity);

    for (const [key, value] of oldProps) {
      expect(newProps.get(key), `density ${key} missing`).toBe(value);
    }
  });
});
