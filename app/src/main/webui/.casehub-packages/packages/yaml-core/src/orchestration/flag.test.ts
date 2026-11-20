import { describe, it, expect } from 'vitest';
import { DefaultOrcFlag } from './flag.js';

describe('DefaultOrcFlag', () => {
  it('starts false', () => {
    expect(new DefaultOrcFlag().get()).toBe(false);
  });

  it('set makes it true', () => {
    const f = new DefaultOrcFlag();
    f.set();
    expect(f.get()).toBe(true);
  });

  it('clear makes it false', () => {
    const f = new DefaultOrcFlag();
    f.set();
    f.clear();
    expect(f.get()).toBe(false);
  });

  it('toggle flips and returns new value', () => {
    const f = new DefaultOrcFlag();
    expect(f.toggle()).toBe(true);
    expect(f.get()).toBe(true);
    expect(f.toggle()).toBe(false);
    expect(f.get()).toBe(false);
  });
});
