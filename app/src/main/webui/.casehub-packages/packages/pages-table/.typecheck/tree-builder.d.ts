import type { TypedDataSet, TypedRow, ColumnId } from '@casehubio/pages-data';
export interface TreeNode {
    readonly row: TypedRow;
    readonly id: string;
    readonly parentId: string | null;
    readonly children: TreeNode[];
    readonly depth: number;
    siblingIndex: number;
    siblingCount: number;
}
export interface ExpandableConfig {
    readonly idColumn: ColumnId;
    readonly parentColumn: ColumnId;
    readonly defaultExpanded?: boolean | number;
}
export declare function buildTreeIndex(dataset: TypedDataSet, config: ExpandableConfig): {
    roots: TreeNode[];
    nodeMap: Map<string, TreeNode>;
};
export declare function computeDefaultExpandState(roots: readonly TreeNode[], defaultExpanded: boolean | number | undefined): Map<string, boolean>;
export declare function collectVisibleNodes(nodes: readonly TreeNode[], expandState: Map<string, boolean>): TreeNode[];
export declare function paginateTreeByRoots(roots: readonly TreeNode[], expandState: Map<string, boolean>, page: number, pageSize: number): {
    pageNodes: TreeNode[];
    rootCount: number;
};
export declare function findMatchingNodes(nodes: readonly TreeNode[], term: string): Set<string>;
export declare function rowMatchesText(node: TreeNode, term: string): boolean;
export declare function sortTreeLevel(nodes: TreeNode[], dataset: TypedDataSet, sortColumnId: ColumnId, sortOrder: 'ASCENDING' | 'DESCENDING'): void;
//# sourceMappingURL=tree-builder.d.ts.map