import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { injectStyles, highlightElement, typeText, completeTypingNow } from './visual-feedback.js';

describe('injectStyles', () => {
  afterEach(() => {
    document.getElementById('scenario-feedback-styles')?.remove();
  });

  it('injects a style tag into document head', () => {
    injectStyles();
    const style = document.getElementById('scenario-feedback-styles');
    expect(style).not.toBeNull();
    expect(style?.tagName).toBe('STYLE');
  });

  it('is idempotent — second call does not duplicate', () => {
    injectStyles();
    injectStyles();
    const styles = document.querySelectorAll('#scenario-feedback-styles');
    expect(styles.length).toBe(1);
  });

  it('contains highlight and typing classes', () => {
    injectStyles();
    const style = document.getElementById('scenario-feedback-styles');
    expect(style?.textContent).toContain('scenario-highlight');
    expect(style?.textContent).toContain('scenario-typing');
    expect(style?.textContent).toContain('scenario-pulse');
  });
});

describe('highlightElement', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds scenario-highlight-click class for click type', () => {
    const el = document.createElement('button');
    highlightElement(el, 'click');
    expect(el.classList.contains('scenario-highlight-click')).toBe(true);
  });

  it('adds scenario-highlight class for fill type', () => {
    const el = document.createElement('input');
    highlightElement(el, 'fill');
    expect(el.classList.contains('scenario-highlight')).toBe(true);
  });

  it('removes class after delay', () => {
    const el = document.createElement('button');
    highlightElement(el, 'click');
    expect(el.classList.contains('scenario-highlight-click')).toBe(true);
    vi.advanceTimersByTime(900);
    expect(el.classList.contains('scenario-highlight-click')).toBe(false);
  });
});

describe('typeText', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('progressively fills the input value', async () => {
    const el = document.createElement('input');
    document.body.appendChild(el);

    const promise = typeText(el, 'abc', 10);

    expect(el.classList.contains('scenario-typing')).toBe(true);

    await vi.advanceTimersByTimeAsync(10);
    expect(el.value).toBe('a');

    await vi.advanceTimersByTimeAsync(10);
    expect(el.value).toBe('ab');

    await vi.advanceTimersByTimeAsync(10);
    expect(el.value).toBe('abc');

    await promise;
    expect(el.classList.contains('scenario-typing')).toBe(false);
    el.remove();
  });

  it('dispatches input event for each character', async () => {
    const el = document.createElement('input');
    document.body.appendChild(el);

    const inputSpy = vi.fn();
    el.addEventListener('input', inputSpy);

    const promise = typeText(el, 'hi', 10);

    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(10);
    await promise;

    expect(inputSpy).toHaveBeenCalledTimes(2);
    el.remove();
  });

  it('dispatches change event after completion', async () => {
    const el = document.createElement('input');
    document.body.appendChild(el);

    const changeSpy = vi.fn();
    el.addEventListener('change', changeSpy);

    const promise = typeText(el, 'x', 10);
    await vi.advanceTimersByTimeAsync(10);
    await promise;

    expect(changeSpy).toHaveBeenCalledTimes(1);
    el.remove();
  });

  it('handles empty value', async () => {
    const el = document.createElement('input');
    document.body.appendChild(el);

    const promise = typeText(el, '', 10);
    await promise;

    expect(el.value).toBe('');
    el.remove();
  });

  it('works with textarea', async () => {
    const el = document.createElement('textarea');
    document.body.appendChild(el);

    const promise = typeText(el, 'ab', 10);
    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(10);
    await promise;

    expect(el.value).toBe('ab');
    el.remove();
  });

  it('completeTypingNow fills remaining value instantly', async () => {
    const el = document.createElement('input');
    document.body.appendChild(el);

    const promise = typeText(el, 'abcde', 50);

    await vi.advanceTimersByTimeAsync(50);
    expect(el.value).toBe('a');

    completeTypingNow();
    await vi.advanceTimersByTimeAsync(50);
    await promise;

    expect(el.value).toBe('abcde');
    el.remove();
  });

  it('completeTypingNow does not affect subsequent typeText calls', async () => {
    const el = document.createElement('input');
    document.body.appendChild(el);

    const promise = typeText(el, 'abcde', 50);
    await vi.advanceTimersByTimeAsync(50);
    expect(el.value).toBe('a');

    completeTypingNow();
    await vi.advanceTimersByTimeAsync(50);
    await promise;
    expect(el.value).toBe('abcde');

    const el2 = document.createElement('input');
    document.body.appendChild(el2);
    const promise2 = typeText(el2, 'xy', 10);
    await vi.advanceTimersByTimeAsync(10);
    expect(el2.value).toBe('x');
    await vi.advanceTimersByTimeAsync(10);
    await promise2;
    expect(el2.value).toBe('xy');

    el.remove();
    el2.remove();
  });
});
