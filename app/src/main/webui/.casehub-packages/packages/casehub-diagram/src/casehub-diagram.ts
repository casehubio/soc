import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import {
  toGraph,
  registerCaseStencils,
  applyPropertyEdit,
  addElement,
  removeElement,
  removeCaseEdge,
  addCaseEdge,
  switchBindingTarget,
  switchFunctionType,
  switchMcpTransport,
  switchModelProvider,
  switchTriggerType,
  createCaseEditPolicy,
  detectFunctionType,
  detectMcpTransport,
  detectModelProvider,
  detectTriggerType,
  detectTargetType,
  toDecorations,
  FUNCTION_TYPE_TO_YAML_KEY,
} from '@casehubio/mosaic-graph-stencil-case';
import type {
  CaseRuntimeState,
  WorkerFunctionType,
  McpTransportType,
  ModelProviderKey,
  TriggerType,
  TargetType,
} from '@casehubio/mosaic-graph-stencil-case';
import { toReactFlowGraph } from '@casehubio/graph-renderer';
import type { ElkLayoutOptions, EditPolicy, GraphEdit } from '@casehubio/graph-renderer';
import type { NodeDecoration } from '@casehubio/graph-core';
import { edgesOf } from '@casehubio/graph-core';
import { emitPagesEvent } from '@casehubio/pages-data';
import { detectDiagramType } from '@casehubio/mosaic-core';
import { stringify, parseDocument } from 'yaml';
import { DiagramBaseMixin } from '@casehubio/pages-diagram-core';
import type { AdapterResult, LayoutResult } from '@casehubio/pages-diagram-core';
import type { PropertyPaletteSource, EditorResolver, FieldRenderContext } from '@casehubio/pages-property-palette';
import '@casehubio/graph-renderer';
import './casehub-diagram-toolbar.js';

const caseEditPolicy = createCaseEditPolicy();
function caseMiniMapNodeColor(node: { type?: string }): string {
  switch (node.type) {
    case 'binding': return '#3b82f6';
    case 'worker': return '#6b7280';
    case 'milestone': return '#d97706';
    case 'goal': return '#16a34a';
    case 'subcase': return '#8b5cf6';
    case 'external': return '#94a3b8';
    default: return '#2563eb';
  }
}

function svgIcon(paths: string, color: string, size = 20) {
  return html`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${unsafeSVG(paths)}</svg>`;
}

const CASE_ICON_PATHS: Record<string, { paths: string; color: string }> = {
  link: {
    paths: '<path d="M8.5 11.5a3.5 3.5 0 005-5l-1-1a3.5 3.5 0 00-5 0"></path><path d="M11.5 8.5a3.5 3.5 0 00-5 5l1 1a3.5 3.5 0 005 0"></path>',
    color: '#3b82f6',
  },
  cpu: {
    paths: '<rect x="5" y="5" width="10" height="10" rx="1.5"></rect><path d="M8 2v3m4-3v3M8 15v3m4-3v3M2 8h3m-3 4h3M15 8h3m-3 4h3"></path>',
    color: '#6b7280',
  },
  flag: {
    paths: '<path d="M4 15V4"></path><path d="M4 4c2-1.5 4-.5 6-2s4-.5 6 1v7c-2-1.5-4-.5-6 1s-4 .5-6-1" fill="#d97706" fill-opacity="0.15"></path>',
    color: '#d97706',
  },
  target: {
    paths: '<circle cx="10" cy="10" r="7"></circle><circle cx="10" cy="10" r="3.5"></circle><circle cx="10" cy="10" r="1" fill="#16a34a" stroke="none"></circle>',
    color: '#16a34a',
  },
};

function caseIconRenderer(icon: string) {
  const def = CASE_ICON_PATHS[icon];
  if (!def) return html`<span style="width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;">${icon}</span>`;
  return svgIcon(def.paths, def.color);
}

const EMPTY_CASE_YAML = `dsl: "1.0.0"
namespace:
name:
version: "1.0.0"
spec:
  bindings: []
  workers: []
`;

@customElement('casehub-diagram')
export class CasehubDiagram extends DiagramBaseMixin(LitElement) {
  @property({ attribute: false }) runtimeState: CaseRuntimeState | null = null;

  @state() private _staleSeconds = 0;
  @state() private _paletteOpen = true;
  @state() private _paletteCompact = false;
  @state() private _propertiesOpen = true;
  private _expandedWorkers = new Set<string>();
  private _expandDebounce: ReturnType<typeof setTimeout> | null = null;
  private _cachedLayoutOpts: ElkLayoutOptions | null = null;
  protected _adaptYaml(yaml: string): AdapterResult {
    this._cachedLayoutOpts = null;
    return toGraph(yaml);
  }

  protected _applyPropertyEdit(
    yaml: string,
    nodePath: readonly (string | number)[],
    field: (string | number)[],
    value: unknown,
  ): string {
    return applyPropertyEdit(yaml, nodePath, field, value);
  }

  protected override _editPolicy(): EditPolicy {
    return caseEditPolicy;
  }

  protected override _iconRenderer() {
    return caseIconRenderer;
  }

  protected override _editorResolver(): EditorResolver {
    return (schema) => {
      const s = schema as Record<string, any>;
      const tag = s['x-editor-component'] as string | undefined;
      if (tag) return { kind: 'tag', tag };

      if (s['x-discriminator'] && s.oneOf) {
        return {
          kind: 'render',
          render: (ctx: FieldRenderContext) => this._renderDiscriminator(ctx, s),
        };
      }
      return undefined;
    };
  }

  protected override get _propertyPaletteSource(): PropertyPaletteSource | undefined {
    if (!this._selectedNodeId) return undefined;
    const isExternal = this._adapterResult?.model.nodes.find(
      n => n.id === this._selectedNodeId,
    )?.type === 'external';
    return {
      schema: this._selectedSchema as any,
      data: this._selectedData,
      readonly: this.readonly || isExternal === true,
      onChange: (field, value) => this._onPropertyChange(field, value),
    };
  }

  protected override _applyGraphEdit(yaml: string, edit: GraphEdit): string {
    switch (edit.type) {
      case 'addNode':
        return addElement(yaml, edit.nodeType as 'binding' | 'worker' | 'milestone' | 'goal');
      case 'removeNode': {
        const nodePath = this._adapterResult?.yamlPaths.get(edit.nodeId);
        if (!nodePath) throw new Error(`No YAML path for node ${edit.nodeId}`);
        return removeElement(yaml, nodePath);
      }
      case 'addEdge': {
        const source = this._adapterResult?.model.nodes.find(n => n.id === edit.sourceId);
        const target = this._adapterResult?.model.nodes.find(n => n.id === edit.targetId);
        if (!source || !target) throw new Error('Source or target node not found');
        const sourcePath = this._adapterResult?.yamlPaths.get(edit.sourceId);
        if (!sourcePath) throw new Error(`No YAML path for ${edit.sourceId}`);
        if (source.type === 'binding' && target.type === 'worker') {
          const caps = target.properties['capabilities'] as string[] | undefined;
          if (!caps || caps.length === 0) throw new Error('Target worker has no capabilities');
          return addCaseEdge(yaml, sourcePath, 'capability', caps[0]!);
        }
        throw new Error(`Cannot create edge from ${source.type} to ${target.type}`);
      }
      case 'removeEdge': {
        const parts = edit.edgeId.split('--');
        const sourceId = parts[0];
        const edgeType = parts[1];
        if (!sourceId || !edgeType) throw new Error(`Cannot parse edge ID: ${edit.edgeId}`);
        const sourcePath = this._adapterResult?.yamlPaths.get(sourceId);
        if (!sourcePath) throw new Error(`No YAML path for source node ${sourceId}`);
        if (edgeType === 'capability-dispatch') {
          return removeCaseEdge(yaml, sourcePath, 'capability');
        }
        if (edgeType === 'subcase-spawn') {
          return removeCaseEdge(yaml, sourcePath, 'subCase');
        }
        throw new Error(`Cannot delete ${edgeType} edges — they are derived from expressions`);
      }
      case 'reconnectEdge':
        throw new Error('reconnectEdge for case diagrams — not yet implemented');
      case 'splitEdge':
        throw new Error('splitEdge for case diagrams — not yet implemented');
      default:
        throw new Error(`Unsupported edit type: ${(edit as GraphEdit).type}`);
    }
  }

  protected _emptyTemplate(): string | null {
    return EMPTY_CASE_YAML;
  }

  protected override _decorations(): ReadonlyMap<string, NodeDecoration> | undefined {
    if (this._mode === 'runtime' && this.runtimeState) {
      return toDecorations(this.runtimeState);
    }
    return undefined;
  }

  private _isSequentialTopology(): boolean {
    if (!this._adapterResult) return false;
    const model = this._adapterResult.model;
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    for (const e of model.edges) {
      outDegree.set(e.source, (outDegree.get(e.source) ?? 0) + 1);
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    }
    const maxIn = Math.max(0, ...inDegree.values());
    const maxOut = Math.max(0, ...outDegree.values());
    return maxIn <= 2 && maxOut <= 3 && model.nodes.length <= 20;
  }

  protected override async _computeLayout(
    model: import('@casehubio/graph-core').GraphModel,
    options: ElkLayoutOptions,
  ): Promise<LayoutResult> {
    const { computeElkLayout } = await import('@casehubio/graph-renderer');
    return { layout: await computeElkLayout(model, options), direction: options.direction };
  }

  protected override _layoutOptions(): ElkLayoutOptions {
    if (this._cachedLayoutOpts) return this._cachedLayoutOpts;
    const nodeSizes = new Map<string, { width: number; height: number }>();
    if (this._adapterResult) {
      for (const node of this._adapterResult.model.nodes) {
        if (node.type === 'worker' && node.properties['do']) {
          const id = node.id;
          if (this._expandedWorkers.has(id.replace('worker:', ''))) {
            nodeSizes.set(id, { width: 320, height: 240 });
          } else {
            nodeSizes.set(id, { width: 280, height: 165 });
          }
        }
      }
    }
    let result: ElkLayoutOptions;
    if (this._expandedWorkers.size > 0) {
      result = { direction: 'DOWN', spacing: 60, nodeSizes, wrapping: true };
    } else {
      result = nodeSizes.size > 0
        ? { direction: 'RIGHT', spacing: 50, nodeSizes, wrapping: true }
        : { direction: 'RIGHT', spacing: 50, wrapping: true };
    }
    this._cachedLayoutOpts = result;
    return result;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    registerCaseStencils();
    this.addEventListener('worker-expand-toggle', this._handleWorkerExpand as EventListener);
  }

  override disconnectedCallback(): void {
    this.removeEventListener('worker-expand-toggle', this._handleWorkerExpand as EventListener);
    if (this._expandDebounce) clearTimeout(this._expandDebounce);
    super.disconnectedCallback();
  }

  private _handleWorkerExpand = (e: CustomEvent<{ workerId: string; expanded: boolean }>): void => {
    const { workerId, expanded } = e.detail;
    if (expanded) {
      this._expandedWorkers.add(workerId);
    } else {
      this._expandedWorkers.delete(workerId);
    }
    this._cachedLayoutOpts = null;
    if (this._expandDebounce) clearTimeout(this._expandDebounce);
    this._expandDebounce = setTimeout(() => {
      this._expandDebounce = null;
      this._fullRender(this._currentYaml);
    }, 150);
  };

  override _onChooserSelect = (e: Event): void => {
    const detail = (e as CustomEvent).detail;
    const nodeType = detail?.item?.type;
    if (!nodeType || !this._adapterResult || !this._chooserState) return;
    const { sourceNodeId } = this._chooserState;
    if (sourceNodeId) {
      const source = this._adapterResult.model.nodes.find(n => n.id === sourceNodeId);
      if (source) {
        const defaults = this._connectEndDefaults(source, nodeType);
        if (defaults) {
          this._pushUndo();
          try {
            const yaml = addElement(this._currentYaml, nodeType as any, defaults);
            this._currentYaml = yaml;
            void this._fullRender(yaml);
          } catch (err) {
            this._currentYaml = this._undoStack.pop() ?? this._currentYaml;
            this._error = `Edit failed: ${err}`;
          }
          this._chooserState = null;
          return;
        }
      }
    }
    this._handleMutation({ type: 'addNode', nodeType });
    this._chooserState = null;
  };

  private _connectEndDefaults(source: { type: string; id: string; properties: Record<string, unknown> }, targetType: string): Record<string, unknown> | null {
    const sourceName = source.properties['name'] as string | undefined;
    if (source.type === 'binding' && targetType === 'worker') {
      const cap = source.properties['capability'] as { name?: string } | string | undefined;
      const capName = typeof cap === 'object' ? cap?.name : (cap || undefined);
      if (capName) return { capabilities: [capName] };
      if (sourceName) {
        this._setBindingCapability(source.id, sourceName);
        return { capabilities: [sourceName] };
      }
    }
    if (source.type === 'worker' && targetType === 'binding') {
      const caps = source.properties['capabilities'] as string[] | undefined;
      let capName = caps?.[0];
      if (!capName && sourceName) {
        capName = sourceName;
        this._addWorkerCapability(source.id, capName);
      }
      if (capName) {
        return { capability: { name: capName } };
      }
    }
    if (source.type === 'binding' && targetType === 'milestone' && sourceName) {
      return { condition: `${sourceName}.complete` };
    }
    if (source.type === 'binding' && targetType === 'goal' && sourceName) {
      return { expression: { all: [sourceName] } };
    }
    if (source.type === 'milestone' && targetType === 'goal' && sourceName) {
      return { expression: { all: [sourceName] } };
    }
    return null;
  }

  private _addWorkerCapability(workerId: string, capabilityName: string): void {
    const path = this._adapterResult?.yamlPaths.get(workerId);
    if (!path) return;
    const doc = parseDocument(this._currentYaml);
    const existing = doc.getIn([...path, 'capabilities']);
    if (Array.isArray(existing)) {
      doc.addIn([...path, 'capabilities'], capabilityName);
    } else {
      doc.setIn([...path, 'capabilities'], [capabilityName]);
    }
    this._currentYaml = doc.toString();
  }

  private _setBindingCapability(bindingId: string, capabilityName: string): void {
    const path = this._adapterResult?.yamlPaths.get(bindingId);
    if (!path) return;
    const doc = parseDocument(this._currentYaml);
    doc.setIn([...path, 'capability'], { name: capabilityName });
    this._currentYaml = doc.toString();
  }

  override async updated(changed: Map<string, unknown>): Promise<void> {
    await super.updated(changed);
    const palette = this.querySelector('pages-diagram-palette');
    if (palette?.shadowRoot && !palette.shadowRoot.querySelector('#dock-toolbar-hide')) {
      const s = document.createElement('style');
      s.id = 'dock-toolbar-hide';
      s.textContent = '.palette-toolbar { display: none !important; }';
      palette.shadowRoot.appendChild(s);
    }
    if (changed.has('runtimeState')) {
      if (this.runtimeState === null) {
        this._mode = 'design';
        this._staleSeconds = 0;
        if (this._adapterResult) {
          const { nodes, edges } = toReactFlowGraph(this._adapterResult.model, this._lastLayout, undefined, this._layoutOptions().direction);
          this._nodes = nodes;
          this._edges = edges;
        }
      } else {
        this._updateStaleness();
        if (this._mode === 'runtime') {
          this._applyRuntimeDecorations();
        }
      }
    }
  }

  private _updateStaleness(): void {
    if (!this.runtimeState) { this._staleSeconds = 0; return; }
    const elapsed = Math.floor((Date.now() - new Date(this.runtimeState.timestamp).getTime()) / 1000);
    this._staleSeconds = Math.max(0, elapsed - 30);
  }

  private _applyRuntimeDecorations(): void {
    if (!this._adapterResult || !this.runtimeState) return;
    const decorations = toDecorations(this.runtimeState);
    const { nodes, edges } = toReactFlowGraph(this._adapterResult.model, this._lastLayout, decorations, this._layoutOptions().direction);
    this._nodes = nodes;
    this._edges = edges;
  }

  private _handleModeChange = (e: Event): void => {
    const detail = (e as CustomEvent<{ mode: 'design' | 'runtime' }>).detail;
    this._mode = detail.mode;
    if (this._mode === 'runtime' && this.runtimeState) {
      this._applyRuntimeDecorations();
    } else if (this._adapterResult) {
      const { nodes, edges } = toReactFlowGraph(this._adapterResult.model, this._lastLayout, undefined, this._layoutOptions().direction);
      this._nodes = nodes;
      this._edges = edges;
    }
  };

  // --- Discriminator rendering (closure-captured render functions) ---

  private _renderDiscriminator(
    ctx: FieldRenderContext,
    schema: Record<string, any>,
  ): TemplateResult {
    const disc = schema['x-discriminator'] as string;

    if (disc === '_type') return this._renderFunctionTypeDiscriminator(ctx, schema);
    if (disc === 'triggerType') return this._renderTriggerDiscriminator(ctx, schema);
    if (disc === '_provider') return this._renderProviderDiscriminator(ctx, schema);
    if (disc === '_transport') return this._renderTransportDiscriminator(ctx, schema);
    if (disc === '_target') return this._renderTargetDiscriminator(ctx, schema);

    return html`<span>Unknown discriminator: ${disc}</span>`;
  }

  private _renderFunctionTypeDiscriminator(
    _ctx: FieldRenderContext,
    schema: Record<string, any>,
  ): TemplateResult {
    const fnType = detectFunctionType(this._selectedData);
    const yamlKey = FUNCTION_TYPE_TO_YAML_KEY[fnType];
    const branches = schema.oneOf as Record<string, any>[];
    const activeBranch = branches.find(b =>
      b.properties?.['_type']?.const === (yamlKey ?? fnType));

    return html`
      <label style="font-size: 12px; color: var(--pages-neutral-12, #333); display: block; margin-bottom: 8px;">
        Type
        <select style="width: 100%; font-size: 12px; padding: 4px; margin-top: 2px;"
          ?disabled=${this.readonly || fnType === 'unknown'}
          @change=${(e: Event) => {
            const newType = (e.target as HTMLSelectElement).value as WorkerFunctionType;
            if (newType !== fnType) this._switchFunctionType(newType);
          }}>
          ${branches.map(b => {
            const val = b.properties?.['_type']?.const;
            return html`<option value=${val} ?selected=${b === activeBranch}>${b.title ?? val}</option>`;
          })}
        </select>
      </label>
      ${activeBranch && yamlKey ? this._renderBranchPalette(activeBranch, yamlKey) : nothing}
    `;
  }

  private _renderBranchPalette(
    branch: Record<string, any>,
    yamlKey: string,
  ): TemplateResult {
    const subData = (this._selectedData[yamlKey] ?? {}) as Record<string, unknown>;
    const subProps = { ...branch.properties };
    delete subProps['_type'];

    const nestedSource: PropertyPaletteSource = {
      schema: { type: 'object', properties: subProps } as any,
      data: subData,
      readonly: this.readonly,
      onChange: (field, value) =>
        this._onPropertyChange([yamlKey, ...field], value),
    };

    return html`
      <pages-property-palette
        .source=${nestedSource}
        .resolver=${this._editorResolver()}>
      </pages-property-palette>
    `;
  }

  private _renderTriggerDiscriminator(
    _ctx: FieldRenderContext,
    schema: Record<string, any>,
  ): TemplateResult {
    const onData = (this._selectedData['on'] ?? {}) as Record<string, unknown>;
    const triggerType = detectTriggerType(onData);
    const branches = schema.oneOf as Record<string, any>[];

    return html`
      <label style="font-size: 12px; color: var(--pages-neutral-12, #333); display: block; margin-bottom: 8px;">
        Trigger type
        <select style="width: 100%; font-size: 12px; padding: 4px; margin-top: 2px;"
          ?disabled=${this.readonly}
          @change=${(e: Event) => {
            const newType = (e.target as HTMLSelectElement).value as TriggerType;
            if (newType !== triggerType) this._switchTriggerType(newType);
          }}>
          ${branches.map(b => {
            const triggerKey = Object.keys(b.properties ?? {}).find(k => k !== 'triggerType') ?? '';
            return html`<option value=${triggerKey} ?selected=${triggerKey === triggerType}>${b.title ?? triggerKey}</option>`;
          })}
        </select>
      </label>
      ${triggerType ? this._renderTriggerBranchPalette(branches, triggerType, onData) : nothing}
    `;
  }

  private _renderTriggerBranchPalette(
    branches: Record<string, any>[],
    triggerType: TriggerType,
    onData: Record<string, unknown>,
  ): TemplateResult | typeof nothing {
    const activeBranch = branches.find(b => (b.properties ?? {})[triggerType] !== undefined);
    if (!activeBranch) return nothing;
    const triggerSchema = activeBranch.properties[triggerType];
    const triggerData = (onData[triggerType] ?? {}) as Record<string, unknown>;
    if (!triggerSchema?.properties || Object.keys(triggerSchema.properties).length === 0) return nothing;

    const nestedSource: PropertyPaletteSource = {
      schema: triggerSchema as any,
      data: triggerData,
      readonly: this.readonly,
      onChange: (field, value) =>
        this._onPropertyChange(['on', triggerType, ...field], value),
    };

    return html`
      <pages-property-palette
        .source=${nestedSource}
        .resolver=${this._editorResolver()}>
      </pages-property-palette>
    `;
  }

  private _renderProviderDiscriminator(
    ctx: FieldRenderContext,
    schema: Record<string, any>,
  ): TemplateResult {
    const modelData = (ctx.value ?? {}) as Record<string, unknown>;
    const provider = detectModelProvider(modelData);
    const branches = schema.oneOf as Record<string, any>[];
    const fnType = detectFunctionType(this._selectedData);
    const fnKey = FUNCTION_TYPE_TO_YAML_KEY[fnType];

    return html`
      <label style="font-size: 12px; color: var(--pages-neutral-12, #333); display: block; margin-bottom: 8px;">
        Provider
        <select style="width: 100%; font-size: 12px; padding: 4px; margin-top: 2px;"
          ?disabled=${this.readonly}
          @change=${(e: Event) => {
            const newProvider = (e.target as HTMLSelectElement).value as ModelProviderKey;
            if (newProvider !== provider) this._switchModelProvider(newProvider);
          }}>
          ${branches.map(b => {
            const val = b.properties?.['_provider']?.const;
            return html`<option value=${val} ?selected=${val === provider}>${b.title ?? val}</option>`;
          })}
        </select>
      </label>
      ${provider && fnKey ? (() => {
        const activeBranch = branches.find(b => b.properties?.['_provider']?.const === provider);
        if (!activeBranch) return nothing;
        const subData = (modelData[provider] ?? {}) as Record<string, unknown>;
        const subProps = { ...activeBranch.properties };
        delete subProps['_provider'];

        const nestedSource: PropertyPaletteSource = {
          schema: { type: 'object', properties: subProps } as any,
          data: subData,
          readonly: this.readonly,
          onChange: (field, value) =>
            this._onPropertyChange([fnKey, 'model', provider, ...field], value),
        };

        return html`
          <pages-property-palette
            .source=${nestedSource}
            .resolver=${this._editorResolver()}>
          </pages-property-palette>
        `;
      })() : nothing}
    `;
  }

  private _renderTransportDiscriminator(
    _ctx: FieldRenderContext,
    schema: Record<string, any>,
  ): TemplateResult {
    const mcpData = (this._selectedData['mcp'] ?? {}) as Record<string, unknown>;
    const transport = detectMcpTransport(mcpData);
    const branches = schema.oneOf as Record<string, any>[];

    return html`
      <label style="font-size: 12px; color: var(--pages-neutral-12, #333); display: block; margin-bottom: 8px;">
        Transport
        <select style="width: 100%; font-size: 12px; padding: 4px; margin-top: 2px;"
          ?disabled=${this.readonly}
          @change=${(e: Event) => {
            const newTransport = (e.target as HTMLSelectElement).value as McpTransportType;
            if (newTransport !== transport) this._switchMcpTransport(newTransport);
          }}>
          ${branches.map(b => {
            const val = b.properties?.['_transport']?.const;
            return html`<option value=${val} ?selected=${val === transport}>${b.title ?? val}</option>`;
          })}
        </select>
      </label>
      ${transport ? (() => {
        const activeBranch = branches.find(b => b.properties?.['_transport']?.const === transport);
        if (!activeBranch) return nothing;
        const subProps = { ...activeBranch.properties };
        delete subProps['_transport'];

        const subData: Record<string, unknown> = {};
        for (const key of Object.keys(subProps)) {
          if (mcpData[key] !== undefined) subData[key] = mcpData[key];
        }

        const nestedSource: PropertyPaletteSource = {
          schema: { type: 'object', properties: subProps } as any,
          data: subData,
          readonly: this.readonly,
          onChange: (field, value) =>
            this._onPropertyChange(['mcp', ...field], value),
        };

        return html`
          <pages-property-palette
            .source=${nestedSource}
            .resolver=${this._editorResolver()}>
          </pages-property-palette>
        `;
      })() : nothing}
    `;
  }

  // --- Target type discriminator ---

  private _renderTargetDiscriminator(
    _ctx: FieldRenderContext,
    schema: Record<string, any>,
  ): TemplateResult {
    const targetType = detectTargetType(this._selectedData);
    const branches = schema.oneOf as Record<string, any>[];
    const activeBranch = branches.find(b => b.properties?.['_target']?.const === targetType);

    return html`
      <label style="font-size: 12px; color: var(--pages-neutral-12, #333); display: block; margin-bottom: 8px;">
        Target type
        <select style="width: 100%; font-size: 12px; padding: 4px; margin-top: 2px;"
          ?disabled=${this.readonly}
          @change=${(e: Event) => {
            const newTarget = (e.target as HTMLSelectElement).value as TargetType;
            if (newTarget !== targetType) this._switchBindingTarget(newTarget);
          }}>
          ${branches.map(b => {
            const val = b.properties?.['_target']?.const;
            return html`<option value=${val} ?selected=${val === targetType}>${b.title ?? val}</option>`;
          })}
        </select>
      </label>
      ${activeBranch ? this._renderTargetBranchPalette(activeBranch, targetType) : nothing}
    `;
  }

  private _renderTargetBranchPalette(
    branch: Record<string, any>,
    targetType: TargetType,
  ): TemplateResult {
    const subProps = { ...branch.properties };
    delete subProps['_target'];

    let subData: Record<string, unknown>;
    let onChange: (field: (string | number)[], value: unknown) => void;

    if (targetType === 'capability') {
      const raw = this._selectedData['capability'];
      subData = { capability: typeof raw === 'string' ? { name: raw } : (raw ?? {}) };
      onChange = (field, value) => {
        if (field[0] === 'capability' && field[1] === 'name') {
          this._onPropertyChange(['capability'], value);
        } else {
          this._onPropertyChange(field, value);
        }
      };
    } else {
      subData = { [targetType]: (this._selectedData[targetType] ?? {}) as Record<string, unknown> };
      onChange = (field, value) => this._onPropertyChange(field, value);
    }

    const nestedSource: PropertyPaletteSource = {
      schema: { type: 'object', properties: subProps } as any,
      data: subData,
      readonly: this.readonly,
      onChange,
    };

    return html`
      <pages-property-palette
        .source=${nestedSource}
        .resolver=${this._editorResolver()}>
      </pages-property-palette>
    `;
  }

  // --- CST-preserving switch helpers ---

  private async _switchFunctionType(newType: WorkerFunctionType): Promise<void> {
    if (!this._selectedNodeId || !this._adapterResult) return;
    const nodePath = this._adapterResult.yamlPaths.get(this._selectedNodeId);
    if (!nodePath) return;
    this._pushUndo();
    this._currentYaml = switchFunctionType(this._currentYaml, nodePath, newType);
    await this._fullRender(this._currentYaml);
    this._updateSelectedNode();
  }

  private async _switchBindingTarget(targetType: 'capability' | 'subCase' | 'humanTask'): Promise<void> {
    if (!this._selectedNodeId || !this._adapterResult) return;
    const nodePath = this._adapterResult.yamlPaths.get(this._selectedNodeId);
    if (!nodePath) return;
    this._pushUndo();
    this._currentYaml = switchBindingTarget(this._currentYaml, nodePath, targetType);
    await this._fullRender(this._currentYaml);
    this._updateSelectedNode();
  }

  private async _switchTriggerType(newType: TriggerType): Promise<void> {
    if (!this._selectedNodeId || !this._adapterResult) return;
    const nodePath = this._adapterResult.yamlPaths.get(this._selectedNodeId);
    if (!nodePath) return;
    this._pushUndo();
    this._currentYaml = switchTriggerType(this._currentYaml, nodePath, newType);
    await this._fullRender(this._currentYaml);
    this._updateSelectedNode();
  }

  private async _switchMcpTransport(transport: McpTransportType): Promise<void> {
    if (!this._selectedNodeId || !this._adapterResult) return;
    const nodePath = this._adapterResult.yamlPaths.get(this._selectedNodeId);
    if (!nodePath) return;
    this._pushUndo();
    this._currentYaml = switchMcpTransport(this._currentYaml, nodePath, transport);
    await this._fullRender(this._currentYaml);
    this._updateSelectedNode();
  }

  private async _switchModelProvider(provider: ModelProviderKey): Promise<void> {
    if (!this._selectedNodeId || !this._adapterResult) return;
    const nodePath = this._adapterResult.yamlPaths.get(this._selectedNodeId);
    if (!nodePath) return;
    this._pushUndo();
    this._currentYaml = switchModelProvider(this._currentYaml, nodePath, provider);
    await this._fullRender(this._currentYaml);
    this._updateSelectedNode();
  }

  // --- Drill-down resolution ---

  private async _handleDrillDown(payload: {
    nodeId: string;
    nodeName: string;
    definitionRef?: string;
    doBlock?: unknown;
  }): Promise<void> {
    const { nodeName, definitionRef, doBlock } = payload;

    let yaml: string;
    let diagramType: string;

    if (definitionRef?.startsWith('#')) {
      const defName = definitionRef.slice(1);
      const defs = (this._adapterResult as any)?.definitions as
        Record<string, unknown> | undefined;
      const fragment = defs?.[defName];
      if (!fragment) {
        this._error = `Definition '${defName}' not found`;
        return;
      }
      yaml = stringify(fragment);
      diagramType = detectDiagramType(yaml);
    } else if (definitionRef) {
      try {
        yaml = await this._fetchDefinition(definitionRef);
        diagramType = detectDiagramType(yaml);
      } catch (e) {
        this._error = `Failed to load ${definitionRef}: ${e}`;
        return;
      }
    } else if (doBlock) {
      yaml = stringify({
        document: { dsl: '1.0.0', namespace: 'embedded', name: 'worker-do', version: '1.0.0' },
        do: doBlock,
      });
      diagramType = 'swf';
    } else {
      return;
    }

    emitPagesEvent(this, 'diagram:drill-down:resolved', {
      name: nodeName,
      yaml,
      diagramType,
    });
  }

  private async _fetchDefinition(path: string): Promise<string> {
    const base = this.src
      ? new URL(this.src, window.location.href)
      : new URL(window.location.href);
    const url = new URL(path, base);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.text();
  }

  private _hasDecomposition(): boolean {
    return this._currentYaml.includes('decomposition:');
  }

  private _drillToDecomposition(): void {
    emitPagesEvent(this, 'diagram:drill-down:resolved', {
      name: 'HTN Decomposition',
      yaml: this._currentYaml,
      diagramType: 'htn',
    });
  }

  private _handlePropertyDrillDown(): void {
    if (!this._selectedNodeId || !this._adapterResult) return;
    const node = this._adapterResult.model.nodes.find(n => n.id === this._selectedNodeId);
    if (!node) return;
    const props = node.properties;
    const payload: { nodeId: string; nodeName: string; definitionRef?: string; doBlock?: unknown } = {
      nodeId: node.id,
      nodeName: String(props['name'] ?? ''),
    };
    const ref = props['definitionRef'] as string | undefined;
    if (ref !== undefined) payload.definitionRef = ref;
    const doBlock = props['do'];
    if (doBlock !== undefined) payload.doBlock = doBlock;
    this._handleDrillDown(payload);
  }

  // --- Public API ---

  getNodeProperties(nodeId: string): Record<string, unknown> | undefined {
    const node = this._adapterResult?.model.nodes.find(n => n.id === nodeId);
    return node ? { ...node.properties } : undefined;
  }

  protected async _onDelete(): Promise<void> {
    if (!this._selectedNodeId || !this._adapterResult) return;
    if (this._confirmMessage) return;
    const node = this._adapterResult.model.nodes.find(n => n.id === this._selectedNodeId);
    if (!node || node.type === 'external') return;
    const nodePath = this._adapterResult.yamlPaths.get(this._selectedNodeId);
    if (!nodePath) return;

    const edges = edgesOf(this._adapterResult.model, this._selectedNodeId);
    if (edges.length > 0) {
      const name = String(node.properties['name'] ?? this._selectedNodeId);
      const confirmed = await this._confirmDeleteDialog(node.type, name, edges.length);
      if (!confirmed) return;
    }

    try {
      this._pushUndo();
      this._currentYaml = removeElement(this._currentYaml, nodePath);
      this._selectedNodeId = '';
      this._selectedData = {};
      this._selectedSchema = {};
      await this._fullRender(this._currentYaml);
    } catch (e) {
      this._error = `Delete failed: ${e}`;
    }
  }

  private _confirmDeleteDialog(type: string, name: string, edgeCount: number): Promise<boolean> {
    return new Promise(resolve => {
      this._pendingConfirm = resolve;
      this._confirmMessage = type === 'worker'
        ? `Worker '${name}' has ${edgeCount} binding(s) dispatching to its capabilities. Those bindings will reference external capabilities after removal.`
        : `Remove ${type} '${name}'? It has ${edgeCount} connection(s).`;
      this.requestUpdate();
    });
  }

  override _handleCanvasEvent = (e: CustomEvent): void => {
    const topic = e.detail?.topic;
    if (topic === 'graph:node:click') this._handleNodeClick(e);
    else if (topic === 'graph:selection:change') this._handleSelectionChange(e);
    else if (topic === 'graph:pane:click') this._showPickerAtPaneClick();
    else if (topic === 'graph:connect:end-on-empty') this._showPickerAtConnectEnd(e.detail?.payload);
    else if (topic === 'diagram:drill-down') this._handleDrillDown(e.detail?.payload);
  };

  private _renderDockHeader(title: string, side: 'left' | 'right') {
    const close = () => {
      if (side === 'left') this._paletteOpen = !this._paletteOpen;
      else this._propertiesOpen = !this._propertiesOpen;
    };
    const isPaletteCompact = side === 'left' && this._paletteCompact;
    const toggleCompact = side === 'left' ? () => {
      this._paletteCompact = !this._paletteCompact;
      const palette = this.querySelector('pages-diagram-palette') as any;
      if (palette) { palette._mode = this._paletteCompact ? 'compact' : 'standard'; palette.requestUpdate(); }
    } : undefined;
    return html`
      <div style="display:flex; align-items:center; justify-content:${isPaletteCompact ? 'center' : 'space-between'}; padding:3px 6px; border-bottom:1px solid var(--pages-neutral-4,#e5e7eb); background:var(--pages-neutral-2,#f8f9fa); gap:4px;">
        ${isPaletteCompact ? nothing : html`<span style="font-size:11px; font-weight:600; color:var(--pages-neutral-11,#374151); text-transform:uppercase; letter-spacing:0.5px;">${title}</span>`}
        <div style="display:flex; gap:2px;">
          ${toggleCompact ? html`
            <button @click=${toggleCompact}
              style="border:none; background:none; cursor:pointer; font-size:12px; color:var(--pages-neutral-9,#6b7280); padding:0 2px; line-height:1;"
              aria-label="Toggle compact view" title="Toggle compact">⊞</button>
          ` : nothing}
          <button @click=${close}
            style="border:none; background:none; cursor:pointer; font-size:13px; color:var(--pages-neutral-9,#6b7280); padding:0 2px; line-height:1;"
            aria-label=${`Close ${title} panel`}
            title="Close">&times;</button>
        </div>
      </div>`;
  }

  private _renderCollapsedDock(title: string, icon: string, side: 'left' | 'right') {
    const toggle = () => {
      if (side === 'left') this._paletteOpen = true;
      else this._propertiesOpen = true;
    };
    return html`
      <div style="width:28px; display:flex; flex-direction:column; align-items:center; border-${side === 'left' ? 'right' : 'left'}:1px solid var(--pages-neutral-4,#e5e7eb); background:var(--pages-neutral-2,#f8f9fa); padding-top:8px;">
        <button @click=${toggle}
          style="border:none; background:none; cursor:pointer; padding:4px; color:var(--pages-neutral-9,#6b7280); font-size:14px; writing-mode:vertical-rl; text-orientation:mixed; letter-spacing:1px;"
          aria-label=${`Open ${title} panel`}
          title=${title}>${icon} ${title}</button>
      </div>`;
  }

  override render() {
    if (this._error) {
      return this._renderError();
    }
    const hasSelection = this._selectedNodeId !== '';

    return html`
      <div style="display: flex; flex-direction: column; width: 100%; height: 100%;">
        <casehub-diagram-toolbar
          ?hasBackend=${this.backend != null}
          ?hasNodes=${this._nodes.length > 0}
          ?dirty=${this._isDirty}
          ?saving=${this._saving}
          ?runtimeAvailable=${this.runtimeState !== null}
          .mode=${this._mode}
          .staleSeconds=${this._staleSeconds}
          @toolbar-save=${() => this._save()}
          @toolbar-mode-change=${this._handleModeChange}
          @toolbar-export=${(e: CustomEvent<{ format: 'svg' | 'png' }>) => this._exportDiagram(e.detail.format)}
        ></casehub-diagram-toolbar>
        ${this._hasDecomposition() ? html`
          <div style="padding: 4px 8px; border-bottom: 1px solid var(--pages-neutral-4,#e5e7eb); display: flex; gap: 8px;">
            <button style="font-size: 12px; padding: 3px 10px; border: 1px solid var(--pages-accent-9,#5470c6); border-radius: 4px; background: transparent; color: var(--pages-accent-9,#5470c6); cursor: pointer;"
              @click=${() => this._drillToDecomposition()}>🔀 View HTN Decomposition</button>
          </div>
        ` : nothing}
        <div style="display: flex; flex: 1; overflow: hidden;">
          ${this._paletteOpen ? html`
            <div style="border-right:1px solid var(--pages-neutral-4,#e5e7eb); display:flex; flex-direction:column; overflow-y:auto; flex-shrink:0;">
              ${this._renderDockHeader('Stencils', 'left')}
              <div style="padding:2px 4px;">
                ${this._renderStencilPalette()}
              </div>
            </div>
          ` : this._renderCollapsedDock('Stencils', '⊞', 'left')}
          <div style="flex:1;height:100%;min-width:0;position:relative;" @pointerdown=${this._onCanvasPointerDown}>
            <pages-graph-canvas
              .nodes=${this._nodes}
              .edges=${this._edges}
              .model=${this._adapterResult?.model}
              .editPolicy=${this._editPolicy()}
              .onMutation=${this._handleMutation}
              .miniMapNodeColor=${caseMiniMapNodeColor}
  
              role="img"
              aria-label="Case definition diagram"
              style="width:100%;height:100%;"
              @pages-event=${this._handleCanvasEvent}
            ></pages-graph-canvas>
            ${this._renderNodePicker()}
          </div>
          ${this._propertiesOpen ? html`
            <div style="width:300px; border-left:1px solid var(--pages-neutral-4,#e5e7eb); display:flex; flex-direction:column; overflow-y:auto; flex-shrink:0;">
              ${this._renderDockHeader('Properties', 'right')}
              ${hasSelection ? html`
                <div style="padding:8px;" @pages-event=${(e: CustomEvent) => {
                  if (e.detail?.topic === 'diagram:property-drill-down') this._handlePropertyDrillDown();
                }}>
                  ${this._renderPropertyPanel()}
                </div>
              ` : html`
                <div style="padding:12px; color:var(--pages-neutral-8,#9ca3af); font-size:12px; font-style:italic;">
                  Click a node to view its properties
                </div>
              `}
            </div>
          ` : this._renderCollapsedDock('Properties', '☰', 'right')}
        </div>
        ${this._renderDialogs()}
      </div>
    `;
  }

}
