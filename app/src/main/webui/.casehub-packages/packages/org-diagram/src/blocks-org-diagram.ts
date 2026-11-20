import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import {
  toOrgGraph,
  registerOrgStencils,
  applyOrgPropertyEdit,
  addOrgUnit,
  removeOrgUnit,
  addMember,
  addRelationship,
  removeRelationship,
  removeMember,
  createOrgEditPolicy,
  enrichWithDescriptors,
  computeDerivedData,
  resolveKindColors,
  applyCollapsedUnits,
  applyOrgEdgeLabels,
  applySelectionHighlight,
  OrgLayoutEngine,
  orgClassificationRules,
  sizingClassifier,
  orgLayoutRules,
  orgHardConstraints,
} from '@casehubio/mosaic-graph-stencil-org';
import type {
  ArchetypeHint,
  OrgLayoutStrategy,
  AgentDescriptor,
  DerivedOrgData,
  FactBase,
} from '@casehubio/mosaic-graph-stencil-org';
import { computeElkLayout } from '@casehubio/graph-renderer';
import type { ElkLayoutOptions, EditPolicy, GraphEdit } from '@casehubio/graph-renderer';
import { emitPagesEvent } from '@casehubio/pages-data';
import { DiagramBaseMixin } from '@casehubio/pages-diagram-core';
import type { AdapterResult, LayoutResult } from '@casehubio/pages-diagram-core';
import '@casehubio/graph-renderer';
import './blocks-org-diagram-toolbar.js';
import './panels/escalation-chain-panel.js';
import './panels/supervision-chain-panel.js';
import './panels/attestation-panel.js';
import './panels/org-legend.js';
import './panels/tooltip.js';
import './panels/edge-tooltip.js';
import type { OrgTooltip } from './panels/tooltip.js';
import type { OrgEdgeTooltip } from './panels/edge-tooltip.js';
import type { OrgAgentNodeData } from '@casehubio/mosaic-graph-stencil-org';
import {
  mythicCollection,
  chibiCollection,
  neonCollection,
  simpsonsCollection,
  registerCollection,
} from '@casehubio/mosaic-agent-avatar-2d';
import type { AvatarCollection } from '@casehubio/mosaic-agent-avatar-2d';

const orgEditPolicy = createOrgEditPolicy();

const COLLECTION_MODULES: Record<string, AvatarCollection> = {
  mythic: mythicCollection,
  chibi: chibiCollection,
  neon: neonCollection,
  simpsons: simpsonsCollection,
};

const EMPTY_ORG_YAML = `organization:
  units:
    - unitId: unit-1
      name: New Unit
      tenancyId: default
      members: []
      capabilities: []
      goals: []
      constraints: []
  relationships: []
`;

function orgMiniMapNodeColor(node: { type?: string }): string {
  switch (node.type) {
    case 'org-unit':  return '#6366f1';  // indigo-500 — matches unit border
    case 'org-agent': return '#6b7280';  // gray-500 — matches agent icon
    default:          return '#2563eb';  // blue-600
  }
}

function orgIconRenderer(icon: string): TemplateResult {
  if (icon === '□') {
    return html`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#6366f1" stroke-width="1.5">${unsafeSVG('<rect x="3" y="3" width="14" height="14" rx="2"/>')}</svg>`;
  }
  if (icon === '●') {
    return html`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#6b7280" stroke-width="1.5">${unsafeSVG('<circle cx="10" cy="7" r="3.5"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6"/>')}</svg>`;
  }
  return html`<span style="width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;">${icon}</span>`;
}

export interface OrgDiagramProps {
  yaml?: string;
  src?: string;
  agents?: Record<string, AgentDescriptor>;
  agentsEndpoint?: string;
  kindColors?: Record<string, { start: string; end: string }>;
  layoutStrategy?: OrgLayoutStrategy | 'auto';
  selectionTopic?: string;
  readonly?: boolean;
  collections?: string[];
}

@customElement('blocks-org-diagram')
export class BlocksOrgDiagram extends DiagramBaseMixin(LitElement) {
  @property({ attribute: 'selection-topic' }) selectionTopic = '';
  @property() layoutStrategy: OrgLayoutStrategy | 'auto' = 'auto';
  @property({ type: Object }) agents: Record<string, AgentDescriptor> | undefined;
  @property({ attribute: 'agents-endpoint' }) agentsEndpoint?: string;
  @property({ type: Object }) kindColors: Record<string, { start: string; end: string }> | undefined;
  @property({ type: Array }) collections?: string[];

  @state() private _archetypeHint: ArchetypeHint | null = null;
  @state() private _paletteOpen = true;
  @state() private _propertiesOpen = true;
  @state() private _collapsedUnits = new Set<string>();
  @state() private _legendOpen = false;
  @state() private _showEscalation = true;
  @state() private _showSupervision = true;
  @state() private _showAttestation = true;
  @state() private _fetchedAgents: Record<string, AgentDescriptor> | undefined;
  @state() private _agentsFetchError: string | undefined;
  private _derivedData: DerivedOrgData | null = null;
  private _baseEdges: any[] = [];
  private _computedNodeSizes: ReadonlyMap<string, { width: number; height: number }> = new Map();
  private _engine: OrgLayoutEngine;
  private _lastFacts: FactBase | null = null;

  constructor() {
    super();
    this._engine = new OrgLayoutEngine();
    for (const r of orgClassificationRules()) this._engine.register(r);
    this._engine.register(sizingClassifier());
    for (const r of orgLayoutRules()) this._engine.register(r);
    for (const c of orgHardConstraints()) this._engine.register(c);
  }

  private get _effectiveAgents(): Record<string, AgentDescriptor> | undefined {
    return this.agents ?? this._fetchedAgents;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    registerOrgStencils();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Organization diagram editor');
    const cols = this.collections ?? ['mythic'];
    for (const id of cols) {
      const col = COLLECTION_MODULES[id];
      if (col) registerCollection(col);
    }
  }

  override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (changed.has('agentsEndpoint') && this.agentsEndpoint) {
      this._fetchAgents(this.agentsEndpoint);
    }
  }

  private async _fetchAgents(endpoint: string): Promise<void> {
    try {
      const resp = await fetch(endpoint);
      if (!resp.ok) {
        this._agentsFetchError = `Failed to fetch agents: ${resp.status}`;
        console.warn(this._agentsFetchError);
        return;
      }
      this._fetchedAgents = await resp.json();
      this._agentsFetchError = undefined;
      if (this._currentYaml) this._fullRender(this._currentYaml);
    } catch (err) {
      this._agentsFetchError = `Failed to fetch agents: ${err}`;
      console.warn(this._agentsFetchError);
    }
  }

  protected _adaptYaml(yaml: string): AdapterResult {
    const base = toOrgGraph(yaml);
    let model = this._effectiveAgents
      ? enrichWithDescriptors(base.model, this._effectiveAgents)
      : base.model;
    const derived = computeDerivedData(model);
    this._derivedData = derived;
    model = resolveKindColors(derived.model, this.kindColors);
    const { model: layoutModel, yamlPaths } = this._collapsedUnits.size > 0
      ? applyCollapsedUnits(model, base.yamlPaths, this._collapsedUnits)
      : { model, yamlPaths: base.yamlPaths };
    const pre = this._engine.preLayout(layoutModel);
    this._computedNodeSizes = pre.nodeSizes;
    this._archetypeHint = pre.archetype;
    this._lastFacts = pre.facts;
    return { model: layoutModel, yamlPaths };
  }

  private _updateEdgeStyles(): void {
    let edges = applyOrgEdgeLabels(this._baseEdges);
    edges = applySelectionHighlight(edges, this._selectedNodeId || undefined);
    (this as any)._edges = edges;
  }

  protected _applyPropertyEdit(
    yaml: string,
    nodePath: readonly (string | number)[],
    field: (string | number)[],
    value: unknown,
  ): string {
    return applyOrgPropertyEdit(yaml, nodePath, field, value);
  }

  protected _emptyTemplate(): string | null {
    return EMPTY_ORG_YAML;
  }

  protected override _editPolicy(): EditPolicy {
    return orgEditPolicy;
  }

  protected override _iconRenderer() {
    return orgIconRenderer;
  }

  override _paletteItems() {
    const policy = this._editPolicy();
    if (!policy || !this._adapterResult) return [];
    const model = this._adapterResult.model;
    const nearNode = this._selectedNodeId
      ? model.nodes.find(n => n.id === this._selectedNodeId) ?? null
      : null;
    return policy.getCreatableTypes(nearNode, model)
      .map(s => ({ type: s.type, label: s.label, icon: s.icon }));
  }

  override _handlePaletteSelect = (e: Event): void => {
    const detail = (e as CustomEvent).detail;
    const nodeType = detail?.item?.type as string | undefined;
    if (!nodeType || !this._adapterResult) return;
    if (nodeType === 'org-agent' && this._selectedNodeId) {
      const selectedNode = this._adapterResult.model.nodes.find(n => n.id === this._selectedNodeId);
      if (selectedNode?.type === 'org-unit') {
        this._handleMutation({ type: 'addNode', nodeType, properties: { parentUnitId: selectedNode.properties['unitId'] as string } });
        return;
      }
    }
    this._handleMutation({ type: 'addNode', nodeType });
  };

  override _chooserItems() {
    const policy = this._editPolicy();
    if (!policy || !this._adapterResult) return [];
    const model = this._adapterResult.model;
    let nearNode = this._selectedNodeId
      ? model.nodes.find(n => n.id === this._selectedNodeId) ?? null
      : null;
    if (!nearNode && this._chooserState?.sourceNodeId) {
      const src = model.nodes.find(n => n.id === this._chooserState!.sourceNodeId);
      if (src?.parentId) {
        nearNode = model.nodes.find(n => n.id === src.parentId) ?? null;
      }
    }
    return policy.getCreatableTypes(nearNode, model)
      .map(s => ({ type: s.type, label: s.label, icon: s.icon }));
  }

  override _onChooserSelect = (e: Event): void => {
    const nodeType = (e as CustomEvent).detail?.item?.type as string | undefined;
    if (!nodeType || !this._adapterResult || !this._chooserState) return;
    const { sourceNodeId } = this._chooserState;
    if (nodeType === 'org-agent') {
      let unitId: string | undefined;
      if (this._selectedNodeId) {
        const sel = this._adapterResult.model.nodes.find(n => n.id === this._selectedNodeId);
        if (sel?.type === 'org-unit') unitId = sel.properties['unitId'] as string;
      }
      if (!unitId && sourceNodeId) {
        const src = this._adapterResult.model.nodes.find(n => n.id === sourceNodeId);
        if (src?.parentId) {
          const parent = this._adapterResult.model.nodes.find(n => n.id === src.parentId);
          if (parent?.type === 'org-unit') unitId = parent.properties['unitId'] as string;
        }
      }
      if (!unitId) return;
      this._handleMutation({ type: 'addNode', nodeType, properties: { parentUnitId: unitId } });
    } else {
      this._handleMutation({ type: 'addNode', nodeType });
    }
    this._chooserState = null;
  };

  private _buildElkOpts(strategy: OrgLayoutStrategy): ElkLayoutOptions {
    const orgOpts = this._engine.elkOptions(strategy);
    const opts: ElkLayoutOptions = {
      headerHeight: 68,
    };
    if (orgOpts.algorithm !== undefined) opts.algorithm = orgOpts.algorithm;
    if (orgOpts.spacing !== undefined) opts.spacing = orgOpts.spacing;
    if (orgOpts.direction !== undefined) opts.direction = orgOpts.direction;
    if (orgOpts.containerPadding !== undefined) opts.containerPadding = orgOpts.containerPadding;
    if (orgOpts.elkOptions !== undefined) opts.elkOptions = orgOpts.elkOptions;
    if (this._computedNodeSizes.size > 0) opts.nodeSizes = this._computedNodeSizes;
    return opts;
  }

  protected override _layoutOptions(): ElkLayoutOptions {
    const strategy = this.layoutStrategy === 'auto'
      ? (this._archetypeHint?.layout ?? 'force')
      : this.layoutStrategy;
    const opts = this._buildElkOpts(strategy);
    if (this._computedNodeSizes.size > 0) opts.nodeSizes = this._computedNodeSizes;
    return opts;
  }

  protected override async _computeLayout(
    model: import('@casehubio/graph-core').GraphModel,
    _options: ElkLayoutOptions,
  ): Promise<LayoutResult> {
    if (this.layoutStrategy === 'auto') {
      const primary = this._archetypeHint?.layout ?? 'force';

      if (primary === 'hub-spoke' || primary === 'circular') {
        try {
          return { layout: await computeElkLayout(model, { algorithm: 'radial' }), direction: undefined };
        } catch { /* fall through to ELK */ }
      }

      const opts = this._buildElkOpts(primary);
      try {
        return { layout: await computeElkLayout(model, opts), direction: opts.direction };
      } catch {
        const fallback = this._buildElkOpts('force');
        return { layout: await computeElkLayout(model, fallback), direction: fallback.direction };
      }
    }

    const opts = this._layoutOptions();
    return { layout: await computeElkLayout(model, opts), direction: opts.direction };
  }

  protected override _postLayout(
    nodes: import('@xyflow/react').Node[],
    edges: import('@xyflow/react').Edge[],
  ): { nodes: import('@xyflow/react').Node[]; edges: import('@xyflow/react').Edge[] } {
    if (this._lastFacts) {
      this._engine.postLayout(nodes as any, edges as any, this._lastFacts);
    }
    this._baseEdges = [...edges];
    const styled = applyOrgEdgeLabels(edges);
    const highlighted = applySelectionHighlight(styled, this._selectedNodeId || undefined);
    return { nodes, edges: highlighted };
  }

  override _handleCanvasEvent = (e: CustomEvent): void => {
    const topic = e.detail?.topic;
    const payload = e.detail?.payload ?? e.detail;
    if (topic === 'graph:node:click') this._handleNodeClick(e);
    else if (topic === 'graph:selection:change') { const prev = this._selectedNodeId; this._handleSelectionChange(e); if (this._selectedNodeId !== prev) this._updateEdgeStyles(); }
    else if (topic === 'graph:pane:click') { this._showPickerAtPaneClick(); this._onNodeHoverEnd(); }
    else if (topic === 'graph:connect:end-on-empty') this._showPickerAtConnectEnd(payload);
    else if (topic === 'graph:node:mouseenter') { const nodeId = payload?.nodeId as string | undefined; if (nodeId) this._onNodeHover(nodeId, e as unknown as MouseEvent); }
    else if (topic === 'graph:node:mouseleave') this._onNodeHoverEnd();
    else if (topic === 'graph:edge:mouseenter') { this._onEdgeHover(payload?.edgeId as string, payload?.edgeType as string, payload?.label as string, payload?.clientX as number, payload?.clientY as number); }
    else if (topic === 'graph:edge:mouseleave') this._onEdgeHoverEnd();
  };

  protected override _applyGraphEdit(yaml: string, edit: GraphEdit): string {
    switch (edit.type) {
      case 'addNode': {
        if (edit.nodeType === 'org-unit') {
          const parentUnitId = edit.properties?.['parentUnitId'] as string | undefined;
          return addOrgUnit(yaml, parentUnitId !== undefined ? { parentUnitId } : undefined);
        }
        if (edit.nodeType === 'org-agent') {
          const parentUnitId = edit.properties?.['parentUnitId'] as string | undefined;
          if (!parentUnitId || !this._adapterResult) {
            throw new Error('Cannot add agent without selecting a unit');
          }
          const unitPath = this._adapterResult.yamlPaths.get(`unit:${parentUnitId}`);
          if (!unitPath) throw new Error(`No YAML path for unit ${parentUnitId}`);
          return addMember(yaml, unitPath, { agentId: `agent-${Date.now()}` });
        }
        throw new Error(`Unknown node type: ${edit.nodeType}`);
      }
      case 'removeNode': {
        const nodePath = this._adapterResult?.yamlPaths.get(edit.nodeId);
        if (!nodePath) throw new Error(`No YAML path for node ${edit.nodeId}`);
        if (edit.nodeId.startsWith('unit:')) {
          return removeOrgUnit(yaml, nodePath);
        }
        const parts = edit.nodeId.split(':');
        const unitId = parts[1];
        if (unitId === undefined) throw new Error(`Cannot parse node ID: ${edit.nodeId}`);
        const memberIndex = nodePath[nodePath.length - 1] as number;
        const unitPath = nodePath.slice(0, -2);
        return removeMember(yaml, unitPath, memberIndex);
      }
      case 'addEdge': {
        const sourceNode = this._adapterResult?.model.nodes.find(n => n.id === edit.sourceId);
        const targetNode = this._adapterResult?.model.nodes.find(n => n.id === edit.targetId);
        if (!sourceNode || !targetNode) throw new Error('Source or target node not found');
        const tenancyId = (sourceNode.properties['unitId'] as string) !== undefined
          ? this._findTenancyId()
          : 'default';
        return addRelationship(yaml, {
          sourceAgentId: sourceNode.properties['agentId'] as string,
          targetAgentId: targetNode.properties['agentId'] as string,
          kind: 'SUPERVISES',
          tenancyId,
        });
      }
      case 'removeEdge': {
        const edgePath = this._adapterResult?.yamlPaths.get(edit.edgeId);
        if (!edgePath) throw new Error(`No YAML path for edge ${edit.edgeId}`);
        return removeRelationship(yaml, edgePath);
      }
      case 'reconnectEdge':
        throw new Error('reconnectEdge — not yet implemented');
      default:
        throw new Error(`Unsupported edit type: ${(edit as GraphEdit).type}`);
    }
  }

  private _findTenancyId(): string {
    if (!this._adapterResult) return 'default';
    const unit = this._adapterResult.model.nodes.find(n => n.type === 'org-unit');
    return (unit?.properties['tenancyId'] as string | undefined) ?? 'default';
  }

  private _computeStats() {
    if (!this._adapterResult) return { units: 0, agents: 0, rels: 0 };
    const nodes = this._adapterResult.model.nodes;
    return {
      units: nodes.filter(n => n.type === 'org-unit').length,
      agents: nodes.filter(n => n.type === 'org-agent').length,
      rels: this._adapterResult.model.edges.length,
    };
  }

  private _onNodeClick(nodeId: string): void {
    if (!this.selectionTopic) return;
    const node = this._adapterResult?.model.nodes.find(n => n.id === nodeId);
    emitPagesEvent(this, this.selectionTopic, {
      nodeId,
      nodeType: node?.type ?? '',
      properties: node?.properties ?? {},
    });
  }

  private _onNodeHover = (nodeId: string, event: MouseEvent): void => {
    if (!this._adapterResult) return;
    const node = this._adapterResult.model.nodes.find(n => n.id === nodeId);
    if (!node || node.type !== 'org-agent') return;
    const tooltip = this.renderRoot?.querySelector('org-tooltip') as OrgTooltip | null;
    if (tooltip) {
      const rect = (this as HTMLElement).getBoundingClientRect();
      tooltip.show(node.properties as unknown as OrgAgentNodeData, event.clientX - rect.left, event.clientY - rect.top - 20);
    }
  };

  private _onNodeHoverEnd = (): void => {
    const tooltip = this.renderRoot?.querySelector('org-tooltip') as OrgTooltip | null;
    if (tooltip) tooltip.scheduleDismiss();
  };

  private _onEdgeHover = (edgeId: string, edgeType: string, label: string, clientX: number, clientY: number): void => {
    const edgeTooltip = this.renderRoot?.querySelector('org-edge-tooltip') as OrgEdgeTooltip | null;
    if (edgeTooltip) {
      const rect = (this as HTMLElement).getBoundingClientRect();
      edgeTooltip.show(label, edgeType, clientX - rect.left, clientY - rect.top - 20);
    }
  };

  private _onEdgeHoverEnd = (): void => {
    const edgeTooltip = this.renderRoot?.querySelector('org-edge-tooltip') as OrgEdgeTooltip | null;
    if (edgeTooltip) edgeTooltip.scheduleDismiss();
  };

  private _onPanelAgentClick = (e: CustomEvent<{ agentId: string }>): void => {
    const agentId = e.detail.agentId;
    if (!this._adapterResult) return;
    const node = this._adapterResult.model.nodes.find(
      n => n.type === 'org-agent' && n.properties['agentId'] === agentId,
    );
    if (node) {
      (this as any)._selectedNodeId = node.id;
      this._updateEdgeStyles();
      this.requestUpdate();
    }
  };

  private _toggleUnitCollapse(unitId: string): void {
    const next = new Set(this._collapsedUnits);
    if (next.has(unitId)) next.delete(unitId);
    else next.add(unitId);
    this._collapsedUnits = next;
    if (this._adapterResult) {
      this._fullRender(this._currentYaml);
    }
  }

  private _onLayoutChange(e: CustomEvent<{ strategy: OrgLayoutStrategy | 'auto' }>): void {
    this.layoutStrategy = e.detail.strategy;
    if (this._adapterResult) {
      this._fullRender(this._currentYaml);
    }
  }

  private _renderDockHeader(title: string, side: 'left' | 'right') {
    const close = () => {
      if (side === 'left') this._paletteOpen = !this._paletteOpen;
      else this._propertiesOpen = !this._propertiesOpen;
    };
    return html`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:3px 6px;border-bottom:1px solid var(--pages-neutral-4,#e5e7eb);background:var(--pages-neutral-2,#f8f9fa);">
        <span style="font-size:11px;font-weight:600;color:var(--pages-neutral-11,#374151);text-transform:uppercase;letter-spacing:0.5px;">${title}</span>
        <button @click=${close}
          style="border:none;background:none;cursor:pointer;font-size:13px;color:var(--pages-neutral-9,#6b7280);padding:0 2px;line-height:1;"
          aria-label=${`Close ${title} panel`}>&times;</button>
      </div>`;
  }

  private _renderCollapsedDock(title: string, icon: string, side: 'left' | 'right') {
    const toggle = () => {
      if (side === 'left') this._paletteOpen = true;
      else this._propertiesOpen = true;
    };
    return html`
      <div style="width:28px;display:flex;flex-direction:column;align-items:center;border-${side === 'left' ? 'right' : 'left'}:1px solid var(--pages-neutral-4,#e5e7eb);background:var(--pages-neutral-2,#f8f9fa);padding-top:8px;">
        <button @click=${toggle}
          style="border:none;background:none;cursor:pointer;padding:4px;color:var(--pages-neutral-9,#6b7280);font-size:14px;writing-mode:vertical-rl;text-orientation:mixed;letter-spacing:1px;"
          aria-label=${`Open ${title} panel`}>${icon} ${title}</button>
      </div>`;
  }

  override render() {
    if (this._error) return this._renderError();

    const stats = this._computeStats();
    const hasSelection = this._selectedNodeId !== '';

    return html`
      <div style="display:flex;flex-direction:column;width:100%;height:100%;">
        <blocks-org-diagram-toolbar
          ?hasBackend=${this.backend != null}
          ?dirty=${this._isDirty}
          ?saving=${this._saving}
          .archetype=${this._archetypeHint?.archetype ?? null}
          .confidence=${this._archetypeHint?.confidence ?? 'low'}
          .layoutStrategy=${this.layoutStrategy}
          .unitCount=${stats.units}
          .agentCount=${stats.agents}
          .relationshipCount=${stats.rels}
          @toolbar-save=${() => this._save()}
          @toolbar-layout-change=${this._onLayoutChange}
          @toolbar-export=${(e: CustomEvent<{ format: 'svg' | 'png' }>) => this._exportDiagram(e.detail.format)}
        ></blocks-org-diagram-toolbar>
        <div style="display:flex;flex:1;overflow:hidden;">
          ${this._paletteOpen ? html`
            <div style="border-right:1px solid var(--pages-neutral-4,#e5e7eb);display:flex;flex-direction:column;overflow-y:auto;flex-shrink:0;">
              ${this._renderDockHeader('Stencils', 'left')}
              <div style="padding:2px 4px;">
                ${this._renderStencilPalette()}
              </div>
            </div>
          ` : this._renderCollapsedDock('Stencils', '⊞', 'left')}
          <div style="position:relative;flex:1;height:100%;min-width:0;" @pointerdown=${this._onCanvasPointerDown}>
            <graph-canvas-core
              .nodes=${this._nodes}
              .edges=${this._edges}
              .model=${this._adapterResult?.model}
              .editPolicy=${this._editPolicy()}
              .onMutation=${this._handleMutation}
              .miniMapNodeColor=${orgMiniMapNodeColor}
              role="img"
              aria-label=${`Organization diagram: ${stats.units} units, ${stats.agents} agents, ${stats.rels} relationships`}
              style="width:100%;height:100%;"
              @pages-event=${this._handleCanvasEvent}
            ></graph-canvas-core>
            ${this._renderNodePicker()}
          </div>
          ${this._propertiesOpen ? html`
            <div style="width:300px;border-left:1px solid var(--pages-neutral-4,#e5e7eb);display:flex;flex-direction:column;overflow-y:auto;flex-shrink:0;">
              ${this._renderDockHeader('Properties', 'right')}
              ${hasSelection ? html`
                <div style="padding:8px;">
                  ${this._renderPropertyPanel()}
                </div>
              ` : html`
                <div style="padding:12px;color:var(--pages-neutral-8,#9ca3af);font-size:12px;font-style:italic;">
                  Click a node to view its properties
                </div>
              `}
            </div>
          ` : this._renderCollapsedDock('Properties', '☰', 'right')}
        </div>
        <div style="display:flex;align-items:center;gap:6px;padding:6px 8px 2px 8px;flex-shrink:0;">
          ${this._derivedData?.escalationChains.length ? html`
            <button
              style="font-size:9px;padding:3px 10px;border-radius:12px;border:1px solid ${this._showEscalation ? '#c53030' : '#cbd5e0'};background:${this._showEscalation ? '#fff5f5' : 'transparent'};color:${this._showEscalation ? '#c53030' : '#718096'};cursor:pointer;font-weight:600;"
              aria-pressed=${this._showEscalation}
              @click=${() => { this._showEscalation = !this._showEscalation; }}
            >ESC</button>
          ` : nothing}
          ${this._derivedData?.supervisionSummary.length ? html`
            <button
              style="font-size:9px;padding:3px 10px;border-radius:12px;border:1px solid ${this._showSupervision ? '#2b6cb0' : '#cbd5e0'};background:${this._showSupervision ? '#ebf8ff' : 'transparent'};color:${this._showSupervision ? '#2b6cb0' : '#718096'};cursor:pointer;font-weight:600;"
              aria-pressed=${this._showSupervision}
              @click=${() => { this._showSupervision = !this._showSupervision; }}
            >SUP</button>
          ` : nothing}
          ${this._derivedData?.attestationSummary.length ? html`
            <button
              style="font-size:9px;padding:3px 10px;border-radius:12px;border:1px solid ${this._showAttestation ? '#6b21a8' : '#cbd5e0'};background:${this._showAttestation ? '#f3e8ff' : 'transparent'};color:${this._showAttestation ? '#6b21a8' : '#718096'};cursor:pointer;font-weight:600;"
              aria-pressed=${this._showAttestation}
              @click=${() => { this._showAttestation = !this._showAttestation; }}
            >ATT</button>
          ` : nothing}
          <button
            style="font-size:9px;padding:3px 10px;border-radius:12px;border:1px solid ${this._legendOpen ? '#4a5568' : '#cbd5e0'};background:${this._legendOpen ? '#edf2f7' : 'transparent'};color:${this._legendOpen ? '#4a5568' : '#718096'};cursor:pointer;font-weight:600;"
            aria-pressed=${this._legendOpen}
            @click=${() => { this._legendOpen = !this._legendOpen; }}
          >LGD</button>
        </div>
        <div style="display:flex;gap:8px;padding:4px 8px 8px 8px;flex-shrink:0;overflow-x:auto;flex-wrap:wrap;">
          ${this._showEscalation && this._derivedData?.escalationChains.length ? html`
            <org-escalation-chain-panel
              style="flex:1;min-width:200px;"
              .chains=${this._derivedData.escalationChains}
              .highlightAgent=${this._selectedNodeId ? this._adapterResult?.model.nodes.find(n => n.id === this._selectedNodeId)?.properties['agentId'] as string : undefined}
              @agent-click=${this._onPanelAgentClick}
            ></org-escalation-chain-panel>
          ` : nothing}
          ${this._showSupervision && this._derivedData?.supervisionSummary.length ? html`
            <org-supervision-chain-panel
              style="flex:1;min-width:200px;"
              .entries=${this._derivedData.supervisionSummary}
              .highlightAgent=${this._selectedNodeId ? this._adapterResult?.model.nodes.find(n => n.id === this._selectedNodeId)?.properties['agentId'] as string : undefined}
              @agent-click=${this._onPanelAgentClick}
            ></org-supervision-chain-panel>
          ` : nothing}
          ${this._showAttestation && this._derivedData?.attestationSummary.length ? html`
            <org-attestation-panel
              style="flex:1;min-width:200px;"
              .grants=${this._derivedData.attestationSummary}
              .highlightAgent=${this._selectedNodeId ? this._adapterResult?.model.nodes.find(n => n.id === this._selectedNodeId)?.properties['agentId'] as string : undefined}
              @agent-click=${this._onPanelAgentClick}
            ></org-attestation-panel>
          ` : nothing}
          ${this._legendOpen ? html`
            <org-legend style="flex:1;min-width:200px;" .kindColors=${this.kindColors ?? {}}></org-legend>
          ` : nothing}
        </div>
        <org-tooltip></org-tooltip>
        <org-edge-tooltip></org-edge-tooltip>
        ${this._renderDialogs()}
      </div>
    `;
  }
}
