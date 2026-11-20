import type { FrameConfig, FrameLayout, FrameTabConfig, SnapZone } from "@casehubio/pages-component";
import type { FloatingFrameBackend } from "./floating-frame-backend.js";
import { type Preset } from "./frame-organisers.js";
export interface FloatingFrameEngine {
    readonly frames: ReadonlyMap<string, FrameLayout>;
    createFrame(config: FrameConfig): FrameLayout;
    removeFrame(key: string): void;
    hideFrame(key: string): void;
    showFrame(key: string): void;
    addTab(frameKey: string, tab: FrameTabConfig, options?: {
        skipBackend?: boolean;
    }): void;
    removeTab(frameKey: string, tabKey: string, options?: {
        skipBackend?: boolean;
    }): void;
    moveTab(fromFrame: string, tabKey: string, toFrame: string): void;
    setActiveTab(frameKey: string, tabKey: string): void;
    bringToFront(key: string): void;
    togglePin(key: string): void;
    updatePosition(key: string, pos: {
        x: number;
        y: number;
    }): void;
    updateSize(key: string, size: {
        width: number;
        height: number;
    }): void;
    setDetached(key: string, detached: boolean): void;
    snapFrame(key: string, zone: SnapZone, canvasSize: {
        width: number;
        height: number;
    }): void;
    unsnapFrame(key: string): void;
    recomputeSnappedFrames(canvasSize: {
        width: number;
        height: number;
    }): void;
    focusDirection(direction: "up" | "down" | "left" | "right"): string | null;
    applyOrganiser(preset: Preset, canvasSize?: {
        width: number;
        height: number;
    }): void;
    reorderTabs(frameKey: string, tabKeys: readonly string[]): void;
    setBackend(newBackend: FloatingFrameBackend): void;
    renderAll(): void;
    toggleViewMode(key: string): void;
    setAccordionState(key: string, state: {
        collapsed: readonly string[];
        heights: Readonly<Record<string, number>>;
    }): void;
    captureLayout(): readonly FrameLayout[];
    restoreLayout(saved: readonly FrameLayout[]): void;
    dispose(): void;
}
export declare function createFloatingFrameEngine(initialBackend: FloatingFrameBackend, savedLayout?: readonly FrameLayout[]): FloatingFrameEngine;
//# sourceMappingURL=floating-frame-engine.d.ts.map