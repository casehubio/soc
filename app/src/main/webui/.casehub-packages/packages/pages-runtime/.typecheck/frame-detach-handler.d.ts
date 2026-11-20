import type { ContentFactory } from "@casehubio/pages-component";
import type { Container } from "./frame-sandbox/types.js";
export interface FrameDetachHandler {
    detach(frameKey: string): void;
    reattach(frameKey: string): void;
    dispose(): void;
}
export declare function createFrameDetachHandler(rootContainer: Container, container: HTMLElement, contentFactory: ContentFactory, signal: AbortSignal): FrameDetachHandler;
//# sourceMappingURL=frame-detach-handler.d.ts.map