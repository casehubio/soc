import { describe, it, expect } from 'vitest';
import { DefaultOrcMap } from './orc-map.js';

describe('DefaultOrcMap', () => {
  it('put and get', () => {
    const m = new DefaultOrcMap<string, number>();
    m.put('a', 1);
    expect(m.get('a')).toBe(1);
  });

  it('put returns old value or undefined for new key', () => {
    const m = new DefaultOrcMap<string, number>();
    expect(m.put('a', 1)).toBeUndefined();
    expect(m.put('a', 2)).toBe(1);
  });

  it('putIfAbsent does not overwrite existing', () => {
    const m = new DefaultOrcMap<string, number>();
    m.put('a', 1);
    expect(m.putIfAbsent('a', 99)).toBe(1);
    expect(m.get('a')).toBe(1);
  });

  it('putIfAbsent inserts when absent', () => {
    const m = new DefaultOrcMap<string, number>();
    expect(m.putIfAbsent('a', 42)).toBeUndefined();
    expect(m.get('a')).toBe(42);
  });

  it('computeIfAbsent returns existing without calling function', () => {
    const m = new DefaultOrcMap<string, number>();
    m.put('a', 10);
    const result = m.computeIfAbsent('a', () => { throw new Error('should not call'); });
    expect(result).toBe(10);
  });

  it('computeIfAbsent calls function for missing key', () => {
    const m = new DefaultOrcMap<string, string>();
    const result = m.computeIfAbsent('x', k => `computed-${k}`);
    expect(result).toBe('computed-x');
    expect(m.get('x')).toBe('computed-x');
  });

  it('merge with no existing value uses new value directly', () => {
    const m = new DefaultOrcMap<string, number>();
    const result = m.merge('a', 5, () => { throw new Error('should not call'); });
    expect(result).toBe(5);
  });

  it('merge with existing value calls remapping function', () => {
    const m = new DefaultOrcMap<string, number>();
    m.put('a', 3);
    const result = m.merge('a', 7, (old, nw) => old + nw);
    expect(result).toBe(10);
  });

  it('remove returns old value', () => {
    const m = new DefaultOrcMap<string, number>();
    m.put('a', 1);
    expect(m.remove('a')).toBe(1);
    expect(m.get('a')).toBeUndefined();
  });

  it('remove for missing key returns undefined', () => {
    const m = new DefaultOrcMap<string, number>();
    expect(m.remove('nope')).toBeUndefined();
  });

  it('containsKey', () => {
    const m = new DefaultOrcMap<string, number>();
    m.put('a', 1);
    expect(m.containsKey('a')).toBe(true);
    expect(m.containsKey('b')).toBe(false);
  });

  it('size', () => {
    const m = new DefaultOrcMap<string, number>();
    expect(m.size()).toBe(0);
    m.put('a', 1);
    m.put('b', 2);
    expect(m.size()).toBe(2);
  });
});
