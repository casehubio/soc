import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { subscribe, unsubscribe } from './shared-timer-controller.js';

describe('SharedTimerController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls subscriber every second', () => {
    const cb = vi.fn();
    subscribe(cb);
    vi.advanceTimersByTime(3000);
    expect(cb).toHaveBeenCalledTimes(3);
    unsubscribe(cb);
  });

  it('does not tick when no subscribers', () => {
    const cb = vi.fn();
    subscribe(cb);
    unsubscribe(cb);
    vi.advanceTimersByTime(3000);
    expect(cb).toHaveBeenCalledTimes(0);
  });

  it('shares a single interval across multiple subscribers', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    subscribe(cb1);
    subscribe(cb2);
    vi.advanceTimersByTime(1000);
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
    unsubscribe(cb1);
    vi.advanceTimersByTime(1000);
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(2);
    unsubscribe(cb2);
  });

  it('stops interval when last subscriber unsubscribes', () => {
    const cb = vi.fn();
    subscribe(cb);
    vi.advanceTimersByTime(1000);
    unsubscribe(cb);
    vi.advanceTimersByTime(5000);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('restarts interval when new subscriber arrives after all unsubscribed', () => {
    const cb1 = vi.fn();
    subscribe(cb1);
    vi.advanceTimersByTime(1000);
    unsubscribe(cb1);

    const cb2 = vi.fn();
    subscribe(cb2);
    vi.advanceTimersByTime(2000);
    expect(cb2).toHaveBeenCalledTimes(2);
    unsubscribe(cb2);
  });

  it('pauses when document is hidden', () => {
    const cb = vi.fn();
    subscribe(cb);
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(3000);
    expect(cb).toHaveBeenCalledTimes(0);

    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(1000);
    expect(cb).toHaveBeenCalledTimes(1);
    unsubscribe(cb);
  });

  it('ignores duplicate subscribe calls', () => {
    const cb = vi.fn();
    subscribe(cb);
    subscribe(cb);
    vi.advanceTimersByTime(1000);
    expect(cb).toHaveBeenCalledTimes(1);
    unsubscribe(cb);
  });

  it('ignores unsubscribe for unknown callback', () => {
    const cb = vi.fn();
    expect(() => unsubscribe(cb)).not.toThrow();
  });
});
