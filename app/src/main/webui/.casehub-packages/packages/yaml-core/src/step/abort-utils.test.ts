import { describe, it, expect } from 'vitest';
import { mergeAbortSignals } from './abort-utils.js';

describe('mergeAbortSignals', () => {
  it('returns child when parent is undefined', () => {
    const controller = new AbortController();
    expect(mergeAbortSignals(undefined, controller.signal)).toBe(controller.signal);
  });

  it('aborts when parent aborts', () => {
    const parent = new AbortController();
    const child = new AbortController();
    const merged = mergeAbortSignals(parent.signal, child.signal);
    expect(merged.aborted).toBe(false);
    parent.abort();
    expect(merged.aborted).toBe(true);
  });

  it('aborts when child aborts', () => {
    const parent = new AbortController();
    const child = new AbortController();
    const merged = mergeAbortSignals(parent.signal, child.signal);
    expect(merged.aborted).toBe(false);
    child.abort();
    expect(merged.aborted).toBe(true);
  });

  it('returns already-aborted signal when parent is aborted', () => {
    const parent = new AbortController();
    parent.abort();
    const child = new AbortController();
    const merged = mergeAbortSignals(parent.signal, child.signal);
    expect(merged.aborted).toBe(true);
  });
});
