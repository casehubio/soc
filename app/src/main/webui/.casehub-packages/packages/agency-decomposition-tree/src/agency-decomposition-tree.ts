import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { TemplateResult } from 'lit';
import '@casehubio/pages-ui-components';
import type {
  DecompositionSnapshot, TaskNodeSnapshot, LeafTaskSnapshot,
  CompoundTaskSnapshot, DecompositionMethodSnapshot, NodeStateSnapshot,
} from '@casehubio/mosaic-graph-stencil-htn';
import { emitPagesEvent } from '@casehubio/pages-data';

export const STRATEGY_COLORS: Record<string, string> = {
  'identity': '#9ca3af',
  'static': '#3b82f6',
  'forward-reasoning': '#14b8a6',
  'llm': '#a855f7',
  'hybrid': '#6366f1',
  'heuristic': '#f59e0b',
  'goal-oriented': '#22c55e',
  'htn': '#06b6d4',
  '_unknown': '#9ca3af',
};

export interface DecompositionTreeProps {
  decomposition: DecompositionSnapshot | null;
  selectionTopic: string;
}

@customElement('agency-decomposition-tree')
export class AgencyDecompositionTree extends LitElement {
  @property({ type: Object }) decomposition: DecompositionSnapshot | null = null;
  @property({ type: Object }) nodeStates?: Record<string, NodeStateSnapshot>;
  @property({ type: Object }) renderLeaf?: (node: LeafTaskSnapshot) => TemplateResult;
  @property({ type: Object }) renderMethod?: (method: DecompositionMethodSnapshot) => TemplateResult;
  @property({ attribute: 'selection-topic' }) selectionTopic = 'dag-node';

  @state() private _expanded = new Set<string>();

  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, sans-serif); font-size: 13px; }
    .empty { color: var(--pages-text-tertiary, #999); font-style: italic; padding: 12px; }
    ul { list-style: none; padding-left: 20px; margin: 0; }
    ul[role="tree"] { padding-left: 0; }
    li { padding: 2px 0; }
    .node { display: flex; align-items: center; gap: 6px; padding: 4px 8px;
      border-radius: 4px; cursor: pointer; }
    .node:hover { background: var(--pages-hover-color, #f3f4f6); }
    .node:focus { outline: 2px solid var(--pages-accent-color, #1a73e8); outline-offset: -2px; }
    .compound-name { font-weight: 600; color: var(--pages-text-color, #333); }
    .toggle { width: 16px; text-align: center; font-size: 11px; color: var(--pages-text-secondary, #666); }
    .strategy-badge { padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; color: #fff; }
    .guard { font-style: italic; color: var(--pages-text-tertiary, #999); font-size: 12px;
      max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .leaf-marker { color: var(--pages-accent-color, #1a73e8); }
    .executor-pill { background: var(--pages-accent-subtle, #e8f0fe); color: var(--pages-accent-color, #1a73e8);
      padding: 1px 6px; border-radius: 4px; font-size: 11px; }
    .method-count { font-size: 11px; color: var(--pages-text-tertiary, #999); }
`;

  private _toggle(id: string): void {
    const next = new Set(this._expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    this._expanded = next;
  }

  private _selectLeaf(leaf: LeafTaskSnapshot): void {
    emitPagesEvent(this, this.selectionTopic, { taskId: leaf.id });
  }

  private _renderNode(node: TaskNodeSnapshot, depth: number): TemplateResult {
    if (node.kind === 'leaf') return this._renderLeafNode(node);
    return this._renderCompoundNode(node, depth);
  }

  private _renderLeafNode(leaf: LeafTaskSnapshot): TemplateResult {
    if (this.renderLeaf) return html`<li role="treeitem">${this.renderLeaf(leaf)}</li>`;
    const stateEntry = this.nodeStates?.[leaf.id];
    return html`
      <li role="treeitem" aria-selected="false">
        <div class="node" tabindex="-1"
          @click=${() => this._selectLeaf(leaf)}
          @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter') this._selectLeaf(leaf); }}>
          <span class="leaf-marker">●</span>
          <span>${leaf.description ?? leaf.id}</span>
          ${leaf.executorName ? html`<span class="executor-pill">${leaf.executorName}</span>` : nothing}
          ${stateEntry ? html`<pages-status-badge domain="node" .state=${stateEntry.kind.toUpperCase()}></pages-status-badge>` : nothing}

        </div>
      </li>
    `;
  }

  private _renderCompoundNode(compound: CompoundTaskSnapshot, depth: number): TemplateResult {
    const expanded = this._expanded.has(compound.id);
    return html`
      <li role="treeitem" aria-expanded=${expanded}>
        <div class="node" tabindex="-1"
          @click=${() => this._toggle(compound.id)}
          @keydown=${(e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === 'ArrowRight') { if (!expanded) this._toggle(compound.id); }
            if (e.key === 'ArrowLeft') { if (expanded) this._toggle(compound.id); }
          }}>
          <span class="toggle">${expanded ? '▼' : '▶'}</span>
          <span class="compound-name">${compound.name}</span>
          <span class="method-count">(${compound.methods.length} method${compound.methods.length !== 1 ? 's' : ''})</span>
        </div>
        ${expanded ? html`
          <ul role="group">
            ${compound.methods.map((m, i) => this._renderMethodNode(m, i, depth + 1))}
          </ul>
        ` : nothing}
      </li>
    `;
  }

  private _renderMethodNode(
    method: DecompositionMethodSnapshot,
    index: number,
    depth: number,
  ): TemplateResult {
    if (this.renderMethod) return html`<li role="treeitem">${this.renderMethod(method)}</li>`;
    const color = STRATEGY_COLORS[method.strategyId] ?? STRATEGY_COLORS['_unknown']!;
    const guardText = method.guardLabel != null && method.guardLabel.length > 40
      ? method.guardLabel.slice(0, 40) + '…' : method.guardLabel;

    return html`
      <li role="treeitem">
        <div class="node">
          <span class="strategy-badge" style="background: ${color};">${method.strategyId}</span>
          ${guardText ? html`<span class="guard" title=${method.guardLabel ?? ''}>${guardText}</span>` : nothing}
        </div>
        ${method.children.length > 0 ? html`
          <ul role="group">
            ${method.children.map(child => this._renderNode(child, depth + 1))}
          </ul>
        ` : nothing}
      </li>
    `;
  }

  override render() {
    if (this.decomposition == null) {
      return html`<div class="empty">No decomposition loaded</div>`;
    }
    return html`
      <ul role="tree" aria-label="Decomposition tree">
        ${this._renderNode(this.decomposition.root, 0)}
      </ul>
    `;
  }
}
