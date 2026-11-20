import type { Component } from "@casehubio/pages-component";
import type { PagePathMap } from "./page-paths.js";
export type PageIndex = Map<string, Component>;
export type ActiveSlots = Map<string, string>;
export declare function buildPageIndex(root: Component, paths: PagePathMap): PageIndex;
export declare function extendPageIndex(root: Component, paths: PagePathMap, index: PageIndex): void;
export declare function computeCurrentPage(root: Component, activeSlots: ActiveSlots): string;
export declare function walkNavigate(root: Component, segments: string[], target: HTMLElement, lazyPageResolutions: Map<Component, Component>): string;
//# sourceMappingURL=navigation.d.ts.map