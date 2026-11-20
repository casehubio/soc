import type { FrameLayout } from "@casehubio/pages-component";
export type Preset = "side-by-side" | "stacked" | "grid" | "main-sidebar" | "focus";
type CanvasSize = {
    width: number;
    height: number;
};
export declare function applyPreset(frames: readonly FrameLayout[], canvas: CanvasSize, preset: Preset): FrameLayout[];
export {};
//# sourceMappingURL=frame-organisers.d.ts.map