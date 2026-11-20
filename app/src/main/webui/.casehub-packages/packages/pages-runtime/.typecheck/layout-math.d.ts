export type Preset = "side-by-side" | "stacked" | "grid" | "main-sidebar" | "focus";
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}
interface CanvasSize {
    width: number;
    height: number;
}
export declare function computeZonePreset(preset: Preset, count: number, canvas: CanvasSize): Rect[];
export declare function scaleProportionally(entries: readonly Rect[], oldSize: CanvasSize, newSize: CanvasSize): Rect[];
export {};
//# sourceMappingURL=layout-math.d.ts.map