import type { FrameConfig } from "@casehubio/pages-component";
import type { FloatingFrameEngine } from "./floating-frame-engine.js";
import type { FloatingFrameBackend } from "./floating-frame-backend.js";
export interface NestedWorkspaceRef {
    engine: FloatingFrameEngine | undefined;
}
export interface ContentManager {
    getRef(tabKey: string): NestedWorkspaceRef;
    getNestedEngine(tabKey: string): FloatingFrameEngine | undefined;
    isInAccordionMode(tabKey: string): boolean;
    setEngine(engine: FloatingFrameEngine): void;
    reconnectOrCreate(engine: FloatingFrameEngine, backend: FloatingFrameBackend, ref: NestedWorkspaceRef, configs?: readonly FrameConfig[]): void;
}
export declare function createContentManager(): ContentManager;
//# sourceMappingURL=workspace-content-lifecycle.d.ts.map