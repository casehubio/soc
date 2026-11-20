import type { Container, Layout, ContentFactory } from "./types.js";
export interface TreeLevel {
    layout: Layout;
    entryCount: number;
    nestedAt?: number;
}
export interface TreeSpec {
    levels: TreeLevel[];
}
export declare function simpleTestFactory(): ContentFactory;
export declare function buildContainerTree(spec: TreeSpec): {
    root: Container;
    containers: Map<string, Container>;
};
//# sourceMappingURL=test-harness.d.ts.map