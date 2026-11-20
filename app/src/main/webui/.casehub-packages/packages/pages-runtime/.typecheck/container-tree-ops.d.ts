import type { ContainerState } from "@casehubio/pages-component";
import type { Container, Entry, Layout, ContentFactory as SandboxContentFactory, LayoutCallbacks } from "./frame-sandbox/types.js";
export declare function isSplitLayout(layout: Layout): boolean;
export declare function findLeafContainer(container: Container, predicate?: (c: Container) => boolean): Container | null;
export declare function findContainerWithTab(container: Container, tabKey: string): Container | null;
export declare function forEachLeafContainer(container: Container, callback: (container: Container, paneKey?: string) => void, paneKey?: string): void;
export declare function findParentOf(root: Container, targetContainer: Container): {
    container: Container;
    entry: Entry;
} | null;
export declare function captureContainerState(container: Container): ContainerState;
export declare function restoreContainerFromState(containerState: ContainerState, frameKey: string, factory: SandboxContentFactory, callbacks: LayoutCallbacks, depth: number, createLeafFn: (frameKey: string, entries: Entry[]) => Container, createSplitFn: (frameKey: string, direction: "splith" | "splitv", childEntries: Array<{
    key: string;
    child: Container;
}>) => Container): Container;
//# sourceMappingURL=container-tree-ops.d.ts.map