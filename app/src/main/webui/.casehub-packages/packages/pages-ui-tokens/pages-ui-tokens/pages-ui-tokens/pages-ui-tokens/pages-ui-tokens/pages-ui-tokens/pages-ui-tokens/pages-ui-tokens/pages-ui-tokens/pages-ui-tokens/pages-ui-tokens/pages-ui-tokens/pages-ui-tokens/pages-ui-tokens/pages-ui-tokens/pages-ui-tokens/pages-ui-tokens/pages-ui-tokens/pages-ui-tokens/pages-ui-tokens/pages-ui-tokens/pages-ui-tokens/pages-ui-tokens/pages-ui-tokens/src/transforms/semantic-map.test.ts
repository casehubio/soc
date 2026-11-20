import { describe, it, expect } from 'vitest';
import { semanticMap } from './semantic-map.js';
import type { TokenMap, TokenLeaf } from '../types.js';

const baseTokens: TokenMap = {
  neutral: {
    '1': { $value: 'oklch(8% 0.002 260)', $type: 'color' },
    '2': { $value: 'oklch(12% 0.003 260)', $type: 'color' },
    '3': { $value: 'oklch(17% 0.004 260)', $type: 'color' },
    '4': { $value: 'oklch(22% 0.005 260)', $type: 'color' },
    '6': { $value: 'oklch(34% 0.007 260)', $type: 'color' },
    '8': { $value: 'oklch(47% 0.009 260)', $type: 'color' },
    '9': { $value: 'oklch(55% 0.010 260)', $type: 'color' },
    '10': { $value: 'oklch(65% 0.011 260)', $type: 'color' },
    '11': { $value: 'oklch(78% 0.012 260)', $type: 'color' },
    '12': { $value: 'oklch(93% 0.014 260)', $type: 'color' },
  },
  accent: {
    '2': { $value: 'oklch(12% 0.036 245)', $type: 'color' },
    '8': { $value: 'oklch(47% 0.120 245)', $type: 'color' },
    '9': { $value: 'oklch(55% 0.120 245)', $type: 'color' },
    '10': { $value: 'oklch(65% 0.120 245)', $type: 'color' },
    '11': { $value: 'oklch(78% 0.120 245)', $type: 'color' },
  },
  success: { '9': { $value: 'oklch(55% 0.120 145)', $type: 'color' } },
  warning: { '9': { $value: 'oklch(55% 0.120 55)', $type: 'color' } },
  danger: { '9': { $value: 'oklch(55% 0.120 25)', $type: 'color' } },
  info: { '9': { $value: 'oklch(55% 0.120 210)', $type: 'color' } },
};

describe('semanticMap transform', () => {
  it('generates surface role tokens', () => {
    const result = semanticMap(baseTokens, {});
    const roles = result['role'] as TokenMap;
    expect((roles['surface-primary'] as TokenLeaf).$value).toBe('var(--pages-neutral-1)');
    expect((roles['surface-secondary'] as TokenLeaf).$value).toBe('var(--pages-neutral-2)');
    expect((roles['surface-tertiary'] as TokenLeaf).$value).toBe('var(--pages-neutral-3)');
    expect((roles['surface-hover'] as TokenLeaf).$value).toBe('var(--pages-neutral-4)');
    expect((roles['surface-selected'] as TokenLeaf).$value).toBe('var(--pages-accent-2)');
  });

  it('generates border role tokens', () => {
    const result = semanticMap(baseTokens, {});
    const roles = result['role'] as TokenMap;
    expect((roles['border-subtle'] as TokenLeaf).$value).toBe('var(--pages-neutral-4)');
    expect((roles['border-default'] as TokenLeaf).$value).toBe('var(--pages-neutral-6)');
    expect((roles['border-strong'] as TokenLeaf).$value).toBe('var(--pages-neutral-8)');
  });

  it('generates text role tokens', () => {
    const result = semanticMap(baseTokens, {});
    const roles = result['role'] as TokenMap;
    expect((roles['text-primary'] as TokenLeaf).$value).toBe('var(--pages-neutral-12)');
    expect((roles['text-secondary'] as TokenLeaf).$value).toBe('var(--pages-neutral-11)');
    expect((roles['text-muted'] as TokenLeaf).$value).toBe('var(--pages-neutral-8)');
    expect((roles['text-disabled'] as TokenLeaf).$value).toBe('var(--pages-neutral-6)');
  });

  it('generates interactive role tokens', () => {
    const result = semanticMap(baseTokens, {});
    const roles = result['role'] as TokenMap;
    expect((roles['interactive'] as TokenLeaf).$value).toBe('var(--pages-accent-9)');
    expect((roles['interactive-hover'] as TokenLeaf).$value).toBe('var(--pages-accent-10)');
    expect((roles['interactive-active'] as TokenLeaf).$value).toBe('var(--pages-accent-11)');
    expect((roles['focus-ring'] as TokenLeaf).$value).toBe('var(--pages-accent-8)');
  });

  it('generates status role tokens', () => {
    const result = semanticMap(baseTokens, {});
    const roles = result['role'] as TokenMap;
    expect((roles['status-success'] as TokenLeaf).$value).toBe('var(--pages-success-9)');
    expect((roles['status-warning'] as TokenLeaf).$value).toBe('var(--pages-warning-9)');
    expect((roles['status-danger'] as TokenLeaf).$value).toBe('var(--pages-danger-9)');
    expect((roles['status-info'] as TokenLeaf).$value).toBe('var(--pages-info-9)');
  });

  it('allows custom mapping overrides', () => {
    const result = semanticMap(baseTokens, {
      mappings: { 'surface-primary': 'neutral.2' },
    });
    const roles = result['role'] as TokenMap;
    expect((roles['surface-primary'] as TokenLeaf).$value).toBe('var(--pages-neutral-2)');
  });

  it('supports custom role names for brand hues', () => {
    const tokens: TokenMap = {
      ...baseTokens,
      violet: { '9': { $value: 'oklch(55% 0.120 270)', $type: 'color' } },
    };
    const result = semanticMap(tokens, {
      mappings: { 'brand-primary': 'violet.9' },
    });
    const roles = result['role'] as TokenMap;
    expect((roles['brand-primary'] as TokenLeaf).$value).toBe('var(--pages-violet-9)');
  });

  it('preserves existing primitive tokens', () => {
    const result = semanticMap(baseTokens, {});
    expect(result['neutral']).toBeDefined();
    expect(result['accent']).toBeDefined();
    expect(result['success']).toBeDefined();
  });

  it('skips mappings to missing primitives', () => {
    const sparse: TokenMap = {
      neutral: { '1': { $value: 'oklch(8% 0.002 260)', $type: 'color' } },
    };
    const result = semanticMap(sparse, {});
    const roles = result['role'] as TokenMap;
    expect(roles['surface-primary']).toBeDefined();
    expect(roles['text-primary']).toBeUndefined();
  });
});
