import { LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import React, { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Node, Edge, ReactFlowInstance, Connection } from '@xyflow/react';
import type { GraphModel } from '@casehubio/graph-core';
import { nodeById, canAddToSelection, canRemoveFromSelection } from '@casehubio/graph-core';
import type { EditPolicy, MultiSelectState } from '../editing/types.js';
import type { GraphEdit } from '../editing/types.js';
import { createNodeMoveCoordinator } from '../editing/node-move-coordinator.js';
import type { NodeMoveCoordinator, DragEndResult } from '../editing/node-move-coordinator.js';
import { NodeGestureCoordinator } from '../gesture/node-gesture-coordinator.js';
import { createRubberBandSelect } from '../editing/rubber-band-select.js';
import type { RubberBandSelect } from '../editing/rubber-band-select.js';
import { applyTheme, getTheme } from '@casehubio/pages-ui-tokens';
import { ReactFlowApp, type ReactFlowAppProps } from './ReactFlowApp.js';
import { getNodeTypes } from '../registry/stencil-registry.js';
import { injectIsolationStyles, releaseIsolationStyles, DIAGRAM_ROOT_CLASS } from './css-isolation.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import { toReactFlowGraph } from '../mapping.js';
import { computeElkLayout, type ElkLayoutOptions } from '../layout/elk-layout.js';
import { DrillDownState } from '../drill-down/drill-down-state.js';
import { DrillDownBars } from '../drill-down/drill-down-bars.js';
import type { DrillDownConfig } from '../drill-down/types.js';

@customElement('graph-canvas-core')
export class GraphCanvas extends LitElement {
  @property({ attribute: false }) model: GraphModel | undefined;
  @property({ attribute: false }) layoutOptions: ElkLayoutOptions | undefined;
  @property({ attribute: false }) nodes: Node[] | undefined;
  @property({ attribute: false }) edges: Edge[] | undefined;
  @property({ attribute: false }) editPolicy: EditPolicy | undefined;
  @property({ attribute: false }) onMutation: ((edit: GraphEdit) => void) | undefined;
  @property({ attribute: false }) connectionsEnabled = true;
  @property({ attribute: false }) miniMapNodeColor: ReactFlowAppProps['miniMapNodeColor'];
  @property({ attribute: false }) drillDown?: DrillDownConfig;

  @state() private _nodes: Node[] = [];
  @state() private _edges: Edge[] = [];

  private _root: Root | undefined;
  private _container: HTMLDivElement | undefined;
  private _themeListener: ((e: Event) => void) | undefined;
  private _layoutGeneration = 0;
  private _reactFlowInstance: ReactFlowInstance | undefined;
  private _connectSourceNodeId: string | undefined;
  private _connectStartPos: { x: number; y: number } | undefined;
  private _moveCoordinator: NodeMoveCoordinator | null = null;
  private _moveWasActive = false;
  private _gestureCoordinator: NodeGestureCoordinator | null = null;
  private _rubberBand: RubberBandSelect | null = null;
  private _keyDownHandler: ((e: KeyboardEvent) => void) | undefined;
  private _multiSelect: MultiSelectState = { selectedNodeIds: new Set(), mode: 'none', boundaryInput: null, boundaryOutput: null };
  private _drillDownState: DrillDownState | null = null;
  private _drillDownBars: DrillDownBars | null = null;
  private _dropHandlers: { dragover: (e: DragEvent) => void; drop: (e: DragEvent) => void; dragleave: (e: DragEvent) => void } | null = null;
  private _dropHighlightedEdgeEl: HTMLElement | null = null;
  private _dropSpliceIndicator: HTMLElement | null = null;
  private _ariaLiveEl: HTMLElement | null = null;

  get multiSelect(): MultiSelectState { return this._multiSelect; }

  private _setMultiSelect(state: MultiSelectState): void {
    this._multiSelect = state;
    this._applyMultiSelectCSS();
    emitPagesEvent(this, 'graph:multiselect:change', {
      mode: state.mode,
      nodeIds: [...state.selectedNodeIds],
    });
  }

  private _ensureMoveCoordinator(): NodeMoveCoordinator | null {
    if (!this.editPolicy || !this._container) return null;
    if (!this._moveCoordinator) {
      this._moveCoordinator = createNodeMoveCoordinator({
        editPolicy: this.editPolicy,
        containerEl: this._container,
        onResult: (result: DragEndResult) => { this._handleMoveResult(result); },
      });
    }
    return this._moveCoordinator;
  }

  private _clearMultiSelect(): void {
    this._setMultiSelect({ selectedNodeIds: new Set(), mode: 'none', boundaryInput: null, boundaryOutput: null });
  }

  private _initDrillDown(): void {
    if (!this._container || !this.drillDown) return;
    this._drillDownState = new DrillDownState();
    this._drillDownBars = new DrillDownBars();

    this._container.style.display = 'flex';
    const rfEl = this._container.querySelector('.react-flow') as HTMLElement | null;
    if (rfEl) rfEl.style.flex = '1';

    this._ariaLiveEl = document.createElement('div');
    this._ariaLiveEl.setAttribute('aria-live', 'polite');
    this._ariaLiveEl.setAttribute('role', 'status');
    this._ariaLiveEl.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);';
    this.appendChild(this._ariaLiveEl);

    this._container.addEventListener('graph:drill-down', (e: Event) => {
      const detail = (e as CustomEvent<{ nodeId: string }>).detail;
      void this._handleDrillDown(detail.nodeId);
    });

    this._container.addEventListener('drill-down-navigate', (e: Event) => {
      const detail = (e as CustomEvent<{ depth: number }>).detail;
      this._drillDownNavigateTo(detail.depth);
    });
  }

  private async _handleDrillDown(nodeId: string): Promise<void> {
    const config = this.drillDown;
    const state = this._drillDownState;
    const model = this.model;
    if (!config || !state || !model || !this._container) return;

    const gen = state.resolveGeneration;
    const target = await config.resolve(nodeId, model);
    if (!target || state.resolveGeneration !== gen) return;

    this._moveCoordinator?.dispose();
    this._moveCoordinator = null;
    this._clearMultiSelect();

    const viewport = this._reactFlowInstance?.getViewport() ?? { x: 0, y: 0, zoom: 1 };
    state.push(target, nodeId, viewport, [...this._nodes], [...this._edges], this._layoutGeneration, model);
    this._layoutGeneration++;

    this.model = target.model;

    this._drillDownBars?.render(this._container, state);
    this._announce(`Drilled into ${target.name}, level ${state.depth}`);
  }

  private _drillDownPop(): void {
    const state = this._drillDownState;
    if (!state || state.depth === 0 || !this._container) return;

    const popped = state.pop();
    if (!popped) return;

    this._moveCoordinator?.dispose();
    this._moveCoordinator = null;
    this._clearMultiSelect();

    this._layoutGeneration++;
    this._nodes = popped.layoutNodes;
    this._edges = popped.layoutEdges;
    this.model = popped.model;

    if (this._reactFlowInstance) {
      void this._reactFlowInstance.setViewport(popped.viewport);
    }

    this._drillDownBars?.render(this._container, state);
    this._announce(`Navigated back to ${popped.name}`);
  }

  private _drillDownNavigateTo(barIndex: number): void {
    const state = this._drillDownState;
    if (!state || !this._container) return;

    const targetLevel = state.levels[barIndex];
    if (!targetLevel) return;

    const removed = state.navigateTo(barIndex - 1);
    if (removed.length === 0) return;

    this._moveCoordinator?.dispose();
    this._moveCoordinator = null;
    this._clearMultiSelect();

    this._layoutGeneration++;
    this._nodes = targetLevel.layoutNodes;
    this._edges = targetLevel.layoutEdges;
    this.model = targetLevel.model;
    if (this._reactFlowInstance) {
      void this._reactFlowInstance.setViewport(targetLevel.viewport);
    }

    this._drillDownBars?.render(this._container, state);
    this._announce(`Navigated back to ${targetLevel.name}`);
  }

  private _announce(message: string): void {
    if (this._ariaLiveEl) {
      this._ariaLiveEl.textContent = message;
    }
  }

  private _handleShiftClick(nodeId: string): void {
    const model = this.model;
    if (!model) return;

    const ms = this._multiSelect;

    if (ms.mode === 'none') {
      this._setMultiSelect({
        selectedNodeIds: new Set([nodeId]),
        mode: 'unconstrained',
        boundaryInput: null,
        boundaryOutput: null,
      });
      return;
    }

    if (ms.mode === 'unconstrained') {
      const next = new Set(ms.selectedNodeIds);
      if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
      if (next.size === 0) { this._clearMultiSelect(); return; }
      this._setMultiSelect({ ...ms, selectedNodeIds: next });
      return;
    }

    // Constrained mode — validate before add/remove
    const isRemove = ms.selectedNodeIds.has(nodeId);
    const result = isRemove
      ? canRemoveFromSelection(nodeId, ms.selectedNodeIds, model)
      : canAddToSelection(nodeId, ms.selectedNodeIds, model);

    if (result.invalid.size === 0 && result.valid.size > 0) {
      this._setMultiSelect({
        selectedNodeIds: result.valid,
        mode: 'constrained',
        boundaryInput: result.boundaryInput,
        boundaryOutput: result.boundaryOutput,
      });
    } else if (result.valid.size === 0 && !isRemove) {
      // Reject — flash warning
      this._flashWarning(nodeId);
    }
  }

  private _handleMultiSelectDelete(): void {
    const ms = this._multiSelect;
    if (ms.mode === 'none' || !this.model) return;

    if (ms.mode === 'constrained' && ms.boundaryInput && ms.boundaryOutput) {
      const source = nodeById(this.model, ms.boundaryInput.source);
      const target = nodeById(this.model, ms.boundaryOutput.target);
      const canBridge = source && target && this.editPolicy?.canConnect(source, target, this.model);
      if (canBridge) {
        this.onMutation?.({
          type: 'removeSegment',
          nodeIds: ms.selectedNodeIds,
          bridgeEdge: { sourceId: ms.boundaryInput.source, targetId: ms.boundaryOutput.target, edgeType: ms.boundaryInput.type },
        });
      } else {
        this.onMutation?.({ type: 'removeSegment', nodeIds: ms.selectedNodeIds });
      }
    } else {
      this.onMutation?.({ type: 'removeSegment', nodeIds: ms.selectedNodeIds });
    }
    this._clearMultiSelect();
  }

  private _flashWarning(nodeId: string): void {
    const el = this._container?.querySelector(`.react-flow__node[data-id="${nodeId}"]`);
    if (!el) return;
    el.classList.add('multi-select-rejected');
    setTimeout(() => { el.classList.remove('multi-select-rejected'); }, 300);
  }

  private _applyMultiSelectCSS(): void {
    const container = this._container;
    if (!container) return;
    const nodeEls = container.querySelectorAll('.react-flow__node');
    for (const el of nodeEls) {
      const nodeId = (el as HTMLElement).dataset['id'] ?? '';
      el.classList.toggle('multi-select-active', this._multiSelect.selectedNodeIds.has(nodeId));
    }
  }

  screenToFlow(screenX: number, screenY: number): { x: number; y: number } | undefined {
    return this._reactFlowInstance?.screenToFlowPosition({ x: screenX, y: screenY });
  }

  flowToScreen(flowX: number, flowY: number): { x: number; y: number } | undefined {
    return this._reactFlowInstance?.flowToScreenPosition({ x: flowX, y: flowY });
  }

  override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'img');
    this.setAttribute('aria-label', 'Graph canvas');

    this._container = document.createElement('div');
    this._container.classList.add(DIAGRAM_ROOT_CLASS);

    injectIsolationStyles(this);

    const currentTheme = getTheme(document.documentElement) || 'default-light';
    applyTheme(currentTheme, this._container);

    this.appendChild(this._container);

    this._container.classList.toggle('graph-readonly', !this.editPolicy);

    this._gestureCoordinator = new NodeGestureCoordinator({
      onConnect: () => {},
      onMove: (nodeId, event, model) => {
        this._ensureMoveCoordinator()?.activateMove(nodeId, event, model);
      },
      onSegmentMove: (subject, event, model) => {
        this._ensureMoveCoordinator()?.activateSegmentMove(subject, event, model);
      },
      getMultiSelectState: () => this._multiSelect,
      getModel: () => this.model ?? { nodes: [], edges: [] },
    });
    this._gestureCoordinator.attach(this._container);

    this._rubberBand = createRubberBandSelect({
      containerEl: this._container,
      screenToFlow: (x, y) => this.screenToFlow(x, y) ?? { x, y },
      getNodes: () => this.nodes ?? this._nodes,
      getModel: () => this.model ?? { nodes: [], edges: [] },
      isSelectable: (nodeId) => {
        if (!this.editPolicy || !this.model) return true;
        const node = nodeById(this.model, nodeId);
        return node ? this.editPolicy.canDelete(node, this.model) : true;
      },
      onComplete: (result) => {
        if (result.type === 'selected') {
          this._setMultiSelect({
            selectedNodeIds: result.nodeIds,
            mode: 'constrained',
            boundaryInput: result.boundaryInput,
            boundaryOutput: result.boundaryOutput,
          });
        }
      },
    });
    this._rubberBand.attach();

    this._keyDownHandler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && this._multiSelect.mode !== 'none') {
        e.preventDefault();
        this._handleMultiSelectDelete();
        return;
      }
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) return;

      if (e.key === 'Escape' && this._drillDownState && this._drillDownState.depth > 0) {
        e.preventDefault();
        this._drillDownPop();
      } else if (e.key === 'Home' && this._drillDownState && this._drillDownState.depth > 0) {
        e.preventDefault();
        this._drillDownNavigateTo(-1);
      }
    };
    this.addEventListener('keydown', this._keyDownHandler);

    this._dropHandlers = {
      dragover: (e: DragEvent) => {
        if (!e.dataTransfer?.types.includes('application/x-pages-node-type')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        this._updateDropEdgeHighlight(e);
      },
      drop: (e: DragEvent) => {
        const nodeType = e.dataTransfer?.getData('application/x-pages-node-type');
        if (!nodeType || !this.model) return;
        e.preventDefault();
        const highlightedEdgeId = this._dropHighlightedEdgeEl?.dataset['id'];
        this._clearDropEdgeHighlight();
        if (highlightedEdgeId && this.model.edges.some(ed => ed.id === highlightedEdgeId)) {
          this.onMutation?.({ type: 'splitEdge', edgeId: highlightedEdgeId, insertNodeType: nodeType });
        } else {
          const policy = this.editPolicy;
          const placement = policy?.getAddPlacement?.(nodeType, this.model) ?? { type: 'detached' as const };
          if (placement.type === 'splitEdge') {
            this.onMutation?.({ type: 'splitEdge', edgeId: placement.edgeId, insertNodeType: nodeType });
          } else {
            this.onMutation?.({ type: 'addNode', nodeType });
          }
        }
        const flowPos = this.screenToFlow(e.clientX, e.clientY);
        emitPagesEvent(this, 'graph:palette:drop', { nodeType, x: e.clientX, y: e.clientY, flowX: flowPos?.x, flowY: flowPos?.y });
      },
      dragleave: (e: DragEvent) => {
        if (this._container?.contains(e.relatedTarget as globalThis.Node)) return;
        this._clearDropEdgeHighlight();
      },
    };
    this._container.addEventListener('dragover', this._dropHandlers.dragover);
    this._container.addEventListener('drop', this._dropHandlers.drop);
    this._container.addEventListener('dragleave', this._dropHandlers.dragleave);

    if (this.drillDown) {
      this._initDrillDown();
    }

    this._root = createRoot(this._container);
    this._renderReact();

    this._themeListener = (e: Event) => {
      if (e.target === document.documentElement && this._container) {
        const detail = (e as CustomEvent<{ name: string }>).detail;
        applyTheme(detail.name, this._container);
      }
    };
    document.documentElement.addEventListener('pages-theme-change', this._themeListener);
  }

  override disconnectedCallback(): void {
    if (this._themeListener) {
      document.documentElement.removeEventListener('pages-theme-change', this._themeListener);
      this._themeListener = undefined;
    }
    if (this._keyDownHandler) {
      this.removeEventListener('keydown', this._keyDownHandler);
      this._keyDownHandler = undefined;
    }
    if (this._dropHandlers && this._container) {
      this._container.removeEventListener('dragover', this._dropHandlers.dragover);
      this._container.removeEventListener('drop', this._dropHandlers.drop);
      this._container.removeEventListener('dragleave', this._dropHandlers.dragleave);
      this._dropHandlers = null;
    }
    this._clearDropEdgeHighlight();
    this._rubberBand?.dispose();
    this._rubberBand = null;
    this._gestureCoordinator?.dispose();
    this._gestureCoordinator = null;
    this._moveCoordinator?.dispose();
    this._moveCoordinator = null;
    this._drillDownBars?.dispose();
    this._drillDownBars = null;
    this._drillDownState = null;
    this._ariaLiveEl?.remove();
    this._ariaLiveEl = null;
    this._root?.unmount();
    this._root = undefined;
    this._container?.remove();
    this._container = undefined;
    releaseIsolationStyles(this);
    super.disconnectedCallback();
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('model') || changed.has('layoutOptions')) {
      void this._runLayout();
    }
    if (changed.has('editPolicy') && this._container) {
      this._container.classList.toggle('graph-readonly', !this.editPolicy);
    }
    if (changed.has('drillDown') && this.drillDown && !this._drillDownState) {
      this._initDrillDown();
    }
    this._renderReact();
  }

  private _layoutDeferred = false;

  private async _runLayout(): Promise<void> {
    if (this._moveCoordinator?.isActive) {
      this._layoutDeferred = true;
      return;
    }

    const model = this.model;
    if (!model) {
      this._nodes = [];
      this._edges = [];
      return;
    }

    const generation = ++this._layoutGeneration;

    try {
      const layout = await computeElkLayout(model, this.layoutOptions);
      if (generation !== this._layoutGeneration) return;
      if (this._moveCoordinator?.isActive) {
        this._layoutDeferred = true;
        return;
      }
      const { nodes, edges } = toReactFlowGraph(model, layout, undefined, this.layoutOptions?.direction, this.drillDown?.isDrillable);
      this._nodes = nodes;
      this._edges = edges;
    } catch (err) {
      if (generation !== this._layoutGeneration) return;
      const { nodes, edges } = toReactFlowGraph(model, undefined, undefined, this.layoutOptions?.direction, this.drillDown?.isDrillable);
      this._nodes = nodes;
      this._edges = edges;
      emitPagesEvent(this, 'graph:layout:error', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private _handleMoveResult(result: DragEndResult): void {
    this._moveWasActive = true;
    if (this._layoutDeferred) {
      this._layoutDeferred = false;
      void this._runLayout();
    }
    if (result.type === 'splice') {
      if (!this.model?.edges.some(e => e.id === result.edgeId)) return;
      this.onMutation?.({
        type: 'moveNodeToEdge',
        nodeId: result.nodeId,
        edgeId: result.edgeId,
        sourceCleanup: result.sourceCleanup,
      });
    } else if (result.type === 'splice-segment') {
      if (!this.model?.edges.some(e => e.id === result.edgeId)) return;
      const ms = this._multiSelect;
      this._clearMultiSelect();
      this.onMutation?.({
        type: 'moveSegmentToEdge',
        nodeIds: result.nodeIds,
        entryNodeId: ms.boundaryInput?.target ?? '',
        exitNodeId: ms.boundaryOutput?.source ?? '',
        edgeId: result.edgeId,
        bridgeEdge: result.bridgeEdge,
      });
    }
  }

  private _updateDropEdgeHighlight(e: DragEvent): void {
    this._clearDropEdgeHighlight();
    if (!this.model || !this.editPolicy) return;
    const root = this._container?.getRootNode() as DocumentOrShadowRoot | undefined;
    const hits = typeof root?.elementsFromPoint === 'function' ? root.elementsFromPoint(e.clientX, e.clientY) : [];
    for (const hitEl of hits) {
      const edgeEl = hitEl.closest('.react-flow__edge') as HTMLElement | null;
      if (!edgeEl) continue;
      const edgeId = edgeEl.dataset['id'];
      if (!edgeId) continue;
      const edge = this.model.edges.find(ed => ed.id === edgeId);
      if (!edge) continue;
      if (this.editPolicy.getInsertableTypes(edge, this.model).length === 0) continue;
      edgeEl.classList.add('edge-splice-valid');
      this._dropHighlightedEdgeEl = edgeEl;
      this._showDropSpliceIndicator(edgeEl);
      break;
    }
  }

  private _showDropSpliceIndicator(edgeEl: HTMLElement): void {
    const path = edgeEl.querySelector('.react-flow__edge-path') as SVGGeometryElement | null;
    if (!path) return;
    const len = path.getTotalLength();
    const pt = path.getPointAtLength(len / 2);
    const svg = path.ownerSVGElement;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const screenX = pt.x * ctm.a + ctm.e;
    const screenY = pt.y * ctm.d + ctm.f;
    this._dropSpliceIndicator = document.createElement('div');
    this._dropSpliceIndicator.style.cssText = `position:fixed;left:${screenX - 12}px;top:${screenY - 3}px;width:24px;height:6px;background:#16a34a;border-radius:3px;pointer-events:none;z-index:1001;box-shadow:0 0 12px 4px rgba(22,163,106,0.6);transition:opacity 100ms;`;
    document.body.appendChild(this._dropSpliceIndicator);
  }

  private _clearDropEdgeHighlight(): void {
    if (this._dropHighlightedEdgeEl) {
      this._dropHighlightedEdgeEl.classList.remove('edge-splice-valid');
      this._dropHighlightedEdgeEl = null;
    }
    if (this._dropSpliceIndicator) {
      this._dropSpliceIndicator.remove();
      this._dropSpliceIndicator = null;
    }
  }

  private _renderReact(): void {
    if (!this._root) return;

    this._root.render(
      createElement(ReactFlowApp, {
        nodes: this.nodes ?? this._nodes,
        edges: this.edges ?? this._edges,
        nodeTypes: getNodeTypes(),
        onNodeClick: (nodeId: string, node: Node, event?: React.MouseEvent) => {
          emitPagesEvent(this, 'graph:node:click', {
            nodeId,
            nodeType: node.type ?? '',
          });
          if (event?.shiftKey && this.model) {
            this._handleShiftClick(nodeId);
          } else {
            this._clearMultiSelect();
            this._nodes = this._nodes.map(n => ({ ...n, selected: n.id === nodeId }));
            this._renderReact();
          }
        },
        onEdgeClick: (edgeId: string, edge: Edge) => {
          emitPagesEvent(this, 'graph:edge:click', {
            edgeId,
            edgeType: edge.type ?? '',
          });
        },
        onSelectionChange: (nodes: Node[], edges: Edge[]) => {
          emitPagesEvent(this, 'graph:selection:change', {
            nodeIds: nodes.map(n => n.id),
            edgeIds: edges.map(e => e.id),
          });
        },
        onViewportChange: (viewport: { x: number; y: number; zoom: number }) => {
          emitPagesEvent(this, 'graph:viewport:change', viewport);
        },
        onRelayout: () => {
          emitPagesEvent(this, 'graph:layout:relayout', {});
          void this._runLayout();
        },
        onConnect: (connection: Connection) => {
          if (!this.model) return;
          const source = nodeById(this.model, connection.source);
          const target = nodeById(this.model, connection.target);
          if (!source || !target) return;
          const policy = this.editPolicy;
          if (policy && !policy.canConnect(source, target, this.model)) return;
          this.onMutation?.({ type: 'addEdge', sourceId: connection.source, targetId: connection.target });
          emitPagesEvent(this, 'graph:edge:create', { sourceId: connection.source, targetId: connection.target });
        },
        isValidConnection: (connection: Connection) => {
          if (!this.model) return false;
          const policy = this.editPolicy;
          if (!policy) return false;
          const source = nodeById(this.model, connection.source);
          const target = nodeById(this.model, connection.target);
          if (!source || !target) return false;
          return policy.canConnect(source, target, this.model);
        },
        onReactFlowReady: (instance: ReactFlowInstance) => {
          this._reactFlowInstance = instance;
        },
        onConnectStart: (event: MouseEvent | TouchEvent, params: { nodeId: string | null }) => {
          this._connectSourceNodeId = params.nodeId ?? undefined;
          this._connectStartPos = event instanceof MouseEvent
            ? { x: event.clientX, y: event.clientY }
            : { x: event.touches[0]?.clientX ?? 0, y: event.touches[0]?.clientY ?? 0 };
          this.classList.add('graph-connecting');
        },
        onConnectEnd: (event: MouseEvent | TouchEvent) => {
          const sourceId = this._connectSourceNodeId;
          const _startPos = this._connectStartPos;
          this._connectSourceNodeId = undefined;
          this._connectStartPos = undefined;

          const wasMoveActive = this._moveCoordinator?.isActive || this._moveWasActive;
          this._moveWasActive = false;
          if (wasMoveActive) { this.classList.remove('graph-connecting'); return; }
          if (!sourceId || !this.model) { this.classList.remove('graph-connecting'); return; }

          const pos = event instanceof MouseEvent
            ? { x: event.clientX, y: event.clientY }
            : { x: event.changedTouches[0]?.clientX ?? 0, y: event.changedTouches[0]?.clientY ?? 0 };

          let targetNodeId: string | undefined;
          const connectRoot = this._container?.getRootNode() as DocumentOrShadowRoot | undefined;
          for (const hitEl of (typeof connectRoot?.elementsFromPoint === 'function' ? connectRoot.elementsFromPoint(pos.x, pos.y) : [])) {
            const nodeEl = hitEl.closest('.react-flow__node') as HTMLElement | null;
            if (nodeEl?.dataset['id']) {
              targetNodeId = nodeEl.dataset['id'];
              break;
            }
          }
          this.classList.remove('graph-connecting');

          if (targetNodeId && targetNodeId !== sourceId) {
            const source = nodeById(this.model, sourceId);
            const target = nodeById(this.model, targetNodeId);
            if (source && target) {
              const policy = this.editPolicy;
              if (!policy || policy.canConnect(source, target, this.model)) {
                this.onMutation?.({ type: 'addEdge', sourceId, targetId: targetNodeId });
                emitPagesEvent(this, 'graph:edge:create', { sourceId, targetId: targetNodeId });
              }
            }
            return;
          }

          const canvasRect = this._container?.getBoundingClientRect();
          if (canvasRect && (pos.x < canvasRect.left || pos.x > canvasRect.right || pos.y < canvasRect.top || pos.y > canvasRect.bottom)) return;

          if (_startPos) {
            const dragDist = Math.hypot(pos.x - _startPos.x, pos.y - _startPos.y);
            if (dragDist < 40) return;
          }

          emitPagesEvent(this, 'graph:connect:end-on-empty', { ...pos, sourceNodeId: sourceId });
        },
        onPaneClick: (event) => {
          this._clearMultiSelect();
          emitPagesEvent(this, 'graph:pane:click', { x: event.clientX, y: event.clientY });
        },
        onPaneContextMenu: (event) => {
          emitPagesEvent(this, 'graph:pane:contextmenu', { x: event.clientX, y: event.clientY });
        },
        onNodeContextMenu: (_event, node: Node) => {
          emitPagesEvent(this, 'graph:node:contextmenu', { nodeId: node.id, nodeType: node.type ?? '' });
        },
        onEdgeContextMenu: (_event, edge: Edge) => {
          emitPagesEvent(this, 'graph:edge:contextmenu', { edgeId: edge.id, edgeType: edge.type ?? '' });
        },
        onEdgeMouseEnter: (event: React.MouseEvent, edge: Edge) => {
          emitPagesEvent(this, 'graph:edge:mouseenter', {
            edgeId: edge.id, edgeType: edge.type ?? '',
            label: edge.label ?? '', data: edge.data ?? {},
            clientX: event.clientX, clientY: event.clientY,
          });
        },
        onEdgeMouseLeave: (_event: React.MouseEvent, edge: Edge) => {
          emitPagesEvent(this, 'graph:edge:mouseleave', { edgeId: edge.id });
        },
        nodesConnectable: this.connectionsEnabled,
        miniMapNodeColor: this.miniMapNodeColor,
      }),
    );
  }
}
