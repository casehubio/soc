import type { Component } from "@casehubio/pages-component";
export type PagePathMap = Map<Component, string>;
export declare function buildPagePathMap(root: Component): PagePathMap;
export declare function extendPagePathMap(root: Component, basePath: string, map: PagePathMap): void;
//# sourceMappingURL=page-paths.d.ts.map