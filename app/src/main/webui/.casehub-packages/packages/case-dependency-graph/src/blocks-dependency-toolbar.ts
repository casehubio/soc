import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import { lookupRelationshipType } from '@casehubio/mosaic-core';

@customElement('blocks-dependency-toolbar')
export class BlocksDependencyToolbar extends LitElement {
  @property({ attribute: false }) edgeTypes: Array<{ type: string; count: number }> = [];
  @property({ attribute: false }) selectedTypes: Set<string> = new Set();
  @property({ type: Number }) nodeCount = 0;
  @property({ type: Number }) edgeCount = 0;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'toolbar');
    this.setAttribute('aria-label', 'Dependency graph filters');
  }

  static override styles = css`
    :host { display: flex; align-items: center; gap: 8px; padding: 8px 12px;
      border-bottom: 1px solid var(--pages-neutral-5, #ccc); flex-wrap: wrap;
      font-size: 0.8125rem; }
    .filters { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
    .filter-item { display: flex; align-items: center; gap: 4px; cursor: pointer; }
    .filter-item input { cursor: pointer; }
    .badge { padding: 1px 6px; border-radius: 3px; font-size: 0.75rem; color: #fff; }
    .stats { color: var(--pages-neutral-9, #999); font-size: 0.75rem; white-space: nowrap; }
    .actions { display: flex; gap: 4px; }
    button { padding: 4px 10px; border: 1px solid var(--pages-neutral-5, #ccc);
      background: var(--pages-neutral-3, #fff); cursor: pointer; font-size: 0.75rem;
      border-radius: 3px; }
    button:hover { background: var(--pages-neutral-4, #f0f0f0); }
  `;

  override render() {
    return html`
      <div class="filters">
        ${this.edgeTypes.map(et => {
          const desc = lookupRelationshipType(et.type);
          return html`
            <label class="filter-item">
              <input type="checkbox"
                .checked=${this.selectedTypes.has(et.type)}
                @change=${() => this._toggleType(et.type)}>
              <span class="badge" style="background: ${desc.color}">
                ${desc.label ?? et.type} (${et.count})
              </span>
            </label>`;
        })}
      </div>
      <span class="stats">${this.nodeCount} nodes, ${this.edgeCount} edges</span>
      <div class="actions">
        <button @click=${this._refresh}>Refresh</button>
        <button @click=${this._exportDot}>Export DOT</button>
      </div>
    `;
  }

  private _toggleType(type: string): void {
    const next = new Set(this.selectedTypes);
    if (next.has(type)) next.delete(type); else next.add(type);
    emitPagesEvent(this, 'dependency-toolbar:filter-change', { selectedTypes: next });
  }

  private _refresh(): void {
    emitPagesEvent(this, 'dependency-toolbar:refresh', {});
  }

  private _exportDot(): void {
    emitPagesEvent(this, 'dependency-toolbar:export-dot', {});
  }
}
