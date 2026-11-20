import type { TokenMap, PresetConfig } from './types.js';
import { getTransform } from './registry.js';
import { resolvePresetChain } from './preset-loader.js';
import {
  SPACING_SCALE, TYPOGRAPHY, MOTION, RADIUS,
} from './tokens.js';

export function buildInitialTokenMap(): TokenMap {
  const tokens: Record<string, Record<string, { $value: string; $type: string }> | { $value: string; $type: string }> = {};

  const spacing: Record<string, { $value: string; $type: string }> = {};
  for (const [key, value] of Object.entries(SPACING_SCALE)) {
    spacing[key] = { $value: value, $type: 'dimension' };
  }
  tokens['spacing'] = spacing;

  const fontSize: Record<string, { $value: string; $type: string }> = {};
  for (const [key, value] of Object.entries(TYPOGRAPHY.sizes)) {
    fontSize[key] = { $value: value, $type: 'dimension' };
  }
  tokens['font-size'] = fontSize;

  const lineHeight: Record<string, { $value: string; $type: string }> = {};
  for (const [key, value] of Object.entries(TYPOGRAPHY.lineHeights)) {
    lineHeight[key] = { $value: value, $type: 'dimension' };
  }
  tokens['line-height'] = lineHeight;

  const fontWeight: Record<string, { $value: string; $type: string }> = {};
  for (const [key, value] of Object.entries(TYPOGRAPHY.weights)) {
    fontWeight[key] = { $value: value, $type: 'fontWeight' };
  }
  tokens['font-weight'] = fontWeight;

  tokens['font-family'] = { $value: TYPOGRAPHY.family, $type: 'fontFamily' };

  const duration: Record<string, { $value: string; $type: string }> = {};
  for (const [key, value] of Object.entries(MOTION.duration)) {
    duration[key] = { $value: value, $type: 'duration' };
  }
  tokens['duration'] = duration;

  const ease: Record<string, { $value: string; $type: string }> = {};
  for (const [key, value] of Object.entries(MOTION.easing)) {
    ease[key] = { $value: value, $type: 'cubicBezier' };
  }
  tokens['ease'] = ease;

  const radius: Record<string, { $value: string; $type: string }> = {};
  for (const [key, value] of Object.entries(RADIUS)) {
    radius[key] = { $value: value, $type: 'dimension' };
  }
  tokens['radius'] = radius;

  return tokens;
}

export function runPipeline(preset: PresetConfig): TokenMap {
  const chain = resolvePresetChain(preset);
  let tokens: TokenMap = buildInitialTokenMap();

  for (const def of chain) {
    const fn = getTransform(def.transform);
    tokens = fn(tokens, def.params ?? {});
  }

  return tokens;
}
