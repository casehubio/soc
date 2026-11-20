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
export declare class FixedHeightModel implements HeightModel {
    readonly rowCount: number;
    private readonly _height;
    readonly totalHeight: number;
    constructor(rowCount: number, _height: number);
    rowHeight(_index: number): number;
    offsetAtIndex(index: number): number;
    indexAtOffset(scrollTop: number): number;
}
export declare class CallbackHeightModel implements HeightModel {
    readonly totalHeight: number;
    readonly rowCount: number;
    private readonly _heights;
    private readonly _prefixSums;
    constructor(heights: readonly number[]);
    rowHeight(index: number): number;
    offsetAtIndex(index: number): number;
    indexAtOffset(scrollTop: number): number;
}
export declare class MeasuredHeightModel implements HeightModel {
    private _measured;
    private _keyMap;
    private _estimate;
    private _count;
    private _prefixSums;
    constructor(count: number);
    get rowCount(): number;
    get totalHeight(): number;
    rowHeight(index: number): number;
    offsetAtIndex(index: number): number;
    indexAtOffset(scrollTop: number): number;
    recordHeight(index: number, height: number, key?: string): boolean;
    remap(keyToNewIndex: Map<string, number>, newCount: number): void;
    extend(newCount: number): void;
    reset(newCount: number): void;
    private _updateEstimate;
    private _ensurePrefixSums;
}
import type { SpanMap } from './span-map.js';
export declare function extendWindowForSpans(window: ScrollWindow, spanMap: SpanMap, spanColumns: ReadonlySet<string>): ScrollWindow;
export declare function computeScrollWindow(scrollTop: number, containerHeight: number, heightModel: HeightModel, bufferSize: number): ScrollWindow;
//# sourceMappingURL=virtual-scroll-engine.d.ts.map