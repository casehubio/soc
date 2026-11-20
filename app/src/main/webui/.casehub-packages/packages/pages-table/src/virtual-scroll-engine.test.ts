import { describe, it, expect } from 'vitest';
import { computeScrollWindow, extendWindowForSpans, FixedHeightModel, CallbackHeightModel, MeasuredHeightModel } from './virtual-scroll-engine.js';
import type { SpanMap, SpanEntry } from './span-map.js';

describe('computeScrollWindow', () => {
  it('returns full range for small datasets', () => {
    const w = computeScrollWindow(0, 500, new FixedHeightModel(5, 48), 5);
    expect(w).toEqual({ startIndex: 0, endIndex: 5, offsetY: 0, totalHeight: 240 });
  });

  it('returns empty range for zero rows', () => {
    const w = computeScrollWindow(0, 500, new FixedHeightModel(0, 48), 5);
    expect(w).toEqual({ startIndex: 0, endIndex: 0, offsetY: 0, totalHeight: 0 });
  });

  it('computes visible window at top', () => {
    const w = computeScrollWindow(0, 480, new FixedHeightModel(100, 48), 5);
    expect(w.startIndex).toBe(0);
    expect(w.endIndex).toBe(15);
    expect(w.offsetY).toBe(0);
    expect(w.totalHeight).toBe(4800);
  });

  it('computes visible window at scroll offset', () => {
    const w = computeScrollWindow(960, 480, new FixedHeightModel(100, 48), 5);
    expect(w.startIndex).toBe(15);
    expect(w.endIndex).toBe(35);
    expect(w.offsetY).toBe(720);
  });

  it('clamps to dataset bounds', () => {
    const w = computeScrollWindow(4500, 480, new FixedHeightModel(100, 48), 5);
    expect(w.endIndex).toBe(100);
    expect(w.startIndex).toBeLessThan(100);
  });

  it('handles single row', () => {
    const w = computeScrollWindow(0, 500, new FixedHeightModel(1, 48), 5);
    expect(w).toEqual({ startIndex: 0, endIndex: 1, offsetY: 0, totalHeight: 48 });
  });

  it('handles container taller than content', () => {
    const w = computeScrollWindow(0, 1000, new FixedHeightModel(10, 48), 5);
    expect(w.startIndex).toBe(0);
    expect(w.endIndex).toBe(10);
    expect(w.totalHeight).toBe(480);
  });

  it('computes window with CallbackHeightModel (varying heights)', () => {
    const heights = [48, 72, 48, 96, 48, 48, 72, 48, 96, 48];
    const m = new CallbackHeightModel(heights);
    const w = computeScrollWindow(0, 200, m, 2);
    expect(w.startIndex).toBe(0);
    expect(w.offsetY).toBe(0);
    expect(w.totalHeight).toBe(624);
  });

  it('computes window with MeasuredHeightModel', () => {
    const m = new MeasuredHeightModel(100);
    m.recordHeight(0, 72);
    m.recordHeight(1, 72);
    const w = computeScrollWindow(0, 480, m, 5);
    expect(w.startIndex).toBe(0);
    expect(w.totalHeight).toBeGreaterThan(0);
  });
});

describe('extendWindowForSpans', () => {
  it('extends startIndex when a suppressed cell points to an earlier origin', () => {
    const spanMap: SpanMap = new Map([
      [5, new Map<string, SpanEntry>([['country', { colSpan: 1, rowSpan: 4 }]])],
      [6, new Map<string, SpanEntry>([['country', { originRow: 5, originCol: 'country' }]])],
      [7, new Map<string, SpanEntry>([['country', { originRow: 5, originCol: 'country' }]])],
      [8, new Map<string, SpanEntry>([['country', { originRow: 5, originCol: 'country' }]])],
    ]);
    const window = { startIndex: 7, endIndex: 20, offsetY: 336, totalHeight: 4800 };
    const result = extendWindowForSpans(window, spanMap, new Set(['country']));
    expect(result.startIndex).toBe(5);
  });

  it('returns unchanged window when no spans at boundaries', () => {
    const spanMap: SpanMap = new Map();
    const window = { startIndex: 10, endIndex: 25, offsetY: 480, totalHeight: 4800 };
    const result = extendWindowForSpans(window, spanMap, new Set(['country']));
    expect(result.startIndex).toBe(10);
    expect(result.endIndex).toBe(25);
  });

  it('extends endIndex when an origin span exceeds the window', () => {
    const spanMap: SpanMap = new Map([
      [23, new Map<string, SpanEntry>([['country', { colSpan: 1, rowSpan: 5 }]])],
    ]);
    const window = { startIndex: 10, endIndex: 25, offsetY: 480, totalHeight: 4800 };
    const result = extendWindowForSpans(window, spanMap, new Set(['country']));
    expect(result.endIndex).toBe(28);
  });

  it('handles multiple span columns — extends to earliest origin', () => {
    const spanMap: SpanMap = new Map([
      [3, new Map<string, SpanEntry>([['name', { colSpan: 1, rowSpan: 5 }]])],
      [5, new Map<string, SpanEntry>([['country', { colSpan: 1, rowSpan: 4 }]])],
      [7, new Map<string, SpanEntry>([
        ['country', { originRow: 5, originCol: 'country' }],
        ['name', { originRow: 3, originCol: 'name' }],
      ])],
    ]);
    const window = { startIndex: 7, endIndex: 20, offsetY: 336, totalHeight: 4800 };
    const result = extendWindowForSpans(window, spanMap, new Set(['country', 'name']));
    expect(result.startIndex).toBe(3);
  });

  it('ignores columns not in spanColumns set', () => {
    const spanMap: SpanMap = new Map([
      [5, new Map<string, SpanEntry>([['country', { colSpan: 1, rowSpan: 4 }]])],
      [7, new Map<string, SpanEntry>([['country', { originRow: 5, originCol: 'country' }]])],
    ]);
    const window = { startIndex: 7, endIndex: 20, offsetY: 336, totalHeight: 4800 };
    const result = extendWindowForSpans(window, spanMap, new Set(['name']));
    expect(result.startIndex).toBe(7);
  });

  it('does not extend when startIndex cell is an origin (not suppressed)', () => {
    const spanMap: SpanMap = new Map([
      [7, new Map<string, SpanEntry>([['country', { colSpan: 1, rowSpan: 3 }]])],
    ]);
    const window = { startIndex: 7, endIndex: 20, offsetY: 336, totalHeight: 4800 };
    const result = extendWindowForSpans(window, spanMap, new Set(['country']));
    expect(result.startIndex).toBe(7);
  });
});

describe('FixedHeightModel', () => {
  it('computes totalHeight as count * height', () => {
    const m = new FixedHeightModel(100, 48);
    expect(m.totalHeight).toBe(4800);
  });

  it('returns fixed height for any index', () => {
    const m = new FixedHeightModel(100, 48);
    expect(m.rowHeight(0)).toBe(48);
    expect(m.rowHeight(50)).toBe(48);
    expect(m.rowHeight(99)).toBe(48);
  });

  it('computes offsetAtIndex as index * height', () => {
    const m = new FixedHeightModel(100, 48);
    expect(m.offsetAtIndex(0)).toBe(0);
    expect(m.offsetAtIndex(10)).toBe(480);
    expect(m.offsetAtIndex(100)).toBe(4800);
  });

  it('computes indexAtOffset as floor(scrollTop / height)', () => {
    const m = new FixedHeightModel(100, 48);
    expect(m.indexAtOffset(0)).toBe(0);
    expect(m.indexAtOffset(480)).toBe(10);
    expect(m.indexAtOffset(500)).toBe(10);
    expect(m.indexAtOffset(4800)).toBe(100);
  });

  it('handles zero rows', () => {
    const m = new FixedHeightModel(0, 48);
    expect(m.totalHeight).toBe(0);
    expect(m.rowCount).toBe(0);
  });

  it('handles single row', () => {
    const m = new FixedHeightModel(1, 48);
    expect(m.totalHeight).toBe(48);
    expect(m.offsetAtIndex(0)).toBe(0);
    expect(m.offsetAtIndex(1)).toBe(48);
    expect(m.indexAtOffset(0)).toBe(0);
  });
});

describe('CallbackHeightModel', () => {
  it('computes prefix sums for varying heights', () => {
    const heights = [48, 72, 48, 96, 48];
    const m = new CallbackHeightModel(heights);
    expect(m.totalHeight).toBe(312);
    expect(m.offsetAtIndex(0)).toBe(0);
    expect(m.offsetAtIndex(1)).toBe(48);
    expect(m.offsetAtIndex(2)).toBe(120);
    expect(m.offsetAtIndex(3)).toBe(168);
    expect(m.offsetAtIndex(4)).toBe(264);
    expect(m.offsetAtIndex(5)).toBe(312);
  });

  it('binary search finds correct index at exact boundaries', () => {
    const heights = [48, 72, 48, 96, 48];
    const m = new CallbackHeightModel(heights);
    expect(m.indexAtOffset(0)).toBe(0);
    expect(m.indexAtOffset(48)).toBe(1);
    expect(m.indexAtOffset(120)).toBe(2);
    expect(m.indexAtOffset(168)).toBe(3);
    expect(m.indexAtOffset(264)).toBe(4);
  });

  it('binary search finds correct index mid-row', () => {
    const heights = [48, 72, 48, 96, 48];
    const m = new CallbackHeightModel(heights);
    expect(m.indexAtOffset(24)).toBe(0);
    expect(m.indexAtOffset(100)).toBe(1);
    expect(m.indexAtOffset(200)).toBe(3);
  });

  it('returns correct rowHeight for each index', () => {
    const heights = [48, 72, 48, 96, 48];
    const m = new CallbackHeightModel(heights);
    expect(m.rowHeight(0)).toBe(48);
    expect(m.rowHeight(1)).toBe(72);
    expect(m.rowHeight(3)).toBe(96);
  });

  it('degenerates to FixedHeightModel for uniform heights', () => {
    const heights = Array.from({ length: 100 }, () => 48);
    const m = new CallbackHeightModel(heights);
    const f = new FixedHeightModel(100, 48);
    expect(m.totalHeight).toBe(f.totalHeight);
    expect(m.offsetAtIndex(50)).toBe(f.offsetAtIndex(50));
    expect(m.indexAtOffset(960)).toBe(f.indexAtOffset(960));
  });

  it('clamps heights <= 0 to 1px', () => {
    const heights = [48, 0, -10, 48];
    const m = new CallbackHeightModel(heights);
    expect(m.rowHeight(1)).toBe(1);
    expect(m.rowHeight(2)).toBe(1);
    expect(m.totalHeight).toBe(98);
  });

  it('handles zero rows', () => {
    const m = new CallbackHeightModel([]);
    expect(m.totalHeight).toBe(0);
    expect(m.rowCount).toBe(0);
  });
});

describe('MeasuredHeightModel', () => {
  it('returns 48px estimate for all rows initially', () => {
    const m = new MeasuredHeightModel(100);
    expect(m.totalHeight).toBe(4800);
    expect(m.rowHeight(0)).toBe(48);
    expect(m.rowHeight(99)).toBe(48);
  });

  it('returns measured height after recordHeight', () => {
    const m = new MeasuredHeightModel(100);
    m.recordHeight(5, 72);
    expect(m.rowHeight(5)).toBe(72);
    expect(m.rowHeight(6)).toBe(72);
  });

  it('updates estimate to average of measurements', () => {
    const m = new MeasuredHeightModel(100);
    m.recordHeight(0, 60);
    m.recordHeight(1, 80);
    expect(m.rowHeight(50)).toBe(70);
  });

  it('updates totalHeight after measurements', () => {
    const m = new MeasuredHeightModel(10);
    m.recordHeight(0, 72);
    m.recordHeight(1, 72);
    expect(m.totalHeight).toBe(72 + 72 + 8 * 72);
  });

  it('computes prefix sums with mixed measured and estimated', () => {
    const m = new MeasuredHeightModel(5);
    m.recordHeight(0, 60);
    m.recordHeight(1, 80);
    expect(m.offsetAtIndex(0)).toBe(0);
    expect(m.offsetAtIndex(1)).toBe(60);
    expect(m.offsetAtIndex(2)).toBe(140);
    expect(m.offsetAtIndex(3)).toBe(140 + 70);
  });

  it('invalidates prefix sums on new measurement', () => {
    const m = new MeasuredHeightModel(5);
    const t1 = m.totalHeight;
    m.recordHeight(0, 96);
    expect(m.totalHeight).not.toBe(t1);
  });

  it('returns false from recordHeight when height unchanged', () => {
    const m = new MeasuredHeightModel(10);
    expect(m.recordHeight(0, 72)).toBe(true);
    expect(m.recordHeight(0, 72)).toBe(false);
  });

  it('overwrites on re-measurement with different height', () => {
    const m = new MeasuredHeightModel(10);
    m.recordHeight(0, 72);
    m.recordHeight(0, 96);
    expect(m.rowHeight(0)).toBe(96);
  });

  it('reset() clears everything and re-seeds estimate', () => {
    const m = new MeasuredHeightModel(100);
    m.recordHeight(0, 72);
    m.recordHeight(1, 96);
    m.reset(50);
    expect(m.rowCount).toBe(50);
    expect(m.rowHeight(0)).toBe(48);
    expect(m.totalHeight).toBe(2400);
  });

  it('remap preserves measurements at new indices', () => {
    const m = new MeasuredHeightModel(5);
    m.recordHeight(0, 60, 'a');
    m.recordHeight(1, 80, 'b');
    m.recordHeight(2, 40, 'c');
    m.remap(new Map([['b', 0], ['c', 1], ['a', 2]]), 3);
    expect(m.rowHeight(0)).toBe(80);
    expect(m.rowHeight(1)).toBe(40);
    expect(m.rowHeight(2)).toBe(60);
  });

  it('remap without matching keys falls back to estimate', () => {
    const m = new MeasuredHeightModel(5);
    m.recordHeight(0, 60);
    m.recordHeight(1, 80);
    m.remap(new Map(), 5);
    expect(m.rowHeight(0)).toBe(70);
    expect(m.rowHeight(1)).toBe(70);
  });

  it('extend preserves existing measurements for load-more', () => {
    const m = new MeasuredHeightModel(5);
    m.recordHeight(0, 60);
    m.recordHeight(1, 80);
    m.extend(10);
    expect(m.rowCount).toBe(10);
    expect(m.rowHeight(0)).toBe(60);
    expect(m.rowHeight(1)).toBe(80);
    expect(m.rowHeight(5)).toBe(70);
  });

  it('handles zero rows', () => {
    const m = new MeasuredHeightModel(0);
    expect(m.totalHeight).toBe(0);
    expect(m.rowCount).toBe(0);
  });

  it('indexAtOffset uses binary search on prefix sums', () => {
    const m = new MeasuredHeightModel(5);
    m.recordHeight(0, 100);
    m.recordHeight(1, 50);
    expect(m.indexAtOffset(0)).toBe(0);
    expect(m.indexAtOffset(100)).toBe(1);
    expect(m.indexAtOffset(125)).toBe(1);
    expect(m.indexAtOffset(150)).toBe(2);
  });

  it('all rows measured leaves no estimates', () => {
    const m = new MeasuredHeightModel(3);
    m.recordHeight(0, 40);
    m.recordHeight(1, 60);
    m.recordHeight(2, 80);
    expect(m.totalHeight).toBe(180);
    expect(m.offsetAtIndex(1)).toBe(40);
    expect(m.offsetAtIndex(2)).toBe(100);
    expect(m.offsetAtIndex(3)).toBe(180);
  });

  it('very tall row among short rows', () => {
    const m = new MeasuredHeightModel(5);
    m.recordHeight(0, 32);
    m.recordHeight(1, 32);
    m.recordHeight(2, 500);
    m.recordHeight(3, 32);
    m.recordHeight(4, 32);
    expect(m.totalHeight).toBe(628);
    expect(m.indexAtOffset(64)).toBe(2);
    expect(m.indexAtOffset(500)).toBe(2);
    expect(m.indexAtOffset(564)).toBe(3);
  });
});

describe('computeScrollWindow with variable heights', () => {
  it('handles alternating heights correctly', () => {
    const heights = Array.from({ length: 100 }, (_, i) => i % 2 === 0 ? 48 : 72);
    const m = new CallbackHeightModel(heights);
    const w = computeScrollWindow(0, 480, m, 5);
    expect(w.startIndex).toBe(0);
    expect(w.totalHeight).toBe(6000);
  });

  it('virtual scroll window at middle with variable heights', () => {
    const heights = Array.from({ length: 100 }, (_, i) => i % 3 === 0 ? 96 : 48);
    const m = new CallbackHeightModel(heights);
    const scrollTo = m.offsetAtIndex(50);
    const w = computeScrollWindow(scrollTo, 480, m, 5);
    expect(w.startIndex).toBeLessThanOrEqual(50);
    expect(w.endIndex).toBeGreaterThan(50);
  });

  it('MeasuredHeightModel gives valid window after partial measurement', () => {
    const m = new MeasuredHeightModel(200);
    for (let i = 0; i < 15; i++) m.recordHeight(i, 64);
    const w = computeScrollWindow(0, 480, m, 5);
    expect(w.startIndex).toBe(0);
    expect(w.endIndex).toBeGreaterThan(5);
    expect(w.totalHeight).toBeGreaterThan(0);
  });

  it('buffer with tall rows covers more pixels', () => {
    const heights = Array.from({ length: 50 }, () => 200);
    const m = new CallbackHeightModel(heights);
    const w = computeScrollWindow(2000, 400, m, 3);
    expect(w.startIndex).toBeLessThan(10);
    expect(w.endIndex - w.startIndex).toBeLessThanOrEqual(10);
  });
});
