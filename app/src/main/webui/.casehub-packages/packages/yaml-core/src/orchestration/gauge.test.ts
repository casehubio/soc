import { describe, it, expect } from 'vitest';
import { DefaultOrcGauge } from './gauge.js';

describe('DefaultOrcGauge', () => {
  it('returns initial value from constructor', () => {
    expect(new DefaultOrcGauge(42).get()).toBe(42);
  });

  it('set updates the value', () => {
    const g = new DefaultOrcGauge(0);
    g.set(99);
    expect(g.get()).toBe(99);
  });

  it('compareAndSet succeeds when expected matches', () => {
    const g = new DefaultOrcGauge('idle');
    expect(g.compareAndSet('idle', 'active')).toBe(true);
    expect(g.get()).toBe('active');
  });

  it('compareAndSet fails when expected does not match', () => {
    const g = new DefaultOrcGauge('idle');
    expect(g.compareAndSet('active', 'done')).toBe(false);
    expect(g.get()).toBe('idle');
  });
});
