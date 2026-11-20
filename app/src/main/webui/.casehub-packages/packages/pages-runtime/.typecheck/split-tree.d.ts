import type { Entry } from "./frame-sandbox/index.js";
export type TabOrganiserInstance = ReturnType<typeof import("./frame-sandbox/index.js").createTabOrganiser>;
export interface LeafPaneContent {
    readonly type: "tabs";
    tabOrganiser: TabOrganiserInstance;
    tabEntries: Entry[];
}
export interface NestedSplitContent {
    readonly type: "split";
    splitLayout: SplitLayout;
}
export interface SplitPane {
    containerEl: HTMLElement;
    content: LeafPaneContent | NestedSplitContent;
}
export interface SplitLayout {
    direction: "h" | "v";
    panes: SplitPane[];
    ratios: number[];
    containerEl: HTMLElement;
    dividerEls: HTMLElement[];
}
export declare function forEachLeafPane(layout: SplitLayout, callback: (pane: SplitPane, path: number[]) => void, basePath?: number[]): void;
export declare function findLeafPane(layout: SplitLayout, predicate: (pane: SplitPane, path: number[]) => boolean, basePath?: number[]): {
    pane: SplitPane;
    path: number[];
} | null;
export declare function getPaneAtPath(layout: SplitLayout, path: number[]): SplitPane | null;
export declare function getParentSplit(rootLayout: SplitLayout, path: number[]): {
    layout: SplitLayout;
    index: number;
} | null;
export declare function splitDepth(layout: SplitLayout): number;
//# sourceMappingURL=split-tree.d.ts.map