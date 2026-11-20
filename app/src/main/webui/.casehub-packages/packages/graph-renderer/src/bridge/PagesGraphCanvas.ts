import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { GraphCanvasProps, DataComponentCommon } from '@casehubio/pages-component';
import { DataSourceController } from '@casehubio/pages-component';
import type { DataSetLookup, TypedDataSet } from '@casehubio/pages-data';
import type { GraphModel, GraphNode, GraphEdge } from '@casehubio/graph-core';
import type { EditPolicy, GraphEdit } from '../editing/types.js';
import type { ElkLayoutOptions } from '../layout/elk-layout.js';
import type { ReactFlowAppProps } from './ReactFlowApp.js';
import type { Node, Edge } from '@xyflow/react';
import './GraphCanvas.js';

type VizProps = GraphCanvasProps & DataComponentCommon;

interface DataRequestDetail {
  readonly element: PagesGraphCanvas;
  readonly lookup: DataSetLookup;
}

const ALGORITHM_MAP: Record<string, string> = {
  tree: 'mrtree',
  layered: 'layered',
  radial: 'radial',
  force: 'force',
  stress: 'stress',
};

@customElement('pages-graph-canvas')
export class PagesGraphCanvas extends LitElement {
  readonly controller = new DataSourceController({
    onChange: () => { this.requestUpdate(); },
    onRefresh: () => {
      this._dataRequested = false;
      this._requestDataIfNeeded();
    },
  });

  @property({ attribute: false }) props: VizProps | undefined;

  @property({ attribute: false }) nodes: Node[] | undefined;
  @property({ attribute: false }) edges: Edge[] | undefined;
  @property({ attribute: false }) model: GraphModel | undefined;
  @property({ attribute: false }) editPolicy: EditPolicy | undefined;
  @property({ attribute: false }) onMutation: ((edit: GraphEdit) => void) | undefined;
  @property({ attribute: false }) miniMapNodeColor: ReactFlowAppProps['miniMapNodeColor'];
  @property({ attribute: false }) connectionsEnabled: boolean | undefined;

  private _dataRequested = false;
  private _prevProps: VizProps | undefined;

  get dataSet(): TypedDataSet | undefined { return this.controller.dataSet; }
  set dataSet(value: TypedDataSet | undefined) { this.controller.dataSet = value; }

  get loading(): boolean { return this.controller.loading; }
  set loading(v: boolean) { this.controller.loading = v; }

  get error(): string { return this.controller.error; }
  set error(value: string) { this.controller.error = value; }

  override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._dataRequested = false;
    this._requestDataIfNeeded();
  }

  override willUpdate(): void {
    if (this.props !== this._prevProps) {
      const oldLookup = this._prevProps?.lookup;
      this._prevProps = this.props;
      if (this.props?.lookup !== oldLookup) {
        this._dataRequested = false;
        this.controller.dataSet = undefined;
      }
      if (this.props?.height) this.style.height = this.props.height;
      if (this.props?.width) this.style.width = this.props.width;
      this.style.display = 'block';
      this._requestDataIfNeeded();
    }
  }

  private _requestDataIfNeeded(): void {
    if (!this.isConnected || this._dataRequested) return;
    const lookup = this.props?.lookup;
    if (!lookup) return;
    this._dataRequested = true;
    this.dispatchEvent(
      new CustomEvent<DataRequestDetail>('pages-data-request', {
        bubbles: true, composed: true,
        detail: { element: this, lookup },
      }),
    );
  }

  buildLayoutOptions(): ElkLayoutOptions | undefined {
    if (!this.props) return undefined;
    const opts: ElkLayoutOptions = {};
    if (this.props.direction) opts.direction = this.props.direction;
    if (this.props.spacing !== undefined) opts.spacing = this.props.spacing;
    if (this.props.algorithm) {
      const mapped = ALGORITHM_MAP[this.props.algorithm] ?? this.props.algorithm;
      opts.algorithm = mapped as 'layered' | 'mrtree' | 'radial' | 'force' | 'stress';
    }
    if (this.props.containerPadding !== undefined) opts.containerPadding = this.props.containerPadding;
    if (this.props.elk) {
      if (this.props.elk.wrapping !== undefined) opts.wrapping = this.props.elk.wrapping;
      if (this.props.elk.headerHeight !== undefined) opts.headerHeight = this.props.elk.headerHeight;
      if (this.props.elk.elkOptions) opts.elkOptions = this.props.elk.elkOptions;
    }
    return Object.keys(opts).length > 0 ? opts : undefined;
  }

  private buildModel(): GraphModel | undefined {
    if (!this.props || !this.dataSet) return undefined;
    const ds = this.dataSet;
    const srcCol = this.props.sourceColumn;
    const tgtCol = this.props.targetColumn;
    const sourceIdx = srcCol
      ? ds.columns.findIndex((c) => c.id === (srcCol as string))
      : 0;
    const targetIdx = tgtCol
      ? ds.columns.findIndex((c) => c.id === (tgtCol as string))
      : 1;
    if (sourceIdx < 0 || targetIdx < 0) return undefined;

    const sourceCol = ds.columns[sourceIdx];
    const targetCol = ds.columns[targetIdx];
    if (!sourceCol || !targetCol) return undefined;
    const sourceColId = sourceCol.id;
    const targetColId = targetCol.id;
    const nodeMap = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];

    for (const row of ds.rows) {
      const src = row.text(sourceColId);
      const tgt = row.text(targetColId);
      if (!src || !tgt) continue;

      if (!nodeMap.has(src))
        nodeMap.set(src, { id: src, type: 'default', properties: { label: src } });
      if (!nodeMap.has(tgt))
        nodeMap.set(tgt, { id: tgt, type: 'default', properties: { label: tgt } });

      edges.push({
        id: `${src}->${tgt}`,
        source: src,
        target: tgt,
        type: this.props.directed ? 'directed' : 'default',
      });
    }

    return { nodes: [...nodeMap.values()], edges };
  }

  override render(): TemplateResult {
    if (this.controller.error) {
      return html`<div style="padding:12px;color:var(--pages-danger-9,red)">${this.controller.error}</div>`;
    }
    if (this.nodes) {
      return html`
        <graph-canvas-core
          .nodes=${this.nodes}
          .edges=${this.edges}
          .model=${this.model}
          .editPolicy=${this.editPolicy}
          .onMutation=${this.onMutation}
          .miniMapNodeColor=${this.miniMapNodeColor}
          .connectionsEnabled=${this.connectionsEnabled ?? false}
        ></graph-canvas-core>
      `;
    }
    if (!this.props || this.controller.loading || !this.dataSet) {
      return html`<div style="padding:12px;opacity:0.5">Loading…</div>`;
    }
    const model = this.buildModel();
    const layoutOptions = this.buildLayoutOptions();

    return html`
      <graph-canvas-core
        .model=${model}
        .layoutOptions=${layoutOptions}
        .connectionsEnabled=${this.props?.connectionsEnabled ?? false}
      ></graph-canvas-core>
    `;
  }
}
