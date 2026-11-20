import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BuilderClipboard, getClipboard, _resetForTest } from './builder-clipboard.js';

describe('BuilderClipboard', () => {
  let cb: BuilderClipboard;

  beforeEach(() => {
    cb = new BuilderClipboard();
  });

  it('starts empty', () => {
    expect(cb.fragment).toBeNull();
    expect(cb.fragmentType).toBeNull();
    expect(cb.operation).toBeNull();
    expect(cb.insertMode).toBe(false);
  });

  it('set populates state and enters insert mode', () => {
    cb.set('type: metric', 'component', 'copy');
    expect(cb.fragment).toBe('type: metric');
    expect(cb.fragmentType).toBe('component');
    expect(cb.operation).toBe('copy');
    expect(cb.insertMode).toBe(true);
  });

  it('clear resets all state', () => {
    cb.set('type: metric', 'component', 'cut');
    cb.clear();
    expect(cb.fragment).toBeNull();
    expect(cb.fragmentType).toBeNull();
    expect(cb.operation).toBeNull();
    expect(cb.insertMode).toBe(false);
  });

  it('setInsertMode toggles mode without clearing fragment', () => {
    cb.set('type: metric', 'component', 'copy');
    cb.setInsertMode(false);
    expect(cb.insertMode).toBe(false);
    expect(cb.fragment).toBe('type: metric');
  });

  it('notifies subscribers on set', () => {
    const spy = vi.fn();
    cb.subscribe(spy);
    cb.set('type: metric', 'component', 'copy');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers on clear', () => {
    const spy = vi.fn();
    cb.set('type: metric', 'component', 'copy');
    cb.subscribe(spy);
    cb.clear();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers on setInsertMode', () => {
    const spy = vi.fn();
    cb.set('type: metric', 'component', 'copy');
    cb.subscribe(spy);
    cb.setInsertMode(false);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe stops notifications', () => {
    const spy = vi.fn();
    const unsub = cb.subscribe(spy);
    unsub();
    cb.set('type: metric', 'component', 'copy');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('getClipboard singleton', () => {
  beforeEach(() => {
    _resetForTest();
  });

  it('returns the same instance', () => {
    expect(getClipboard()).toBe(getClipboard());
  });
});
