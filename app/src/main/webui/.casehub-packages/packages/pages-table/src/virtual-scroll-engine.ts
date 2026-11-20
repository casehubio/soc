export interface ScrollWindow {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly offsetY: number;
  readonly totalHeight: number;
}

export interface HeightModel {
  readonly totalHeight: number;
  readonly rowCount: number;
  rowHeight(index: number): number;
  offsetAtIndex(index: number): number;
  indexAtOffset(scrollTop: number): number;
}

export class FixedHeightModel implements HeightModel {
  readonly totalHeight: number;
  constructor(readonly rowCount: number, private readonly _height: number) {
    this.totalHeight = rowCount * _height;
  }
  rowHeight(_index: number): number { return this._height; }
  offsetAtIndex(index: number): number { return index * this._height; }
  indexAtOffset(scrollTop: number): number {
    return Math.min(this.rowCount, Math.floor(scrollTop / this._height));
  }
}

export class CallbackHeightModel implements HeightModel {
  readonly totalHeight: number;
  readonly rowCount: number;
  private readonly _heights: readonly number[];
  private readonly _prefixSums: readonly number[];

  constructor(heights: readonly number[]) {
    this.rowCount = heights.length;
    const clamped = heights.map(h => h > 0 ? h : 1);
    this._heights = clamped;
    const sums = new Array<number>(clamped.length + 1);
    sums[0] = 0;
    for (let i = 0; i < clamped.length; i++) {
      sums[i + 1] = sums[i]! + clamped[i]!;
    }
    this._prefixSums = sums;
    this.totalHeight = sums[clamped.length]!;
  }

  rowHeight(index: number): number { return this._heights[index] ?? 1; }

  offsetAtIndex(index: number): number { return this._prefixSums[index] ?? this.totalHeight; }

  indexAtOffset(scrollTop: number): number {
    if (this.rowCount === 0) return 0;
    let lo = 0, hi = this.rowCount;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this._prefixSums[mid + 1]! <= scrollTop) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
}

const DEFAULT_ESTIMATE = 48;

export class MeasuredHeightModel implements HeightModel {
  private _measured = new Map<number, number>();
  private _keyMap = new Map<string, number>();
  private _estimate = DEFAULT_ESTIMATE;
  private _count: number;
  private _prefixSums: number[] | null = null;

  constructor(count: number) { this._count = count; }

  get rowCount(): number { return this._count; }

  get totalHeight(): number {
    this._ensurePrefixSums();
    return this._prefixSums![this._count]!;
  }

  rowHeight(index: number): number {
    return this._measured.get(index) ?? this._estimate;
  }

  offsetAtIndex(index: number): number {
    this._ensurePrefixSums();
    return this._prefixSums![index] ?? this.totalHeight;
  }

  indexAtOffset(scrollTop: number): number {
    if (this._count === 0) return 0;
    this._ensurePrefixSums();
    const sums = this._prefixSums!;
    let lo = 0, hi = this._count;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (sums[mid + 1]! <= scrollTop) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  recordHeight(index: number, height: number, key?: string): boolean {
    const prev = this._measured.get(index);
    if (prev === height) return false;
    this._measured.set(index, height);
    if (key !== undefined) this._keyMap.set(key, height);
    this._updateEstimate();
    this._prefixSums = null;
    return true;
  }

  remap(keyToNewIndex: Map<string, number>, newCount: number): void {
    const newMeasured = new Map<number, number>();
    for (const [key, height] of this._keyMap) {
      const newIdx = keyToNewIndex.get(key);
      if (newIdx !== undefined) newMeasured.set(newIdx, height);
    }
    this._measured = newMeasured;
    this._count = newCount;
    this._prefixSums = null;
  }

  extend(newCount: number): void {
    this._count = newCount;
    this._prefixSums = null;
  }

  reset(newCount: number): void {
    this._measured.clear();
    this._keyMap.clear();
    this._estimate = DEFAULT_ESTIMATE;
    this._count = newCount;
    this._prefixSums = null;
  }

  private _updateEstimate(): void {
    if (this._measured.size === 0) { this._estimate = DEFAULT_ESTIMATE; return; }
    let sum = 0;
    for (const h of this._measured.values()) sum += h;
    this._estimate = sum / this._measured.size;
  }

  private _ensurePrefixSums(): void {
    if (this._prefixSums !== null) return;
    const sums = new Array<number>(this._count + 1);
    sums[0] = 0;
    for (let i = 0; i < this._count; i++) {
      sums[i + 1] = sums[i]! + this.rowHeight(i);
    }
    this._prefixSums = sums;
  }
}

import type { SpanMap } from './span-map.js';
import { isSuppressed, isOrigin } from './span-map.js';

export function extendWindowForSpans(
  window: ScrollWindow,
  spanMap: SpanMap,
  spanColumns: ReadonlySet<string>,
): ScrollWindow {
  if (spanMap.size === 0 || spanColumns.size === 0) return window;

  let { startIndex, endIndex } = window;
  const originalStart = startIndex;

  for (const colId of spanColumns) {
    const entry = spanMap.get(originalStart)?.get(colId);
    if (entry && isSuppressed(entry)) {
      startIndex = Math.min(startIndex, entry.originRow);
    }
  }

  for (let r = Math.max(startIndex, endIndex - 10); r < endIndex; r++) {
    const rowEntries = spanMap.get(r);
    if (!rowEntries) continue;
    for (const [colId, entry] of rowEntries) {
      if (!spanColumns.has(colId)) continue;
      if (isOrigin(entry) && r + entry.rowSpan > endIndex) {
        endIndex = Math.max(endIndex, r + entry.rowSpan);
      }
    }
  }

  return { ...window, startIndex, endIndex };
}

export function computeScrollWindow(
  scrollTop: number,
  containerHeight: number,
  heightModel: HeightModel,
  bufferSize: number,
): ScrollWindow {
  const { totalHeight, rowCount } = heightModel;

  if (rowCount === 0) {
    return { startIndex: 0, endIndex: 0, offsetY: 0, totalHeight: 0 };
  }

  const firstVisible = heightModel.indexAtOffset(scrollTop);
  const viewportEnd = scrollTop + containerHeight;
  let endVisible = firstVisible;
  while (endVisible < rowCount && heightModel.offsetAtIndex(endVisible) < viewportEnd) {
    endVisible++;
  }
  const visibleCount = endVisible - firstVisible;

  const startIndex = Math.max(0, firstVisible - bufferSize);
  const endIndex = Math.min(rowCount, firstVisible + visibleCount + bufferSize);
  const offsetY = heightModel.offsetAtIndex(startIndex);

  return { startIndex, endIndex, offsetY, totalHeight };
}
