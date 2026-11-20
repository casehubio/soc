import { describe, it, expect } from 'vitest';
import { DefaultOrcCounter } from './counter.js';
import type { OrcNumericPrimitive } from './numeric-primitive.js';

describe('DefaultOrcCounter', () => {
  it('starts at 0', () => {
    expect(new DefaultOrcCounter().get()).toBe(0);
  });

  it('increment increases by 1', () => {
    const c = new DefaultOrcCounter();
    c.increment();
    c.increment();
    expect(c.get()).toBe(2);
  });

  it('decrement decreases by 1', () => {
    const c = new DefaultOrcCounter();
    c.increment();
    c.increment();
    c.decrement();
    expect(c.get()).toBe(1);
  });

  it('add with positive delta', () => {
    const c = new DefaultOrcCounter();
    c.add(5);
    expect(c.get()).toBe(5);
  });

  it('add with negative delta', () => {
    const c = new DefaultOrcCounter();
    c.add(10);
    c.add(-3);
    expect(c.get()).toBe(7);
  });

  it('reset returns to 0', () => {
    const c = new DefaultOrcCounter();
    c.add(42);
    c.reset();
    expect(c.get()).toBe(0);
  });

  describe('OrcNumericPrimitive', () => {
    it('doubleValue returns current count', () => {
      const c = new DefaultOrcCounter();
      c.add(7);
      expect((c as OrcNumericPrimitive).doubleValue()).toBe(7);
    });

    it('fires threshold listener on value change', () => {
      const c = new DefaultOrcCounter();
      const values: number[] = [];
      (c as OrcNumericPrimitive).onThresholdChange((v) => values.push(v));
      c.increment();
      c.add(4);
      expect(values).toEqual([1, 5]);
    });

    it('removeThresholdListener stops notifications', () => {
      const c = new DefaultOrcCounter();
      const values: number[] = [];
      const listener = (v: number) => values.push(v);
      (c as OrcNumericPrimitive).onThresholdChange(listener);
      c.increment();
      (c as OrcNumericPrimitive).removeThresholdListener(listener);
      c.increment();
      expect(values).toEqual([1]);
    });

    it('notifies on reset', () => {
      const c = new DefaultOrcCounter();
      c.add(5);
      const values: number[] = [];
      (c as OrcNumericPrimitive).onThresholdChange((v) => values.push(v));
      c.reset();
      expect(values).toEqual([0]);
    });
  });
});
