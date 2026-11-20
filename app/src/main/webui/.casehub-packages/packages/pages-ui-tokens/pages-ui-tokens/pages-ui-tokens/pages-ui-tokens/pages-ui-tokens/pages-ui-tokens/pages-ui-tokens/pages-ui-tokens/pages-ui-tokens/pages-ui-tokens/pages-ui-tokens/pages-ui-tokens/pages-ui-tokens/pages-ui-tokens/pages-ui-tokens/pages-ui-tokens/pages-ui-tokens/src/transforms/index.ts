import { registerTransform } from '../registry.js';
import { registerBuiltinPreset } from '../preset-loader.js';
import type { PresetConfig } from '../types.js';
import { oklchScale } from './oklch-scale.js';
import { lightMode } from './light-mode.js';
import { darkMode } from './dark-mode.js';
import { lightnessShift } from './lightness-shift.js';
import { lightnessSteps } from './lightness-steps.js';
import { chromaCurve } from './chroma-curve.js';
import { semanticHues } from './semantic-hues.js';
import { override } from './override.js';
import { semanticMap } from './semantic-map.js';
import { contrastCheck } from './contrast-check.js';
import { gamutClamp } from './gamut-clamp.js';

const DEFAULT_HUES = {
  hues: { accent: 245, neutral: 220, success: 145, warning: 55, danger: 25, info: 210 },
  chroma: 0.12,
  contrast: 0.5,
};

const DEFAULT_LIGHT_PRESET: PresetConfig = {
  $name: 'default-light',
  $description: 'Pages generic light theme',
  pipeline: [
    { transform: 'light-mode' },
    { transform: 'oklch-scale', params: DEFAULT_HUES },
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};

const DEFAULT_DARK_PRESET: PresetConfig = {
  $name: 'default-dark',
  $description: 'Pages generic dark theme',
  pipeline: [
    { transform: 'dark-mode' },
    { transform: 'oklch-scale', params: DEFAULT_HUES },
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};

export function registerCoreTransforms(): void {
  registerTransform('oklch-scale', oklchScale);
  registerTransform('light-mode', lightMode);
  registerTransform('dark-mode', darkMode);
  registerTransform('lightness-shift', lightnessShift);
  registerTransform('lightness-steps', lightnessSteps);
  registerTransform('chroma-curve', chromaCurve);
  registerTransform('semantic-hues', semanticHues);
  registerTransform('override', override);
  registerTransform('semantic-map', semanticMap);
  registerTransform('contrast-check', contrastCheck);
  registerTransform('gamut-clamp', gamutClamp);
}

const CASEHUB_BRAND_HUES = { hues: { violet: 270, green: 160, magenta: 320 } };

const CASEHUB_STEPS = [16, 21, 25, 29, 35, 42, 49, 55, 68, 76, 86, 93];

const CASEHUB_DARK_PRESET: PresetConfig = {
  $name: 'casehub-dark',
  $description: 'CaseHub brand dark theme — Claudony / casehub.org look',
  $extends: 'default-dark',
  pipeline: [
    { transform: 'oklch-scale', params: { hues: { accent: 215, neutral: [260, 215] }, chroma: 0.30, steps: CASEHUB_STEPS } },
    { transform: 'oklch-scale', params: { ...CASEHUB_BRAND_HUES, steps: CASEHUB_STEPS, chroma: 0.12 } },
    { transform: 'chroma-curve', params: { curve: 'gaussian', neutral: 1.8, accent: 0.52 } },
    { transform: 'semantic-hues', params: { success: 175, warning: 85 } },
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};

const CASEHUB_LIGHT_PRESET: PresetConfig = {
  $name: 'casehub-light',
  $description: 'CaseHub brand light theme',
  $extends: 'default-light',
  pipeline: [
    { transform: 'oklch-scale', params: CASEHUB_BRAND_HUES },
    { transform: 'chroma-curve', params: { curve: 'gaussian', neutral: 0.02 } },
    { transform: 'semantic-hues', params: { success: 175, warning: 100 } },
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};

const NORD_HUES = { hues: { accent: 210, neutral: 220, success: 145, warning: 40, danger: 355, info: 195 }, chroma: 0.08, contrast: 0.45, radius: 8, density: 'normal', shadow: 0.3, fontFamily: 'humanist', fontSize: 14 };
const SOLARIZED_HUES = { hues: { accent: 175, neutral: 55, success: 105, warning: 45, danger: 18, info: 200 }, chroma: 0.10, contrast: 0.55, radius: 4, density: 'normal', shadow: 0.2, fontFamily: 'system', fontSize: 14 };
const DRACULA_HUES = { hues: { accent: 270, neutral: 240, success: 115, warning: 60, danger: 0, info: 195 }, chroma: 0.18, contrast: 0.55, radius: 10, density: 'normal', shadow: 0.5, fontFamily: 'mono', fontSize: 13 };
const GITHUB_HUES = { hues: { accent: 215, neutral: 215, success: 140, warning: 40, danger: 5, info: 210 }, chroma: 0.04, contrast: 0.60, radius: 6, density: 'normal', shadow: 0.15, fontFamily: 'system', fontSize: 14 };
const MONOKAI_HUES = { hues: { accent: 80, neutral: 50, success: 95, warning: 35, danger: 345, info: 190 }, chroma: 0.15, contrast: 0.50, radius: 4, density: 'compact', shadow: 0.35, fontFamily: 'geometric', fontSize: 13 };

function makePresetPair(name: string, description: string, hues: Record<string, unknown>): [PresetConfig, PresetConfig] {
  return [
    { $name: `${name}-light`, $description: `${description} — light`, pipeline: [
      { transform: 'light-mode' }, { transform: 'oklch-scale', params: hues }, { transform: 'semantic-map' }, { transform: 'gamut-clamp' },
    ]},
    { $name: `${name}-dark`, $description: `${description} — dark`, pipeline: [
      { transform: 'dark-mode' }, { transform: 'oklch-scale', params: hues }, { transform: 'semantic-map' }, { transform: 'gamut-clamp' },
    ]},
  ];
}

const [NORD_LIGHT, NORD_DARK] = makePresetPair('nord', 'Arctic blue — muted frost palette', NORD_HUES);
const [SOLARIZED_LIGHT, SOLARIZED_DARK] = makePresetPair('solarized', 'Precision colours for machines and people', SOLARIZED_HUES);
const [DRACULA_LIGHT, DRACULA_DARK] = makePresetPair('dracula', 'Vivid purple with high contrast accents', DRACULA_HUES);
const [GITHUB_LIGHT, GITHUB_DARK] = makePresetPair('github', 'Clean and neutral — familiar professional look', GITHUB_HUES);
const [MONOKAI_LIGHT, MONOKAI_DARK] = makePresetPair('monokai', 'Warm tones with vibrant yellow-green accent', MONOKAI_HUES);

const VIVID_STEPS = [10, 15, 20, 26, 33, 42, 52, 62, 72, 82, 90, 96];
const VIVID_DARK: PresetConfig = {
  $name: 'vivid-dark',
  $description: 'Maximum saturation — pushes chroma, custom lightness spread, gaussian curve',
  pipeline: [
    { transform: 'dark-mode' },
    { transform: 'oklch-scale', params: {
      hues: { accent: 290, neutral: [280, 260], success: 160, warning: 70, danger: 15, info: 225 },
      chroma: 0.35, contrast: 0.65, steps: VIVID_STEPS,
      radius: 16, density: 'spacious', shadow: 0.6, fontFamily: 'geometric', fontSize: 15,
    }},
    { transform: 'chroma-curve', params: { curve: 'bezier', neutral: 0.4, accent: 1.2 } },
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};
const VIVID_LIGHT: PresetConfig = {
  $name: 'vivid-light',
  $description: 'Maximum saturation — light variant',
  pipeline: [
    { transform: 'light-mode' },
    { transform: 'oklch-scale', params: {
      hues: { accent: 290, neutral: [280, 260], success: 160, warning: 70, danger: 15, info: 225 },
      chroma: 0.35, contrast: 0.65, steps: VIVID_STEPS,
      radius: 16, density: 'spacious', shadow: 0.6, fontFamily: 'geometric', fontSize: 15,
    }},
    { transform: 'chroma-curve', params: { curve: 'bezier', neutral: 0.3, accent: 1.0 } },
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};

const EDITORIAL_DARK: PresetConfig = {
  $name: 'editorial-dark',
  $description: 'Monochrome base with single accent pop — chroma-curve suppresses all but accent',
  pipeline: [
    { transform: 'dark-mode' },
    { transform: 'oklch-scale', params: {
      hues: { accent: 30, neutral: 30, success: 145, warning: 55, danger: 25, info: 210 },
      chroma: 0.15, contrast: 0.55,
      radius: 0, density: 'compact', shadow: 0.1, fontFamily: 'serif', fontSize: 15,
    }},
    { transform: 'chroma-curve', params: { curve: 'gaussian', neutral: 0.05, success: 0.3, warning: 0.3, danger: 0.4, info: 0.2 } },
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};
const EDITORIAL_LIGHT: PresetConfig = {
  $name: 'editorial-light',
  $description: 'Monochrome base with single accent pop — light variant',
  pipeline: [
    { transform: 'light-mode' },
    { transform: 'oklch-scale', params: {
      hues: { accent: 30, neutral: 30, success: 145, warning: 55, danger: 25, info: 210 },
      chroma: 0.15, contrast: 0.55,
      radius: 0, density: 'compact', shadow: 0.1, fontFamily: 'serif', fontSize: 15,
    }},
    { transform: 'chroma-curve', params: { curve: 'gaussian', neutral: 0.02, success: 0.25, warning: 0.25, danger: 0.35, info: 0.15 } },
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};

const EARTH_STEPS = [18, 24, 30, 36, 42, 48, 54, 60, 66, 74, 82, 90];
const EARTH_DARK: PresetConfig = {
  $name: 'earth-dark',
  $description: 'Warm natural tones — custom steps, dual-hue neutrals, brand overlays, shifted semantics',
  pipeline: [
    { transform: 'dark-mode' },
    { transform: 'oklch-scale', params: {
      hues: { accent: 45, neutral: [35, 25], success: 120, warning: 60, danger: 10, info: 195 },
      chroma: 0.10, contrast: 0.40, steps: EARTH_STEPS,
      radius: 12, density: 'normal', shadow: 0.5, fontFamily: 'rounded', fontSize: 14,
    }},
    { transform: 'oklch-scale', params: {
      hues: { terracotta: 28, sage: 130, clay: 50 },
      chroma: 0.08, steps: EARTH_STEPS,
    }},
    { transform: 'chroma-curve', params: { curve: 'gaussian', neutral: 0.6, accent: 0.8, sage: 0.5 } },
    { transform: 'lightness-shift', params: { offset: 3 } },
    { transform: 'semantic-hues', params: { success: 130, warning: 50 } },
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};
const EARTH_LIGHT: PresetConfig = {
  $name: 'earth-light',
  $description: 'Warm natural tones — light variant',
  pipeline: [
    { transform: 'light-mode' },
    { transform: 'oklch-scale', params: {
      hues: { accent: 45, neutral: [35, 25], success: 120, warning: 60, danger: 10, info: 195 },
      chroma: 0.10, contrast: 0.40, steps: EARTH_STEPS,
      radius: 12, density: 'normal', shadow: 0.5, fontFamily: 'rounded', fontSize: 14,
    }},
    { transform: 'oklch-scale', params: {
      hues: { terracotta: 28, sage: 130, clay: 50 },
      chroma: 0.06, steps: EARTH_STEPS,
    }},
    { transform: 'chroma-curve', params: { curve: 'gaussian', neutral: 0.3, accent: 0.7, sage: 0.4 } },
    { transform: 'semantic-hues', params: { success: 130, warning: 50 } },
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};

const NEON_STEPS = [5, 8, 12, 16, 22, 30, 40, 50, 62, 75, 88, 95];
const NEON_DARK: PresetConfig = {
  $name: 'neon-dark',
  $description: 'Cyberpunk — extreme chroma, hot pink on deep purple, sharp edges',
  pipeline: [
    { transform: 'dark-mode' },
    { transform: 'oklch-scale', params: {
      hues: { accent: 320, neutral: [280, 300], success: 150, warning: 65, danger: 5, info: 200 },
      chroma: 0.40, contrast: 0.70, steps: NEON_STEPS,
      radius: 0, density: 'compact', shadow: 0.8, fontFamily: 'mono', fontSize: 13,
    }},
    { transform: 'chroma-curve', params: { curve: 'bezier', neutral: 0.15, accent: 1.4 } },
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};
const NEON_LIGHT: PresetConfig = {
  $name: 'neon-light',
  $description: 'Cyberpunk — light variant',
  pipeline: [
    { transform: 'light-mode' },
    { transform: 'oklch-scale', params: {
      hues: { accent: 320, neutral: [280, 300], success: 150, warning: 65, danger: 5, info: 200 },
      chroma: 0.35, contrast: 0.65, steps: NEON_STEPS,
      radius: 0, density: 'compact', shadow: 0.8, fontFamily: 'mono', fontSize: 13,
    }},
    { transform: 'chroma-curve', params: { curve: 'bezier', neutral: 0.1, accent: 1.2 } },
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};

const TERMINAL_DARK: PresetConfig = {
  $name: 'terminal-dark',
  $description: 'Green-on-black — single-hue monochrome terminal aesthetic',
  pipeline: [
    { transform: 'dark-mode' },
    { transform: 'oklch-scale', params: {
      hues: { accent: 140, neutral: 140, success: 140, warning: 60, danger: 0, info: 140 },
      chroma: 0.20, contrast: 0.60,
      radius: 0, density: 'compact', shadow: 0.0, fontFamily: 'mono', fontSize: 13,
    }},
    { transform: 'chroma-curve', params: { curve: 'gaussian', neutral: 0.08, warning: 0.4, danger: 0.5 } },
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};
const TERMINAL_LIGHT: PresetConfig = {
  $name: 'terminal-light',
  $description: 'Green-on-white — terminal light variant',
  pipeline: [
    { transform: 'light-mode' },
    { transform: 'oklch-scale', params: {
      hues: { accent: 140, neutral: 140, success: 140, warning: 60, danger: 0, info: 140 },
      chroma: 0.15, contrast: 0.55,
      radius: 0, density: 'compact', shadow: 0.0, fontFamily: 'mono', fontSize: 13,
    }},
    { transform: 'chroma-curve', params: { curve: 'gaussian', neutral: 0.05, warning: 0.35, danger: 0.45 } },
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};

const PASTEL_STEPS = [25, 32, 38, 44, 50, 56, 62, 68, 74, 80, 86, 92];
const PASTEL_DARK: PresetConfig = {
  $name: 'pastel-dark',
  $description: 'Watercolour — ultra-soft, minimal contrast, dreamy palette',
  pipeline: [
    { transform: 'dark-mode' },
    { transform: 'oklch-scale', params: {
      hues: { accent: 280, neutral: 260, success: 160, warning: 45, danger: 350, info: 220 },
      chroma: 0.08, contrast: 0.25, steps: PASTEL_STEPS,
      radius: 20, density: 'spacious', shadow: 0.15, fontFamily: 'rounded', fontSize: 15,
    }},
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};
const PASTEL_LIGHT: PresetConfig = {
  $name: 'pastel-light',
  $description: 'Watercolour — light variant, barely-there tints',
  pipeline: [
    { transform: 'light-mode' },
    { transform: 'oklch-scale', params: {
      hues: { accent: 280, neutral: 260, success: 160, warning: 45, danger: 350, info: 220 },
      chroma: 0.06, contrast: 0.20, steps: PASTEL_STEPS,
      radius: 20, density: 'spacious', shadow: 0.1, fontFamily: 'rounded', fontSize: 15,
    }},
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};

const BRUTALIST_DARK: PresetConfig = {
  $name: 'brutalist-dark',
  $description: 'Brutalist — maximum contrast, zero decoration, raw and stark',
  pipeline: [
    { transform: 'dark-mode' },
    { transform: 'oklch-scale', params: {
      hues: { accent: 55, neutral: 55, success: 145, warning: 55, danger: 25, info: 210 },
      chroma: 0.02, contrast: 1.0,
      radius: 0, density: 'compact', shadow: 0.0, fontFamily: 'system', fontSize: 16,
    }},
    { transform: 'chroma-curve', params: { curve: 'gaussian', neutral: 0.0, accent: 3.0, success: 0.6, danger: 0.8 } },
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};
const BRUTALIST_LIGHT: PresetConfig = {
  $name: 'brutalist-light',
  $description: 'Brutalist — light variant, stark black on white',
  pipeline: [
    { transform: 'light-mode' },
    { transform: 'oklch-scale', params: {
      hues: { accent: 55, neutral: 55, success: 145, warning: 55, danger: 25, info: 210 },
      chroma: 0.02, contrast: 1.0,
      radius: 0, density: 'compact', shadow: 0.0, fontFamily: 'system', fontSize: 16,
    }},
    { transform: 'chroma-curve', params: { curve: 'gaussian', neutral: 0.0, accent: 3.0, success: 0.5, danger: 0.7 } },
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};

const FORGE_STEPS = [6, 10, 14, 18, 24, 32, 42, 54, 68, 80, 90, 96];
const FORGE_DARK: PresetConfig = {
  $name: 'forge-dark',
  $description: 'Industrial dark — bright orange on near-black, sharp and bold',
  pipeline: [
    { transform: 'dark-mode' },
    { transform: 'oklch-scale', params: {
      hues: { accent: 28, neutral: [25, 20], success: 145, warning: 50, danger: 5, info: 210 },
      chroma: 0.25, contrast: 0.70, steps: FORGE_STEPS,
      radius: 0, density: 'compact', shadow: 0.3, fontFamily: 'geometric', fontSize: 14,
    }},
    { transform: 'chroma-curve', params: { curve: 'gaussian', neutral: 0.08, accent: 1.3 } },
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};
const FORGE_LIGHT: PresetConfig = {
  $name: 'forge-light',
  $description: 'Industrial — light variant with warm greys',
  pipeline: [
    { transform: 'light-mode' },
    { transform: 'oklch-scale', params: {
      hues: { accent: 28, neutral: [25, 20], success: 145, warning: 50, danger: 5, info: 210 },
      chroma: 0.20, contrast: 0.65, steps: FORGE_STEPS,
      radius: 0, density: 'compact', shadow: 0.3, fontFamily: 'geometric', fontSize: 14,
    }},
    { transform: 'chroma-curve', params: { curve: 'gaussian', neutral: 0.05, accent: 1.2 } },
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};

const SIENNA_STEPS = [22, 28, 34, 40, 46, 52, 58, 64, 72, 80, 88, 94];
const SIENNA_DARK: PresetConfig = {
  $name: 'sienna-dark',
  $description: 'Warm earth — dark variant, rich amber tones',
  pipeline: [
    { transform: 'dark-mode' },
    { transform: 'oklch-scale', params: {
      hues: { accent: 35, neutral: [40, 30], success: 130, warning: 50, danger: 15, info: 200 },
      chroma: 0.07, contrast: 0.40, steps: SIENNA_STEPS,
      radius: 6, density: 'normal', shadow: 0.25, fontFamily: 'serif', fontSize: 15,
    }},
    { transform: 'chroma-curve', params: { curve: 'gaussian', neutral: 0.8, accent: 1.0 } },
    { transform: 'lightness-shift', params: { offset: 2 } },
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};
const SIENNA_LIGHT: PresetConfig = {
  $name: 'sienna-light',
  $description: 'Warm earth — cream backgrounds, warm brown text, organic feel',
  pipeline: [
    { transform: 'light-mode' },
    { transform: 'oklch-scale', params: {
      hues: { accent: 35, neutral: [40, 30], success: 130, warning: 50, danger: 15, info: 200 },
      chroma: 0.06, contrast: 0.35, steps: SIENNA_STEPS,
      radius: 6, density: 'normal', shadow: 0.15, fontFamily: 'serif', fontSize: 15,
    }},
    { transform: 'chroma-curve', params: { curve: 'gaussian', neutral: 0.9, accent: 0.8 } },
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};

const PARCHMENT_LIGHT: PresetConfig = {
  $name: 'parchment-light',
  $description: 'Aged paper — warm cream backgrounds, golden amber accent, warm brown text',
  pipeline: [
    { transform: 'light-mode' },
    { transform: 'oklch-scale', params: {
      hues: { accent: 50, neutral: 50, success: 155, warning: 50, danger: 15, info: 200 },
      chroma: 0.06, contrast: 0.45,
      radius: 4, density: 'normal', shadow: 0.15, fontFamily: 'serif', fontSize: 15,
    }},
    { transform: 'override', params: {
      'neutral.1': 'oklch(95% 0.05 65)',
      'neutral.2': 'oklch(92% 0.055 60)',
      'neutral.3': 'oklch(88% 0.06 55)',
      'neutral.4': 'oklch(82% 0.06 50)',
      'neutral.5': 'oklch(75% 0.05 50)',
    }},
    { transform: 'chroma-curve', params: { curve: 'gaussian', accent: 2.0 } },
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};
const PARCHMENT_DARK: PresetConfig = {
  $name: 'parchment-dark',
  $description: 'Aged paper — dark variant with warm brown surfaces and golden accent',
  pipeline: [
    { transform: 'dark-mode' },
    { transform: 'oklch-scale', params: {
      hues: { accent: 50, neutral: [50, 40], success: 155, warning: 50, danger: 15, info: 200 },
      chroma: 0.06, contrast: 0.45,
      radius: 4, density: 'normal', shadow: 0.25, fontFamily: 'serif', fontSize: 15,
    }},
    { transform: 'override', params: {
      'neutral.1': 'oklch(18% 0.02 50)',
      'neutral.2': 'oklch(22% 0.025 50)',
      'neutral.3': 'oklch(28% 0.03 50)',
      'neutral.4': 'oklch(34% 0.03 50)',
    }},
    { transform: 'chroma-curve', params: { curve: 'gaussian', accent: 1.8 } },
    { transform: 'semantic-map' },
    { transform: 'gamut-clamp' },
  ],
};

export function initPresets(): void {
  registerCoreTransforms();
  registerBuiltinPreset(DEFAULT_LIGHT_PRESET);
  registerBuiltinPreset(DEFAULT_DARK_PRESET);
  registerBuiltinPreset(CASEHUB_DARK_PRESET);
  registerBuiltinPreset(CASEHUB_LIGHT_PRESET);
  registerBuiltinPreset(NORD_LIGHT!);
  registerBuiltinPreset(NORD_DARK!);
  registerBuiltinPreset(SOLARIZED_LIGHT!);
  registerBuiltinPreset(SOLARIZED_DARK!);
  registerBuiltinPreset(DRACULA_LIGHT!);
  registerBuiltinPreset(DRACULA_DARK!);
  registerBuiltinPreset(GITHUB_LIGHT!);
  registerBuiltinPreset(GITHUB_DARK!);
  registerBuiltinPreset(MONOKAI_LIGHT!);
  registerBuiltinPreset(MONOKAI_DARK!);
  registerBuiltinPreset(VIVID_LIGHT);
  registerBuiltinPreset(VIVID_DARK);
  registerBuiltinPreset(EDITORIAL_LIGHT);
  registerBuiltinPreset(EDITORIAL_DARK);
  registerBuiltinPreset(EARTH_LIGHT);
  registerBuiltinPreset(EARTH_DARK);
  registerBuiltinPreset(NEON_DARK);
  registerBuiltinPreset(NEON_LIGHT);
  registerBuiltinPreset(TERMINAL_DARK);
  registerBuiltinPreset(TERMINAL_LIGHT);
  registerBuiltinPreset(PASTEL_DARK);
  registerBuiltinPreset(PASTEL_LIGHT);
  registerBuiltinPreset(BRUTALIST_DARK);
  registerBuiltinPreset(BRUTALIST_LIGHT);
  registerBuiltinPreset(FORGE_DARK);
  registerBuiltinPreset(FORGE_LIGHT);
  registerBuiltinPreset(SIENNA_DARK);
  registerBuiltinPreset(SIENNA_LIGHT);
  registerBuiltinPreset(PARCHMENT_DARK);
  registerBuiltinPreset(PARCHMENT_LIGHT);
}

export { oklchScale } from './oklch-scale.js';
export { lightMode } from './light-mode.js';
export { darkMode } from './dark-mode.js';
export { lightnessShift } from './lightness-shift.js';
export { lightnessSteps } from './lightness-steps.js';
export { chromaCurve } from './chroma-curve.js';
export { semanticHues } from './semantic-hues.js';
export { override } from './override.js';
export { semanticMap } from './semantic-map.js';
export { contrastCheck } from './contrast-check.js';
export { gamutClamp } from './gamut-clamp.js';
