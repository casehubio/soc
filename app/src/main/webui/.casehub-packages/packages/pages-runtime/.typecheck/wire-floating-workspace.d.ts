import type { ContentFactory, FrameLayout, ContainerState } from "@casehubio/pages-component";
import { type FrameDetachHandler } from "./frame-detach-handler.js";
import { type ContainerToolbar } from "./frame-sandbox/container-toolbar";
import type { Container } from "./frame-sandbox/types.js";
export interface WireOptions {
    readonly detachEnabled?: boolean | undefined;
    readonly contentFactory?: ContentFactory | undefined;
    readonly signal?: AbortSignal | undefined;
    readonly existingContainer?: Container | undefined;
}
export interface WireHandle {
    readonly rootContainer: Container;
    readonly detachHandler?: FrameDetachHandler | undefined;
    readonly containerToolbar?: ContainerToolbar | undefined;
    captureState(): ContainerState;
    dispose(): void;
}
export declare function wireFloatingWorkspace(hostElement: HTMLElement, savedLayout?: ContainerState | readonly FrameLayout[], options?: WireOptions): WireHandle;
//# sourceMappingURL=wire-floating-workspace.d.ts.map