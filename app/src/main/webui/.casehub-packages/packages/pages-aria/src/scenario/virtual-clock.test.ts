import { describe, it, expect } from 'vitest';
import { DefaultVirtualClock } from './virtual-clock.js';

describe('DefaultVirtualClock', () => {
  it('starts at time zero', () => {
    const clock = new DefaultVirtualClock();
    expect(clock.now()).toBe(0);
  });

  it('advances by exact delta', () => {
    const clock = new DefaultVirtualClock();
    clock.advance(100);
    expect(clock.now()).toBe(100);
    clock.advance(50);
    expect(clock.now()).toBe(150);
  });

  it('defaults to speed 1', () => {
    const clock = new DefaultVirtualClock();
    expect(clock.speed()).toBe(1);
  });

  it('setSpeed updates speed', () => {
    const clock = new DefaultVirtualClock();
    clock.setSpeed(2);
    expect(clock.speed()).toBe(2);
  });

  it('setSpeed rejects zero', () => {
    const clock = new DefaultVirtualClock();
    expect(() => clock.setSpeed(0)).toThrow();
  });

  it('setSpeed rejects negative', () => {
    const clock = new DefaultVirtualClock();
    expect(() => clock.setSpeed(-1)).toThrow();
  });

  it('setSpeed rejects NaN', () => {
    const clock = new DefaultVirtualClock();
    expect(() => clock.setSpeed(NaN)).toThrow();
  });

  it('setSpeed accepts Infinity', () => {
    const clock = new DefaultVirtualClock();
    clock.setSpeed(Infinity);
    expect(clock.speed()).toBe(Infinity);
  });

  it('pause and resume', () => {
    const clock = new DefaultVirtualClock();
    expect(clock.isPaused()).toBe(false);
    clock.pause();
    expect(clock.isPaused()).toBe(true);
    clock.resume();
    expect(clock.isPaused()).toBe(false);
  });
});
