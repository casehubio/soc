import type { CompositorState, FrameLayout } from "@casehubio/pages-component";
import type { WorkspaceCompositor } from "./workspace-compositor.js";
interface EngineCapture {
    captureLayout(): readonly FrameLayout[];
}
export declare function captureCompositorState(compositor: WorkspaceCompositor, engineMap: Map<string, EngineCapture>): CompositorState;
export declare function restoreCompositorState(state: CompositorState): WorkspaceCompositor;
export declare function migrateFromLegacyFrames(frames: readonly FrameLayout[]): CompositorState;
export {};
//# sourceMappingURL=compositor-persistence.d.ts.map