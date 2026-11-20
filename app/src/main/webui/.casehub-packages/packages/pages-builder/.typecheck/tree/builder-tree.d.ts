import { LitElement, type TemplateResult } from 'lit';
import { type RovingDirection } from '@casehubio/pages-primitives/a11y';
import { PageDocument } from '@casehubio/pages-document';
import '@casehubio/pages-primitives/context-menu';
export type TreeNodeType = 'page' | 'row' | 'column' | 'component' | 'dataset' | 'nav-item' | 'module' | 'import' | 'variable' | 'section';
export interface TreeNodeInfo {
    readonly label: string;
    readonly icon: string;
    readonly nodeType: TreeNodeType;
    readonly path: readonly (string | number)[];
    readonly children: readonly TreeNodeInfo[];
}
export declare function buildTreeModel(doc: PageDocument): TreeNodeInfo[];
declare const PagesBuilderTree_base: (new (...args: any[]) => {
    rovingSelector: string;
    rovingDirection: RovingDirection;
    rovingIndex: number;
    navigateRoving(direction: "next" | "prev" | "first" | "last"): void;
}) & (new (...args: any[]) => {
    registerShortcut(key: string, handler: () => void, opts: {
        description: string;
        requiresModifier?: boolean;
    }): void;
    unregisterShortcut(key: string): void;
    getShortcuts(): {
        key: string;
        description: string;
    }[];
}) & typeof LitElement;
export declare class PagesBuilderTree extends PagesBuilderTree_base {
    rovingSelector: string;
    rovingDirection: RovingDirection;
    document: PageDocument | undefined;
    selectedPath: readonly (string | number)[] | undefined;
    clipboardFragmentType: string | undefined;
    insertMode: boolean;
    private _expandedPaths;
    private _treeModel;
    private _contextMenuOpen;
    private _contextMenuItems;
    private _contextMenuNode;
    private _contextMenuX;
    private _contextMenuY;
    private _unsub;
    connectedCallback(): void;
    disconnectedCallback(): void;
    willUpdate(changed: Map<PropertyKey, unknown>): void;
    private _expandToPath;
    private _subscribeToDocument;
    private _rebuildModel;
    private _isExpanded;
    expandPath(path: readonly (string | number)[]): void;
    private _toggleExpanded;
    private _isSelected;
    private _selectNode;
    private _handleItemClick;
    private _handleItemKeydown;
    private _isContainerNode;
    private _handleContextMenu;
    private _handleMenuAction;
    private _handleMenuClose;
    private _handleAddClick;
    private _handleInsertClick;
    private _handleCutClick;
    private _handleCopyClick;
    private _handleTreeKeydown;
    private _findNodeType;
    private _isPasteTarget;
    private _renderNode;
    private _renderChildrenWithInsertionPoints;
    private _renderInsertionPoint;
    private _handleInsertionPointClick;
    render(): TemplateResult;
    static styles: import("lit").CSSResult;
}
export {};
//# sourceMappingURL=builder-tree.d.ts.map