import { validateSelection } from '@casehubio/graph-core';
import type { GraphModel, GraphEdge } from '@casehubio/graph-core';

export type RubberBandResult =
  | { readonly type: 'selected'; readonly nodeIds: ReadonlySet<string>;
      readonly boundaryInput: GraphEdge; readonly boundaryOutput: GraphEdge }
  | { readonly type: 'empty' };

interface FlowNode {
  readonly id: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly measured?: { readonly width?: number; readonly height?: number };
  readonly width?: number;
  readonly height?: number;
}

export interface RubberBandOptions {
  readonly containerEl: HTMLElement;
  readonly screenToFlow: (x: number, y: number) => { x: number; y: number };
  readonly getNodes: () => readonly FlowNode[];
  readonly getModel: () => GraphModel;
  readonly onComplete: (result: RubberBandResult) => void;
  readonly isSelectable?: (nodeId: string) => boolean;
}

export interface RubberBandSelect {
  attach(): void;
  dispose(): void;
  readonly isActive: boolean;
}

export function createRubberBandSelect(opts: RubberBandOptions): RubberBandSelect {
  const { containerEl, screenToFlow, getNodes: _getNodes, getModel, onComplete, isSelectable } = opts;

  let active = false;
  let startFlow = { x: 0, y: 0 };
  let rectEl: HTMLElement | null = null;
  let capturedPointerId: number | null = null;

  function flowRect(p1: {x:number;y:number}, p2: {x:number;y:number}) {
    return {
      x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y),
      w: Math.abs(p2.x - p1.x), h: Math.abs(p2.y - p1.y),
    };
  }

  function nodesInFlowRect(fr: {x:number;y:number;w:number;h:number}): Set<string> {
    const candidates = new Set<string>();
    const nodeEls = containerEl.querySelectorAll('.react-flow__node');
    for (const el of nodeEls) {
      const nodeId = (el as HTMLElement).dataset['id'] ?? '';
      if (!nodeId) continue;
      if (isSelectable && !isSelectable(nodeId)) continue;
      const rect = el.getBoundingClientRect();
      const topLeft = screenToFlow(rect.x, rect.y);
      const bottomRight = screenToFlow(rect.x + rect.width, rect.y + rect.height);
      if (
        bottomRight.x > fr.x &&
        topLeft.x < fr.x + fr.w &&
        bottomRight.y > fr.y &&
        topLeft.y < fr.y + fr.h
      ) {
        candidates.add(nodeId);
      }
    }
    return candidates;
  }

  function updateNodeClasses(candidates: Set<string>): void {
    const result = validateSelection(candidates, getModel());
    const nodeEls = containerEl.querySelectorAll('.react-flow__node');
    for (const el of nodeEls) {
      const nodeId = (el as HTMLElement).dataset['id'] ?? '';
      el.classList.remove('multi-select-valid', 'multi-select-invalid');
      if (result.valid.has(nodeId)) el.classList.add('multi-select-valid');
      else if (result.invalid.has(nodeId)) el.classList.add('multi-select-invalid');
    }
  }

  function cleanup(): void {
    if (capturedPointerId !== null) {
      try { containerEl.releasePointerCapture(capturedPointerId); } catch { /* already released */ }
    }
    active = false;
    capturedPointerId = null;
    if (rectEl) { rectEl.remove(); rectEl = null; }
    const nodeEls = containerEl.querySelectorAll('.react-flow__node');
    for (const el of nodeEls) {
      el.classList.remove('multi-select-valid', 'multi-select-invalid');
    }
  }

  function cancel(): void {
    if (!active) return;
    cleanup();
    onComplete({ type: 'empty' });
  }

  function completeFlow(endFlow: {x:number;y:number}): void {
    if (!active) return;
    try {
      const fr = flowRect(startFlow, endFlow);
      const candidates = nodesInFlowRect(fr);
      const result = validateSelection(candidates, getModel());
      cleanup();

      if (result.valid.size > 0 && result.boundaryInput && result.boundaryOutput) {
        onComplete({
          type: 'selected',
          nodeIds: result.valid,
          boundaryInput: result.boundaryInput,
          boundaryOutput: result.boundaryOutput,
        });
      } else {
        onComplete({ type: 'empty' });
      }
    } catch {
      cleanup();
      onComplete({ type: 'empty' });
    }
  }

  const onPointerDown = (e: PointerEvent): void => {
    const target = e.target as HTMLElement;
    if (target.closest('.react-flow__node') || target.closest('.react-flow__edge')) return;
    if (e.button !== 0) return;
    if (!e.shiftKey) return;

    e.stopPropagation();
    e.preventDefault();

    active = true;
    startFlow = screenToFlow(e.clientX, e.clientY);
    capturedPointerId = e.pointerId;

    const viewport = containerEl.querySelector('.react-flow__viewport');
    if (!viewport) { active = false; return; }

    rectEl = document.createElement('div');
    rectEl.className = 'multi-select-rect';
    rectEl.style.cssText = 'position:absolute;pointer-events:none;z-index:10000;border:1.5px solid var(--pages-accent-9);background:var(--pages-accent-a3);border-radius:2px;box-shadow:0 0 6px var(--pages-accent-a3);';
    viewport.appendChild(rectEl);

    containerEl.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (!active || !rectEl) return;
    if (!e.shiftKey) { cancel(); return; }

    const currentFlow = screenToFlow(e.clientX, e.clientY);
    const fr = flowRect(startFlow, currentFlow);

    rectEl.style.left = `${fr.x}px`;
    rectEl.style.top = `${fr.y}px`;
    rectEl.style.width = `${fr.w}px`;
    rectEl.style.height = `${fr.h}px`;

    const candidates = nodesInFlowRect(fr);
    updateNodeClasses(candidates);
  };

  const onPointerUp = (e: PointerEvent): void => {
    if (!active) return;
    const endFlow = screenToFlow(e.clientX, e.clientY);
    completeFlow(endFlow);
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    if (!active) return;
    if (e.key === 'Escape') cancel();
  };

  const onKeyUp = (e: KeyboardEvent): void => {
    if (!active) return;
    if (e.key === 'Shift') cancel();
  };

  return {
    get isActive() { return active; },
    attach() {
      containerEl.addEventListener('pointerdown', onPointerDown, true);
      containerEl.addEventListener('pointermove', onPointerMove, true);
      containerEl.addEventListener('pointerup', onPointerUp, true);
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
    },
    dispose() {
      cleanup();
      containerEl.removeEventListener('pointerdown', onPointerDown, true);
      containerEl.removeEventListener('pointermove', onPointerMove, true);
      containerEl.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    },
  };
}
