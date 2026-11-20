export type EdgeZone = "left" | "right" | "top" | "bottom";
export declare function detectEdgeZone(pos: {
    x: number;
    y: number;
}, container: {
    x: number;
    y: number;
    width: number;
    height: number;
}, threshold: number): EdgeZone | null;
export declare function edgeToDirection(zone: EdgeZone): "h" | "v";
export interface CompositorDragCallbacks {
    onTabReorder(regionId: string, tabId: string, newIndex: number): void;
    onTabMoveToRegion(tabId: string, fromRegionId: string, toRegionId: string): void;
    onSplitCreate(regionId: string, tabId: string, direction: "h" | "v"): void;
}
export declare function setupCompositorDrag(container: HTMLElement, callbacks: CompositorDragCallbacks, signal: AbortSignal): void;
//# sourceMappingURL=compositor-drag.d.ts.map