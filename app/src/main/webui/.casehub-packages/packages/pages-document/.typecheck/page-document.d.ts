import { type Document } from 'yaml';
import type { Diagnostic, LayoutMode, Unsubscribe } from './types.js';
import { type ContainerChildDescriptor } from './container-descriptors.js';
import type { FieldSchema } from '@casehubio/pages-component';
export declare class PageDocument {
    private _doc;
    private _diagnostics;
    private _undoStack;
    private _redoStack;
    private _listeners;
    private _inTransaction;
    private _transactionSnapshot;
    private _coordinated;
    private constructor();
    static parse(yaml: string): PageDocument;
    static empty(): PageDocument;
    static parseCoordinated(yaml: string): PageDocument;
    get diagnostics(): readonly Diagnostic[];
    toString(): string;
    onChange(listener: (yaml: string) => void): Unsubscribe;
    private _notify;
    private _pushUndo;
    beginTransaction(): void;
    commitTransaction(): void;
    abortTransaction(): void;
    undo(): boolean;
    redo(): boolean;
    canUndo(): boolean;
    canRedo(): boolean;
    getProperties(): Record<string, string>;
    setProperty(key: string, value: string): void;
    getPages(): PageNode[];
    addPage(name: string): PageNode;
    removePage(index: number): void;
    getDatasets(): DatasetNode[];
    addDataset(uuid: string, defaults?: Record<string, unknown>): DatasetNode;
    removeDataset(index: number): void;
    getNavTree(): NavTreeNode | undefined;
    getModules(): Record<string, Record<string, unknown>> | undefined;
    getImports(): Record<string, unknown>[] | undefined;
    getVariables(): Record<string, unknown> | undefined;
    /** @internal */
    _getDoc(): Document;
    /** @internal */
    _pushUndoInternal(): void;
    /** @internal */
    _notifyInternal(): void;
}
export declare class PageNode {
    private _doc;
    readonly path: readonly (string | number)[];
    constructor(_doc: PageDocument, path: readonly (string | number)[]);
    get name(): string;
    set name(value: string);
    getLayoutMode(): LayoutMode;
    getRows(): RowNode[];
    getColumns(): ColumnNode[];
    getComponents(): ComponentNode[];
    addRow(): RowNode;
    insertRowAt(index: number): RowNode;
    addComponent(type: string, props?: Record<string, unknown>): ComponentNode;
    insertChildAt(index: number, type: string, props?: Record<string, unknown>): ComponentNode;
    wrapInRow(componentIndices: number[]): RowNode;
    removeChild(index: number): void;
}
export declare class RowNode {
    private _doc;
    readonly path: readonly (string | number)[];
    constructor(_doc: PageDocument, path: readonly (string | number)[]);
    getColumns(): ColumnNode[];
    addColumn(span?: number): ColumnNode;
    insertColumnAt(index: number, span?: number): ColumnNode;
    removeColumn(index: number): void;
}
export declare class ColumnNode {
    private _doc;
    readonly path: readonly (string | number)[];
    constructor(_doc: PageDocument, path: readonly (string | number)[]);
    get span(): number;
    set span(value: number);
    getComponents(): ComponentNode[];
    addComponent(type: string, props?: Record<string, unknown>): ComponentNode;
    insertComponentAt(index: number, type: string, props?: Record<string, unknown>): ComponentNode;
    removeComponent(index: number): void;
    getProperties(): Record<string, unknown>;
    setProperty(key: string, value: unknown): void;
}
export interface ContainerChildren {
    slots: Record<string, ComponentNode[]>;
    descriptor: ContainerChildDescriptor;
}
export declare class ComponentNode {
    private _doc;
    readonly path: readonly (string | number)[];
    constructor(_doc: PageDocument, path: readonly (string | number)[]);
    get type(): string;
    getProperties(): Record<string, unknown>;
    setProperty(key: string, value: unknown): void;
    removeProperty(key: string): void;
    getSchema(): FieldSchema;
    isContainer(): boolean;
    getChildren(): ContainerChildren;
    addChild(slot: string, type: string, props?: Record<string, unknown>): ComponentNode;
    replaceWith(newType: string): ComponentNode;
    moveToSlot(target: {
        path: readonly (string | number)[];
        slotName: string;
    }, index: number): void;
    wrapIn(containerType: string): ComponentNode;
    moveToIndex(parent: {
        path: readonly (string | number)[];
        slot?: string;
    }, index: number): void;
    duplicate(): ComponentNode;
}
export declare class DatasetNode {
    private _doc;
    readonly path: readonly (string | number)[];
    constructor(_doc: PageDocument, path: readonly (string | number)[]);
    get uuid(): string;
    get name(): string | undefined;
    get url(): string | undefined;
    get content(): string | undefined;
    getSource(): 'url' | 'content' | 'join' | 'serverQuery' | undefined;
    getColumns(): Array<{
        id: string;
        type: string;
        name?: string;
    }>;
    addColumn(id: string, type: string, name?: string): void;
    removeColumn(index: number): void;
    getProperties(): Record<string, unknown>;
    setProperty(key: string, value: unknown): void;
}
export declare class NavTreeNode {
    private _doc;
    readonly path: readonly (string | number)[];
    constructor(_doc: PageDocument, path: readonly (string | number)[]);
    get type(): string | undefined;
    get id(): string | undefined;
    get page(): string | undefined;
    get children(): NavTreeNode[];
    setPage(page: string): void;
    setId(id: string): void;
    addChild(item: {
        type?: 'GROUP' | 'ITEM';
        id?: string;
        page?: string;
    }): NavTreeNode;
    removeChild(index: number): void;
}
//# sourceMappingURL=page-document.d.ts.map