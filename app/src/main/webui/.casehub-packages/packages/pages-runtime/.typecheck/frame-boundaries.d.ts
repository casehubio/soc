import type { SnapZone } from "@casehubio/pages-component";
type Position = {
    x: number;
    y: number;
};
type Size = {
    width: number;
    height: number;
};
export declare function clampPosition(pos: Position, size: Size, container: Size): Position;
export declare function nextFramePosition(container: Size, frameSize: Size, existing: readonly Position[], displacement?: number): Position;
export type EdgeZone = "left" | "right" | "top" | "bottom";
export declare function detectEdgeZone(pos: {
    x: number;
    y: number;
}, rect: {
    x: number;
    y: number;
    width: number;
    height: number;
}, threshold: number): EdgeZone | null;
export type SplitDirection = "h" | "v";
export declare function edgeToDirection(zone: EdgeZone): SplitDirection;
export declare function snapToZone(dragPosition: Position, containerSize: Size, threshold?: number): SnapZone | null;
export declare const DEFAULT_GAP = 8;
export declare function zoneToRect(zone: SnapZone, containerSize: Size, gap?: number): {
    position: Position;
    size: Size;
};
export declare function splitGeometry(zone: EdgeZone, targetRect: {
    x: number;
    y: number;
    width: number;
    height: number;
}, gap?: number): {
    target: {
        position: Position;
        size: Size;
    };
    newFrame: {
        position: Position;
        size: Size;
    };
};
export {};
//# sourceMappingURL=frame-boundaries.d.ts.map