export type DropPosition = 'before' | 'after' | 'on';
export interface DropTarget {
    type: 'between' | 'on-container' | 'on-slot' | 'invalid';
    parentPath: readonly (string | number)[];
    index: number;
    slotName?: string;
}
export declare function computeDropPosition(e: DragEvent, element: HTMLElement): DropPosition;
export declare function computeDropTarget(draggedPath: readonly (string | number)[], targetPath: readonly (string | number)[], targetNodeType: string, position: DropPosition): DropTarget;
export declare function isValidDrop(draggedNodeType: string, target: DropTarget): boolean;
//# sourceMappingURL=tree-dnd.d.ts.map