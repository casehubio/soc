import { describe, it, expect } from 'vitest';
import { DefaultSpeedMultiplier, FixedSpeedMultiplier } from './speed-multiplier.js';
import type { SpeedMultiplier } from './speed-multiplier.js';

describe('SpeedMultiplier', () => {
  it('default returns 1x speed', () => {
    const sm: SpeedMultiplier = new DefaultSpeedMultiplier();
    expect(sm.currentSpeed()).toBe(1);
  });

  it('fixed returns configured speed', () => {
    const sm = new FixedSpeedMultiplier(2.5);
    expect(sm.currentSpeed()).toBe(2.5);
  });

  it('adjustDelay divides delay by speed', () => {
    const sm = new FixedSpeedMultiplier(2);
    expect(sm.adjustDelay(100)).toBe(50);
  });

  it('adjustDelay at 1x returns original', () => {
    const sm = new DefaultSpeedMultiplier();
    expect(sm.adjustDelay(200)).toBe(200);
  });

  it('adjustDelay at 0.5x doubles delay', () => {
    const sm = new FixedSpeedMultiplier(0.5);
    expect(sm.adjustDelay(100)).toBe(200);
  });

  it('adjustDelay floors to nearest ms', () => {
    const sm = new FixedSpeedMultiplier(3);
    expect(sm.adjustDelay(100)).toBe(33);
  });
});
