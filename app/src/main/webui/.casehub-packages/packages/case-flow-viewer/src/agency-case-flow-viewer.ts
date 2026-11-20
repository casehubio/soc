import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { DiagramBaseMixin } from '@casehubio/pages-diagram-core';
import type { AdapterResult } from '@casehubio/pages-diagram-core';
import { toGraph } from '@casehubio/mosaic-graph-stencil-case';
import { toDecorations } from '@casehubio/mosaic-graph-stencil-case';
import { registerCaseStencils } from '@casehubio/mosaic-graph-stencil-case';
import type { CaseRuntimeState } from '@casehubio/mosaic-graph-stencil-case';
import type { NodeDecoration } from '@casehubio/graph-core';
import { emitPagesEvent } from '@casehubio/pages-data';
import { toReactFlowGraph } from '@casehubio/graph-renderer';
import type { ElkLayoutOptions } from '@casehubio/graph-renderer';
import '@casehubio/graph-renderer';
import './agency-case-flow-toolbar.js';

export interface CaseFlowViewerProps {
  runtimeState: CaseRuntimeState | null;
  selectionTopic: string;
}

@customElement('agency-case-flow-viewer')
export class AgencyCaseFlowViewer extends DiagramBaseMixin(LitElement) {
  @property({ attribute: false }) runtimeState: CaseRuntimeState | null = null;
  @property({ attribute: 'selection-topic' }) selectionTopic = '';

  override connectedCallback(): void {
    super.connectedCallback();
    this.readonly = true;
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Case flow viewer');
    registerCaseStencils();
  }

  override async updated(changed: Map<PropertyKey, unknown>): Promise<void> {
    await super.updated(changed);
    if (changed.has('runtimeState')) {
      this._applyRuntimeDecorations();
    }
  }

  private _applyRuntimeDecorations(): void {
    if (!this._adapterResult || !this._lastLayout) return;
    const decorations = this._decorations();
    const { nodes, edges } = toReactFlowGraph(
      this._adapterResult.model, this._lastLayout, decorations, this._layoutOptions().direction,
    );
    this._nodes = nodes;
    this._edges = edges;
  }

  protected _adaptYaml(yaml: string): AdapterResult {
    return toGraph(yaml);
  }

  protected _applyPropertyEdit(): string {
    throw new Error('AgencyCaseFlowViewer is read-only');
  }

  protected _emptyTemplate(): string | null {
    return null;
  }

  protected override _decorations(): ReadonlyMap<string, NodeDecoration> | undefined {
    if (this.runtimeState) {
      return toDecorations(this.runtimeState);
    }
    return undefined;
  }

  protected override _layoutOptions(): ElkLayoutOptions {
    const base = super._layoutOptions();
    if (!this.runtimeState?.parallelGroups || this.runtimeState.parallelGroups.length === 0) {
      return base;
    }
    const partitions = new Map<string, number>();
    for (let i = 0; i < this.runtimeState.parallelGroups.length; i++) {
      for (const bindingName of this.runtimeState.parallelGroups[i]!) {
        partitions.set(`binding:${bindingName}`, i);
      }
    }
    return { ...base, partitions } as ElkLayoutOptions & { partitions: Map<string, number> };
  }

  private _computeStats() {
    if (!this.runtimeState || !this._adapterResult) {
      return { nodeCount: 0, completed: 0, running: 0, failed: 0 };
    }
    const items = this.runtimeState.planItems;
    return {
      nodeCount: this._adapterResult.model.nodes.length,
      completed: items.filter(i => i.status === 'COMPLETED').length,
      running: items.filter(i => i.status === 'RUNNING').length,
      failed: items.filter(i => i.status === 'FAULTED').length,
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

  override render() {
    const stats = this._computeStats();
    return html`
      <style>
        :host { display: flex; flex-direction: column; height: 100%; }
        .canvas-area { flex: 1; position: relative; }
        .empty { display: flex; align-items: center; justify-content: center;
          height: 100%; color: var(--pages-text-tertiary, #999); font-style: italic; }
      </style>
      <agency-case-flow-toolbar
        .nodeCount=${stats.nodeCount}
        .completedCount=${stats.completed}
        .runningCount=${stats.running}
        .failedCount=${stats.failed}
        .caseStatus=${this.runtimeState?.caseStatus ?? null}
        .resultTimestamp=${this.runtimeState?.timestamp ?? null}
        @export-svg=${() => this._exportDiagram('svg')}
        @export-png=${() => this._exportDiagram('png')}
      ></agency-case-flow-toolbar>
      <div class="canvas-area" role="img" aria-label="Case flow diagram">
        ${this._error
          ? this._renderError()
          : this._adapterResult == null
            ? html`<div class="empty">No case definition loaded</div>`
            : html`<pages-graph-canvas
                .nodes=${this._nodes}
                .edges=${this._edges}
                style="width: 100%; height: 100%;"
                @pages-event=${(e: CustomEvent) => {
                  if (e.detail?.topic === 'graph:node:click') {
                    const nodeId = e.detail.payload?.nodeId as string | undefined;
                    if (nodeId) this._onNodeClick(nodeId);
                  }
                }}
              ></pages-graph-canvas>`}
      </div>
    `;
  }
}
