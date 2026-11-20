import type { TreeNodeType } from '../tree/builder-tree.js';
export declare class SelectionOverlay {
    private _overlayRoot;
    private _overlay;
    private _insertionPoints;
    constructor(overlayRoot: HTMLElement);
    update(bounds: DOMRect, nodeType: TreeNodeType, path: readonly (string | number)[], options?: {
        isContainer?: boolean;
    }): void;
    hide(): void;
    setInsertMode(_fragmentType: string): void;
    clearInsertMode(): void;
    showInsertionPoints(childBounds: DOMRect[], parentPath: readonly (string | number)[], parentNodeType: TreeNodeType): void;
    hideInsertionPoints(): void;
    dispose(): void;
}
//# sourceMappingURL=selection-overlay.d.ts.map