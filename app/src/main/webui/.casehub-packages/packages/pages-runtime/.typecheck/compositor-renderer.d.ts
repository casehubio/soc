import type { LeafRegionState, SplitRegionState } from "@casehubio/pages-component";
type Region = LeafRegionState | SplitRegionState;
export interface CompositorCallbacks {
    onTabCreate(regionId: string): void;
    onTabClose(regionId: string, tabId: string): void;
    onTabActivate(regionId: string, tabId: string): void;
    onTabRename(tabId: string, newName: string): void;
    onViewModeToggle(regionId: string): void;
    onAccordionResize(regionId: string, tabId: string, height: number): void;
    onSplitResize(ratio: number): void;
    getTabContainer(tabId: string): HTMLElement;
}
export interface CompositorDOM {
    update(root: Region): void;
    dispose(): void;
}
export declare function renderCompositor(root: Region, container: HTMLElement, callbacks: CompositorCallbacks, signal: AbortSignal): CompositorDOM;
export {};
//# sourceMappingURL=compositor-renderer.d.ts.map