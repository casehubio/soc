import { describe, it, expect } from 'vitest';
import { lightMode } from './light-mode.js';
import { darkMode } from './dark-mode.js';
import type { TokenMap, TokenLeaf } from '../types.js';

describe('lightMode transform', () => {
  it('sets $mode to light', () => {
    const result = lightMode({}, {});
    expect((result['$mode'] as TokenLeaf).$value).toBe('light');
  });

  it('adds light elevation shadows', () => {
    const result = lightMode({}, {});
    const shadow = result['shadow'] as TokenMap;
    expect(shadow['1']).toBeDefined();
    expect(shadow['4']).toBeDefined();
    expect((shadow['1'] as TokenLeaf).$value).toContain('0.05');
  });

  it('adds light surface overlays with oklch(0%', () => {
    const result = lightMode({}, {});
    const surface = result['surface'] as TokenMap;
    expect((surface['1'] as TokenLeaf).$value).toContain('oklch(0%');
  });

  it('preserves existing tokens', () => {
    const result = lightMode({ existing: { $value: 'keep', $type: 'test' } }, {});
    expect(result['existing']).toEqual({ $value: 'keep', $type: 'test' });
  });
});

describe('darkMode transform', () => {
  it('sets $mode to dark', () => {
    const result = darkMode({}, {});
    expect((result['$mode'] as TokenLeaf).$value).toBe('dark');
  });

  it('adds dark elevation shadows with higher opacity', () => {
    const result = darkMode({}, {});
    const shadow = result['shadow'] as TokenMap;
    expect((shadow['1'] as TokenLeaf).$value).toContain('0.3');
  });

  it('adds dark surface overlays with oklch(100%', () => {
    const result = darkMode({}, {});
    const surface = result['surface'] as TokenMap;
    expect((surface['1'] as TokenLeaf).$value).toContain('oklch(100%');
  });

  it('preserves existing tokens', () => {
    const result = darkMode({ existing: { $value: 'keep', $type: 'test' } }, {});
    expect(result['existing']).toEqual({ $value: 'keep', $type: 'test' });
  });
});
