import { describe, it, expect } from 'vitest';
import { DefaultOrcAccumulator } from './accumulator.js';
import type { OrcNumericPrimitive } from './numeric-primitive.js';

describe('DefaultOrcAccumulator', () => {
  it('sum: accumulates values', () => {
    const acc = new DefaultOrcAccumulator((a, b) => a + b, 0);
    acc.accumulate(3);
    acc.accumulate(7);
    expect(acc.get()).toBe(10);
  });

  it('sum: reset returns to identity', () => {
    const acc = new DefaultOrcAccumulator((a, b) => a + b, 0);
    acc.accumulate(5);
    acc.reset();
    expect(acc.get()).toBe(0);
  });

  it('max: keeps maximum value', () => {
    const acc = new DefaultOrcAccumulator(Math.max, -Infinity);
    acc.accumulate(3);
    acc.accumulate(9);
    acc.accumulate(5);
    expect(acc.get()).toBe(9);
  });

  it('multiply: identity 1', () => {
    const acc = new DefaultOrcAccumulator((a, b) => a * b, 1);
    acc.accumulate(3);
    acc.accumulate(4);
    expect(acc.get()).toBe(12);
  });

  describe('OrcNumericPrimitive', () => {
    it('doubleValue returns current accumulated value', () => {
      const a = new DefaultOrcAccumulator((x, y) => x + y, 0);
      a.accumulate(3);
      a.accumulate(4);
      expect((a as OrcNumericPrimitive).doubleValue()).toBe(7);
    });

    it('fires threshold listener on accumulate', () => {
      const a = new DefaultOrcAccumulator((x, y) => x + y, 0);
      const values: number[] = [];
      (a as OrcNumericPrimitive).onThresholdChange((v) => values.push(v));
      a.accumulate(5);
      a.accumulate(3);
      expect(values).toEqual([5, 8]);
    });

    it('removeThresholdListener stops notifications', () => {
      const a = new DefaultOrcAccumulator((x, y) => x + y, 0);
      const values: number[] = [];
      const listener = (v: number) => values.push(v);
      (a as OrcNumericPrimitive).onThresholdChange(listener);
      a.accumulate(5);
      (a as OrcNumericPrimitive).removeThresholdListener(listener);
      a.accumulate(3);
      expect(values).toEqual([5]);
    });

    it('notifies on reset', () => {
      const a = new DefaultOrcAccumulator((x, y) => x + y, 0);
      a.accumulate(10);
      const values: number[] = [];
      (a as OrcNumericPrimitive).onThresholdChange((v) => values.push(v));
      a.reset();
      expect(values).toEqual([0]);
    });
  });
});
