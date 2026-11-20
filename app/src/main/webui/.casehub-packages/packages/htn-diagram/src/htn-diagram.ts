import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { stringify } from 'yaml';
import { htnYamlToGraph, registerHtnStencils } from '@casehubio/mosaic-graph-stencil-htn';
import { DiagramBaseMixin } from '@casehubio/pages-diagram-core';
import type { AdapterResult } from '@casehubio/pages-diagram-core';
import { emitPagesEvent } from '@casehubio/pages-data';
import { detectDiagramType } from '@casehubio/mosaic-core';
import '@casehubio/graph-renderer';

@customElement('htn-diagram')
export class HtnDiagram extends DiagramBaseMixin(LitElement) {
  @property({ attribute: 'layout-direction' })
  layoutDirection: 'DOWN' | 'RIGHT' = 'DOWN';

  override connectedCallback(): void {
    super.connectedCallback();
    this.style.display = 'block';
    this.style.width = '100%';
    this.style.height = '100%';
    registerHtnStencils();
  }

  protected _adaptYaml(yaml: string): AdapterResult {
    return htnYamlToGraph(yaml);
  }

  protected _applyPropertyEdit(
    yaml: string,
    _nodePath: readonly (string | number)[],
    _field: (string | number)[],
    _value: unknown,
  ): string {
    return yaml;
  }

  protected override _layoutOptions() {
    return { direction: this.layoutDirection, spacing: 60 };
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
      const defName = definitionRef.slice(1);
      const defs = (this._adapterResult as any)?.definitions as Record<string, unknown> | undefined;
      const fragment = defs?.[defName];
      if (!fragment) { this._error = `Definition '${defName}' not found`; return; }
      yaml = stringify(fragment);
      diagramType = detectDiagramType(yaml);
    } else {
      try {
        const base = this.src ? new URL(this.src, window.location.href) : new URL(window.location.href);
        const url = new URL(definitionRef, base);
        const res = await fetch(url.toString());
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
    return !!(node?.properties['definitionRef'] || node?.properties['do']);
  }

  private _handlePropertyDrillDown(): void {
    if (!this._selectedNodeId || !this._adapterResult) return;
    const node = this._adapterResult.model.nodes.find(n => n.id === this._selectedNodeId);
    if (!node) return;
    const payload: { nodeId: string; nodeName: string; definitionRef?: string } = {
      nodeId: node.id,
      nodeName: String(node.properties['name'] ?? ''),
    };
    const ref = node.properties['definitionRef'] as string | undefined;
    if (ref !== undefined) payload.definitionRef = ref;
    this._handleDrillDown(payload);
  }

  override render() {
    if (this._error) return this._renderError();
    return html`
      <div style="display: flex; height: 100%; overflow: hidden;">
        <pages-graph-canvas
          .nodes=${this._nodes}
          .edges=${this._edges}
          role="img"
          aria-label="HTN decomposition diagram"
          style="flex: 1; height: 100%; min-width: 0;"
          @pages-event=${(e: CustomEvent) => {
            const topic = e.detail?.topic as string | undefined;
            if (topic === 'graph:node:click') this._handleNodeClick(e);
            if (topic === 'graph:selection:change') this._handleSelectionChange(e);
            if (topic === 'diagram:drill-down') this._handleDrillDown(e.detail?.payload);
          }}
        ></pages-graph-canvas>
        ${this._selectedNodeId ? html`
          <div style="width:280px; border-left:1px solid var(--pages-neutral-4,#e5e7eb); overflow-y:auto; padding:8px;">
            ${this._renderPropertyPanel()}
            ${this._selectedHasDefinition() ? html`
              <div style="padding: 8px 0; border-top: 1px solid var(--pages-neutral-4,#e5e7eb); margin-top: 8px;">
                <a style="font-size: 13px; color: var(--pages-accent-9, #2563eb); cursor: pointer; text-decoration: none;"
                  @click=${() => this._handlePropertyDrillDown()}>Drill down ⤢</a>
              </div>
            ` : nothing}
          </div>
        ` : nothing}
      </div>
      ${this._showConflict ? this._renderConflictDialog() : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'htn-diagram': HtnDiagram;
  }
}
