import { PageDocument } from '@casehubio/pages-document';
import type { TreeNodeType } from '../tree/builder-tree.js';
export interface YamlRange {
    readonly from: number;
    readonly to: number;
}
export declare function findPathAtOffset(doc: PageDocument, offset: number): readonly (string | number)[] | undefined;
export declare function getNodeRange(doc: PageDocument, path: readonly (string | number)[]): YamlRange | null;
export declare function classifyPath(path: readonly (string | number)[]): TreeNodeType | undefined;
export declare function getParentPath(path: readonly (string | number)[]): readonly (string | number)[] | null;
//# sourceMappingURL=yaml-path.d.ts.map