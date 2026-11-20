import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { toSwfGraph, applySwfPropertyEdit, addSwfTask, insertSwfTask, spliceSwfTask, removeSwfTask, moveSwfTask, registerSwfStencils, createSwfEditPolicy } from '@casehubio/mosaic-graph-stencil-swf';
import { DiagramBaseMixin } from '@casehubio/pages-diagram-core';
import type { AdapterResult, LayoutResult } from '@casehubio/pages-diagram-core';
import type { EditPolicy, GraphEdit } from '@casehubio/graph-renderer';
import { emitPagesEvent } from '@casehubio/pages-data';
import { detectDiagramType } from '@casehubio/mosaic-core';
import { stringify } from 'yaml';
import { computeSwfLayout } from './swf-layout.js';
import '@casehubio/graph-renderer';

const swfEditPolicy = createSwfEditPolicy();

function svgIcon(paths: string, color: string, size = 20) {
  return html`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${unsafeSVG(paths)}</svg>`;
}

const SWF_ICON_PATHS: Record<string, { paths: string; color: string }> = {
  phone: {
    paths: '<path d="M5 4h3l1.5 4-2 1.5a8 8 0 003 3L12 11l4 1.5V16a1 1 0 01-1 1A13 13 0 014 5a1 1 0 011-1"></path>',
    color: '#2563eb',
  },
  edit: {
    paths: '<path d="M12 3l5 5-9 9H3v-5z"></path><path d="M10 5l5 5"></path>',
    color: '#7c3aed',
  },
  'git-branch': {
    paths: '<circle cx="7" cy="5" r="2"></circle><circle cx="13" cy="15" r="2"></circle><circle cx="7" cy="15" r="2"></circle><path d="M7 7v6m6-6V7a2 2 0 00-2-2H7"></path>',
    color: '#0891b2',
  },
  'alert-triangle': {
    paths: '<path d="M10 3L2 17h16L10 3z" fill="#dc2626" fill-opacity="0.12"></path><path d="M10 8v3m0 2.5v.5"></path>',
    color: '#dc2626',
  },
  shield: {
    paths: '<path d="M10 2L3 6v4c0 4.4 3 8.5 7 10 4-1.5 7-5.6 7-10V6l-7-4z" fill="#16a34a" fill-opacity="0.1"></path><path d="M8 10l2 2 3-4"></path>',
    color: '#16a34a',
  },
  'shield-off': {
    paths: '<path d="M10 2L3 6v4c0 2.3.8 4.5 2.1 6.3m2.5 2.3C8.5 19.4 9.2 20 10 20c4-1.5 7-5.6 7-10V6l-7-4z" fill="#dc2626" fill-opacity="0.08"></path><path d="M3 3l14 14"></path>',
    color: '#dc2626',
  },
  repeat: {
    paths: '<path d="M14 4l3 3-3 3"></path><path d="M3 10V8a3 3 0 013-3h11"></path><path d="M6 16l-3-3 3-3"></path><path d="M17 10v2a3 3 0 01-3 3H3"></path>',
    color: '#0891b2',
  },
  list: {
    paths: '<path d="M4 5h12M4 10h12M4 15h12"></path><circle cx="3" cy="5" r="0.5" fill="#2563eb"></circle><circle cx="3" cy="10" r="0.5" fill="#2563eb"></circle><circle cx="3" cy="15" r="0.5" fill="#2563eb"></circle>',
    color: '#2563eb',
  },
  'git-merge': {
    paths: '<circle cx="7" cy="5" r="2"></circle><circle cx="13" cy="15" r="2"></circle><path d="M7 7c0 4 6 4 6 6"></path><path d="M7 7v8"></path>',
    color: '#7c3aed',
  },
  send: {
    paths: '<path d="M3 10l14-7-4 14-3-5z"></path><path d="M10 12l7-9"></path>',
    color: '#7c3aed',
  },
  radio: {
    paths: '<circle cx="10" cy="12" r="2"></circle><path d="M6.3 8.3a5 5 0 017.4 0"></path><path d="M3.8 5.8a9 9 0 0112.4 0"></path><path d="M10 14v3"></path>',
    color: '#0d9488',
  },
  terminal: {
    paths: '<path d="M4 17h12"></path><path d="M4 7l5 4-5 4"></path>',
    color: '#059669',
  },
  clock: {
    paths: '<circle cx="10" cy="10" r="7"></circle><path d="M10 6v4l3 2"></path>',
    color: '#475569',
  },
  box: {
    paths: '<rect x="4" y="4" width="12" height="12" rx="1"></rect>',
    color: '#6b7280',
  },
};

function swfIconRenderer(icon: string) {
  const def = SWF_ICON_PATHS[icon];
  if (!def) return html`<span style="width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;">${icon}</span>`;
  return svgIcon(def.paths, def.color);
}

@customElement('swf-diagram')
export class SwfDiagram extends DiagramBaseMixin(LitElement) {
  @property({ attribute: 'layout-direction' })
  layoutDirection: 'DOWN' | 'RIGHT' = 'DOWN';

  @state() private _pendingEdgeId: string | null = null;

  override _onChooserSelect = (e: Event): void => {
    const detail = (e as CustomEvent).detail;
    const nodeType = detail?.item?.type as string | undefined;
    if (!nodeType || !this._adapterResult || !this._chooserState) return;

    if (this._pendingEdgeId) {
      this._handleMutation({ type: 'splitEdge', edgeId: this._pendingEdgeId, insertNodeType: nodeType });
      this._pendingEdgeId = null;
    } else {
      this._handleMutation({ type: 'addNode', nodeType });
    }
    this._chooserState = null;
  };

  override _onChooserDismiss = (): void => {
    this._pendingEdgeId = null;
    this._chooserState = null;
  };

  override _chooserItems() {
    if (!this._pendingEdgeId || !this._adapterResult) {
      return super._chooserItems();
    }
    const edge = this._adapterResult.model.edges.find(e => e.id === this._pendingEdgeId);
    if (!edge) return super._chooserItems();
    const policy = this._editPolicy();
    return policy.getInsertableTypes(edge, this._adapterResult.model).map(info => ({
      type: info.type, label: info.label, icon: info.icon,
    }));
  }

  override connectedCallback(): void {
    super.connectedCallback();
    registerSwfStencils();
  }

  protected _adaptYaml(yaml: string): AdapterResult {
    return toSwfGraph(yaml);
  }

  protected _applyPropertyEdit(
    yaml: string,
    nodePath: readonly (string | number)[],
    field: (string | number)[],
    value: unknown,
  ): string {
    return applySwfPropertyEdit(yaml, nodePath, field, value);
  }

  protected override _layoutOptions() {
    return { direction: this.layoutDirection, spacing: 60, containerPadding: 25 };
  }

  protected override _postLayout(nodes: import('@xyflow/react').Node[], edges: import('@xyflow/react').Edge[]) {
    const nodeParents = new Map(nodes.map(n => [n.id, n.parentId]));
    const nodeTypes = new Map(nodes.map(n => [n.id, n.type]));
    const filteredEdges = edges.filter(e => {
      const sp = nodeParents.get(e.source);
      const tp = nodeParents.get(e.target);
      if (!sp || !tp || sp !== tp) return true;
      if (sp === 'root') return true;
      const parentType = nodeTypes.get(sp);
      return parentType !== 'swf-try' && parentType !== 'swf-try-catch' && parentType !== 'swf-fork';
    });
    const connectedIds = new Set(filteredEdges.flatMap(e => [e.source, e.target]));
    const containerTypes = new Set(['swf-try', 'swf-try-catch', 'swf-for', 'swf-do', 'swf-fork']);
    const filteredNodes = nodes
      .filter(n => n.type !== 'swf-root')
      .map(n => {
        const cleared = { ...n };
        if (n.parentId === 'root') delete cleared.parentId;
        const isInnerStructural = (n.type === 'swf-try-catch' || n.type === 'swf-try' || n.type === 'swf-catch' || n.type === 'swf-do' || n.type === 'swf-fork') && n.parentId && n.parentId !== 'root';
        if (!connectedIds.has(n.id) || isInnerStructural) {
          cleared.data = { ...cleared.data, _hideHandles: true };
        }
        if (containerTypes.has(n.type ?? '')) {
          cleared.style = {
            ...cleared.style,
            background: 'var(--pages-neutral-4, #e5e5e5)',
            border: '2px solid #d97706',
            borderRadius: '10px',
          };
        }
        return cleared;
      });
    return { nodes: filteredNodes, edges: filteredEdges };
  }

  protected override async _computeLayout(
    model: import('@casehubio/graph-core').GraphModel,
    options: import('@casehubio/graph-renderer').ElkLayoutOptions,
  ): Promise<LayoutResult> {
    const layout = await computeSwfLayout(model, options);
    return { layout, direction: options.direction };
  }

  protected override _editPolicy(): EditPolicy {
    return swfEditPolicy;
  }

  override _handlePaletteSelect = (e: Event): void => {
    if (this.readonly) return;
    const detail = (e as CustomEvent).detail;
    const nodeType = detail?.item?.type as string | undefined;
    if (!nodeType || !this._adapterResult) return;
    const policy = this._editPolicy();
    const placement = policy.getAddPlacement?.(nodeType, this._adapterResult.model) ?? { type: 'detached' as const };
    if (placement.type === 'splitEdge') {
      this._handleMutation({ type: 'splitEdge', edgeId: placement.edgeId, insertNodeType: nodeType });
    } else {
      this._handleMutation({ type: 'addNode', nodeType });
    }
  };

  protected override _iconRenderer() {
    return swfIconRenderer;
  }

  protected override _applyGraphEdit(yaml: string, edit: GraphEdit): string {
    switch (edit.type) {
      case 'addNode':
        return addSwfTask(yaml, edit.nodeType);
      case 'removeNode': {
        const node = this._adapterResult?.model.nodes.find(n => n.id === edit.nodeId);
        const label = node?.properties['label'];
        if (!label || typeof label !== 'string') throw new Error(`Cannot resolve task name for ${edit.nodeId}`);
        return removeSwfTask(yaml, label);
      }
      case 'moveNodeToEdge': {
        const draggedNode = this._adapterResult?.model.nodes.find(n => n.id === edit.nodeId);
        const draggedName = draggedNode?.properties['label'];
        if (!draggedName || typeof draggedName !== 'string') throw new Error(`Cannot resolve task name for ${edit.nodeId}`);
        const targetEdge = this._adapterResult?.model.edges.find(e => e.id === edit.edgeId);
        const targetNode = targetEdge ? this._adapterResult?.model.nodes.find(n => n.id === targetEdge.target) : undefined;
        const sourceNode = targetEdge ? this._adapterResult?.model.nodes.find(n => n.id === targetEdge.source) : undefined;
        const targetName = targetNode?.properties['label'];
        const sourceName = sourceNode?.properties['label'];
        return moveSwfTask(yaml, draggedName, typeof targetName === 'string' ? targetName : null, typeof sourceName === 'string' ? sourceName : undefined);
      }
      case 'addEdge':
        throw new Error('addEdge for SWF diagrams — not yet implemented');
      case 'removeEdge':
        throw new Error('removeEdge for SWF diagrams — not yet implemented');
      case 'reconnectEdge':
        throw new Error('reconnectEdge for SWF diagrams — not yet implemented');
      case 'splitEdge': {
        const targetEdge = this._adapterResult?.model.edges.find(e => e.id === edit.edgeId);
        if (!targetEdge) return addSwfTask(yaml, edit.insertNodeType);
        const sourceNode = this._adapterResult?.model.nodes.find(n => n.id === targetEdge.source);
        const targetNode = this._adapterResult?.model.nodes.find(n => n.id === targetEdge.target);
        const sourceName = sourceNode?.properties['label'] as string | undefined;
        const targetName = (targetNode && targetNode.type !== 'swf-end') ? targetNode.properties['label'] as string | undefined : null;
        if (sourceName && targetName) {
          return spliceSwfTask(yaml, edit.insertNodeType, sourceName, targetName);
        }
        return insertSwfTask(yaml, edit.insertNodeType, targetName ?? null);
      }
      default:
        throw new Error(`Unsupported edit type: ${(edit as GraphEdit).type}`);
    }
  }

  protected _emptyTemplate(): string | null {
    return null;
  }

  private async _handleDrillDown(payload: {
    nodeId: string; nodeName: string; definitionRef?: string;
  }): Promise<void> {
    const { nodeName, definitionRef } = payload;
    if (!definitionRef) return;

    let yaml: string;
    let diagramType: string;

    if (definitionRef.startsWith('#')) {
      const defs = (this._adapterResult as any)?.definitions as Record<string, unknown> | undefined;
      const fragment = defs?.[definitionRef.slice(1)];
      if (!fragment) { this._error = `Definition '${definitionRef.slice(1)}' not found`; return; }
      yaml = stringify(fragment);
      diagramType = detectDiagramType(yaml);
    } else {
      try {
        const base = this.src ? new URL(this.src, window.location.href) : new URL(window.location.href);
        const res = await fetch(new URL(definitionRef, base).toString());
        if (!res.ok) throw new Error(`${res.status}`);
        yaml = await res.text();
        diagramType = detectDiagramType(yaml);
      } catch (e) {
        this._error = `Failed to load ${definitionRef}: ${e}`;
        return;
      }
    }

    emitPagesEvent(this, 'diagram:drill-down:resolved', { name: nodeName, yaml, diagramType });
  }

  private _selectedHasDefinition(): boolean {
    if (!this._selectedNodeId || !this._adapterResult) return false;
    const node = this._adapterResult.model.nodes.find(n => n.id === this._selectedNodeId);
    return !!(node?.properties['definitionRef']);
  }

  private _handlePropertyDrillDown(): void {
    if (!this._selectedNodeId || !this._adapterResult) return;
    const node = this._adapterResult.model.nodes.find(n => n.id === this._selectedNodeId);
    if (!node) return;
    const label = node.properties['label'] as string ?? '';
    const payload: { nodeId: string; nodeName: string; definitionRef?: string } = {
      nodeId: node.id,
      nodeName: label,
    };
    const ref = node.properties['definitionRef'] as string | undefined;
    if (ref !== undefined) payload.definitionRef = ref;
    this._handleDrillDown(payload);
  }

  override _handleCanvasEvent = (e: CustomEvent): void => {
    const topic = e.detail?.topic;
    if (topic === 'graph:node:click') this._handleNodeClick(e);
    else if (topic === 'graph:selection:change') this._handleSelectionChange(e);
    else if (topic === 'graph:pane:click') this._showPickerAtPaneClick();
    else if (topic === 'graph:connect:end-on-empty') this._showPickerAtConnectEnd(e.detail?.payload);
    else if (topic === 'diagram:drill-down') this._handleDrillDown(e.detail?.payload);
    else if (topic === 'graph:edge:click' && !this.readonly) {
      this._pendingEdgeId = e.detail?.payload?.edgeId ?? null;
      if (this._pendingEdgeId) {
        this._chooserState = { x: this._lastPointerX, y: this._lastPointerY };
      }
    }
  };

  override render() {
    if (this._error) {
      return this._renderError();
    }
    const hasSelection = this._selectedNodeId !== '';

    return html`
      <div style="display: flex; flex-direction: column; width: 100%; height: 100%;">
        <diagram-toolbar
          ?hasBackend=${this.backend != null}
          ?hasNodes=${this._nodes.length > 0}
          ?dirty=${this._isDirty}
          ?saving=${this._saving}
          @toolbar-save=${() => this._save()}
          @toolbar-export=${(e: CustomEvent<{ format: 'svg' | 'png' }>) => this._exportDiagram(e.detail.format)}
        ></diagram-toolbar>
        <div style="display: flex; flex: 1; overflow: hidden;">
          <div style="border-right:1px solid var(--pages-neutral-4,#e5e7eb); display:flex; flex-direction:column; overflow-y:auto; flex-shrink:0; padding:8px;">
            ${this._renderStencilPalette()}
          </div>
          <div style="flex:1;height:100%;min-width:0;position:relative;" @pointerdown=${this._onCanvasPointerDown}>
            ${this._renderCanvas()}
            ${this._renderNodePicker()}
          </div>
          ${hasSelection ? html`
            <div style="width:300px; border-left:1px solid var(--pages-neutral-4,#e5e7eb); display:flex; flex-direction:column; overflow-y:auto; flex-shrink:0;">
              <div style="padding:6px 10px; border-bottom:1px solid var(--pages-neutral-4,#e5e7eb); background:var(--pages-neutral-2,#f8f9fa);">
                <span style="font-size:12px; font-weight:600; color:var(--pages-neutral-11,#374151); text-transform:uppercase; letter-spacing:0.5px;">Properties</span>
              </div>
              <div style="padding:8px;">
                ${this._renderPropertyPanel()}
                ${this._selectedHasDefinition() ? html`
                  <div style="padding: 8px 0; border-top: 1px solid var(--pages-neutral-4,#e5e7eb); margin-top: 8px;">
                    <a style="font-size: 13px; color: var(--pages-accent-9, #2563eb); cursor: pointer; text-decoration: none;"
                      @click=${() => this._handlePropertyDrillDown()}>Drill down ⤢</a>
                  </div>
                ` : nothing}
              </div>
            </div>
          ` : nothing}
          ${this._adapterResult?.degraded ? html`
            <div style="position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); background: var(--pages-warning-color, #f59e0b); color: #000; padding: 4px 12px; border-radius: 4px; font-size: 12px;">
              Property editing unavailable — ${this._adapterResult.degraded.reason}
            </div>
          ` : nothing}
        </div>
        ${this._renderDialogs()}
      </div>
    `;
  }
}
