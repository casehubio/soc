import type { CompositorState, LeafRegionState, SplitRegionState } from "@casehubio/pages-component";
type Region = LeafRegionState | SplitRegionState;
export interface WorkspaceCompositor {
    readonly root: Region;
    createTab(regionId: string): string;
    closeTab(regionId: string, tabId: string): void;
    renameTab(tabId: string, name: string): void;
    activateTab(regionId: string, tabId: string): void;
    reorderTab(regionId: string, tabId: string, newIndex: number): void;
    moveTabToRegion(tabId: string, fromRegionId: string, toRegionId: string): void;
    splitRegion(regionId: string, tabId: string, direction: "h" | "v"): void;
    collapseRegion(regionId: string): void;
    setSplitRatio(ratio: number): void;
    setViewMode(regionId: string, mode: "tab" | "accordion"): void;
    setAccordionHeight(regionId: string, tabId: string, height: number): void;
    getLeafRegion(regionId: string): LeafRegionState | null;
    dispose(): void;
}
export declare function createWorkspaceCompositor(initialState?: CompositorState): WorkspaceCompositor;
export {};
//# sourceMappingURL=workspace-compositor.d.ts.map