import type { GraphModel } from '@casehubio/graph-core';
import type { MultiSelectState, DragSubject } from '../editing/types.js';

export interface NodeGestureConfig {
  onConnect: (nodeId: string, event: PointerEvent) => void;
  onMove: (nodeId: string, event: PointerEvent, model: GraphModel) => void;
  onSegmentMove: (subject: DragSubject & { type: 'segment' }, event: PointerEvent, model: GraphModel) => void;
  getMultiSelectState: () => MultiSelectState;
  getModel: () => GraphModel;
}

const HOLD_DURATION = 300;

function holdMoveTolerance(pointerType: string): number {
  return pointerType === 'touch' ? 10 : 3;
}

export class NodeGestureCoordinator {
  private _config: NodeGestureConfig;
  private _container: HTMLElement | null = null;
  private _disposed = false;
  private _replaying = false;

  private _activePointerId: number | null = null;
  private _holdTimer: ReturnType<typeof setTimeout> | null = null;
  private _startX = 0;
  private _startY = 0;
  private _startEvent: PointerEvent | null = null;
  private _classifyingNodeId: string | null = null;
  private _tolerance = 3;

  private _onCapturePointerDown: ((e: PointerEvent) => void) | null = null;
  private _onPointermove: ((e: PointerEvent) => void) | null = null;
  private _onPointerup: ((e: PointerEvent) => void) | null = null;

  constructor(config: NodeGestureConfig) {
    this._config = config;
  }

  attach(container: HTMLElement): void {
    this._container = container;

    this._onCapturePointerDown = (e: PointerEvent) => {
      this._handlePointerDown(e);
    };
    container.addEventListener('pointerdown', this._onCapturePointerDown, true);
  }

  dispose(): void {
    this._disposed = true;
    this._cancelClassification();

    if (this._container && this._onCapturePointerDown) {
      this._container.removeEventListener('pointerdown', this._onCapturePointerDown, true);
    }
    this._container = null;
    this._onCapturePointerDown = null;
  }

  private _handlePointerDown(e: PointerEvent): void {
    if (this._replaying) return;

    const path = e.composedPath();
    for (const el of path) {
      if (el instanceof HTMLElement && el.classList.contains('stencil-action')) {
        return;
      }
    }

    const target = e.target as HTMLElement;
    const nodeEl = target.closest('.react-flow__node') as HTMLElement | null;
    if (!nodeEl) return;
    const nodeId = nodeEl.dataset['id'];
    if (!nodeId) return;

    if (this._activePointerId !== null && this._activePointerId !== e.pointerId) {
      return;
    }

    e.stopImmediatePropagation();
    e.preventDefault();

    const blockMouseDown = (me: MouseEvent) => { me.stopImmediatePropagation(); me.preventDefault(); };
    this._container!.addEventListener('mousedown', blockMouseDown, { capture: true, once: true });

    const ms = this._config.getMultiSelectState();
    const model = this._config.getModel();

    if (ms.mode === 'constrained' && ms.selectedNodeIds.has(nodeId) && ms.boundaryInput && ms.boundaryOutput) {
      this._config.onSegmentMove(
        {
          type: 'segment',
          nodeIds: ms.selectedNodeIds as ReadonlySet<string>,
          entryNodeId: ms.boundaryInput.target,
          exitNodeId: ms.boundaryOutput.source,
          boundaryInput: ms.boundaryInput,
          boundaryOutput: ms.boundaryOutput,
        },
        e,
        model,
      );
      return;
    }

    this._activePointerId = e.pointerId;
    this._startX = e.clientX;
    this._startY = e.clientY;
    this._startEvent = e;
    this._classifyingNodeId = nodeId;
    this._tolerance = holdMoveTolerance(e.pointerType);

    this._onPointermove = (me: PointerEvent) => {
      this._handleClassifyMove(me);
    };
    this._onPointerup = (_ue: PointerEvent) => {
      this._cancelClassification();
    };

    document.addEventListener('pointermove', this._onPointermove);
    document.addEventListener('pointerup', this._onPointerup);

    this._holdTimer = setTimeout(() => {
      if (this._disposed) return;
      this._holdTimer = null;
      const nid = this._classifyingNodeId;
      const evt = this._startEvent;
      this._removeClassifyListeners();
      this._activePointerId = null;
      this._classifyingNodeId = null;
      this._startEvent = null;
      if (nid && evt) {
        this._config.onMove(nid, evt, this._config.getModel());
      }
    }, HOLD_DURATION);
  }

  private _handleClassifyMove(e: PointerEvent): void {
    const dx = e.clientX - this._startX;
    const dy = e.clientY - this._startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this._tolerance) {
      const nodeId = this._classifyingNodeId!;
      const originalEvent = this._startEvent!;
      this._cancelClassification();
      this._replayConnectOnHandle(nodeId, originalEvent, e);
    }
  }

  private _replayConnectOnHandle(nodeId: string, originalEvent: PointerEvent, moveEvent: PointerEvent): void {
    if (!this._container) return;

    const nodeEl = this._container.querySelector(`.react-flow__node[data-id="${nodeId}"]`);
    if (!nodeEl) return;

    const handleEl = nodeEl.querySelector('.stencil-source-handle');
    if (!handleEl) return;

    const synthetic = new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
      clientX: originalEvent.clientX,
      clientY: originalEvent.clientY,
      pointerId: originalEvent.pointerId,
      pointerType: originalEvent.pointerType,
      button: originalEvent.button,
      buttons: originalEvent.buttons,
    });
    this._replaying = true;
    handleEl.dispatchEvent(synthetic);
    this._replaying = false;

    const syntheticMove = new PointerEvent('pointermove', {
      bubbles: true,
      composed: true,
      clientX: moveEvent.clientX,
      clientY: moveEvent.clientY,
      pointerId: moveEvent.pointerId,
      pointerType: moveEvent.pointerType,
    });
    handleEl.dispatchEvent(syntheticMove);

    this._config.onConnect(nodeId, originalEvent);
  }

  private _cancelClassification(): void {
    if (this._holdTimer) {
      clearTimeout(this._holdTimer);
      this._holdTimer = null;
    }
    this._removeClassifyListeners();
    this._activePointerId = null;
    this._classifyingNodeId = null;
    this._startEvent = null;
  }

  private _removeClassifyListeners(): void {
    if (this._onPointermove) {
      document.removeEventListener('pointermove', this._onPointermove);
      this._onPointermove = null;
    }
    if (this._onPointerup) {
      document.removeEventListener('pointerup', this._onPointerup);
      this._onPointerup = null;
    }
  }
}
