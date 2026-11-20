export type DropPosition = 'before' | 'after' | 'on';

export interface DropTarget {
  type: 'between' | 'on-container' | 'on-slot' | 'invalid';
  parentPath: readonly (string | number)[];
  index: number;
  slotName?: string;
}

const CONTAINER_NODE_TYPES = new Set(['page', 'column', 'section']);
const INVALID_DROP_TYPES = new Set(['row', 'dataset', 'nav-item']);

export function computeDropPosition(e: DragEvent, element: HTMLElement): DropPosition {
  const rect = element.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const third = rect.height / 3;
  if (y < third) return 'before';
  if (y > third * 2) return 'after';
  return 'on';
}

export function computeDropTarget(
  draggedPath: readonly (string | number)[],
  targetPath: readonly (string | number)[],
  targetNodeType: string,
  position: DropPosition,
): DropTarget {
  if (INVALID_DROP_TYPES.has(targetNodeType)) {
    return { type: 'invalid', parentPath: [], index: 0 };
  }

  if (position === 'on' && (CONTAINER_NODE_TYPES.has(targetNodeType) || targetNodeType === 'component')) {
    return {
      type: 'on-container',
      parentPath: targetPath,
      index: 0,
    };
  }

  const parentPath = targetPath.slice(0, -1);
  const targetIndex = targetPath[targetPath.length - 1] as number;
  const draggedParent = draggedPath.slice(0, -1);
  const draggedIndex = draggedPath[draggedPath.length - 1] as number;

  let insertIndex = position === 'before' ? targetIndex : targetIndex + 1;

  if (pathsEqual(parentPath, draggedParent) && draggedIndex < insertIndex) {
    insertIndex--;
  }

  return {
    type: 'between',
    parentPath,
    index: insertIndex,
  };
}

export function isValidDrop(
  draggedNodeType: string,
  target: DropTarget,
): boolean {
  if (target.type === 'invalid') return false;
  return true;
}

function pathsEqual(a: readonly (string | number)[], b: readonly (string | number)[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((seg, i) => String(seg) === String(b[i]));
}
