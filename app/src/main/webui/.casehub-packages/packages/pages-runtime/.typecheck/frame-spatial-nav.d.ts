export interface SpatialFrame {
    readonly position: {
        readonly x: number;
        readonly y: number;
    };
    readonly size: {
        readonly width: number;
        readonly height: number;
    };
    readonly hidden?: boolean;
}
type Direction = "up" | "down" | "left" | "right";
export declare function findSpatialTarget(frames: ReadonlyMap<string, SpatialFrame>, current: string, direction: Direction): string | null;
export {};
//# sourceMappingURL=frame-spatial-nav.d.ts.map