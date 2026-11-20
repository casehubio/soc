import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ArchetypeName, OrgLayoutStrategy } from '@casehubio/mosaic-graph-stencil-org';

const ALL_STRATEGIES: OrgLayoutStrategy[] = [
  'star', 'tree', 'circular', 'layered', 'nested',
  'hub-spoke', 'flow', 'radial', 'grid', 'force',
];

@customElement('blocks-org-diagram-toolbar')
export class BlocksOrgDiagramToolbar extends LitElement {
  @property({ type: Boolean }) hasBackend = false;
  @property({ type: Boolean }) dirty = false;
  @property({ type: Boolean }) saving = false;
  @property() archetype: ArchetypeName | null = null;
  @property() confidence: 'high' | 'medium' | 'low' = 'low';
  @property() layoutStrategy: OrgLayoutStrategy | 'auto' = 'auto';
  @property({ type: Number }) unitCount = 0;
  @property({ type: Number }) agentCount = 0;
  @property({ type: Number }) relationshipCount = 0;

  static override styles = css`
    :host { display: flex; align-items: center; gap: 8px; padding: 6px 12px;
      border-bottom: 1px solid var(--pages-neutral-4, #e5e7eb);
      background: var(--pages-neutral-2, #f8f9fa); font-size: 12px; flex-wrap: wrap; }
    .save-btn { padding: 3px 10px; border-radius: 4px; border: 1px solid var(--pages-accent-9, #5470c6);
      background: var(--pages-accent-9, #5470c6); color: #fff; cursor: pointer; font-size: 12px; }
    .save-btn:disabled { opacity: 0.5; cursor: default; }
    .badge { padding: 1px 8px; border-radius: 10px; font-size: 11px; font-weight: 500; }
    .badge-high { background: #dcfce7; color: #166534; }
    .badge-medium { background: #fef9c3; color: #854d0e; }
    .badge-low { background: #f3f4f6; color: #6b7280; }
    select { font-size: 12px; padding: 2px 6px; border: 1px solid var(--pages-neutral-5, #d1d5db);
      border-radius: 4px; background: var(--pages-surface-color, #fff); }
    .stats { color: var(--pages-neutral-9, #6b7280); margin-left: auto; }
    .export-btn { padding: 2px 8px; border: 1px solid var(--pages-neutral-5, #d1d5db);
      border-radius: 4px; background: transparent; cursor: pointer; font-size: 11px;
      color: var(--pages-neutral-11, #374151); }
  `;

  override render() {
    const confidenceClass = `badge badge-${this.confidence}`;
    return html`
      ${this.hasBackend ? html`
        <button class="save-btn" ?disabled=${!this.dirty || this.saving}
          @click=${() => this.dispatchEvent(new CustomEvent('toolbar-save', { bubbles: true }))}
          aria-label="Save">${this.saving ? 'Saving...' : 'Save'}</button>
      ` : nothing}
      <label aria-label="Layout strategy">
        Layout:
        <select @change=${(e: Event) => {
          const value = (e.target as HTMLSelectElement).value as OrgLayoutStrategy | 'auto';
          this.dispatchEvent(new CustomEvent('toolbar-layout-change', { detail: { strategy: value }, bubbles: true }));
        }}>
          <option value="auto" ?selected=${this.layoutStrategy === 'auto'}>Auto</option>
          ${ALL_STRATEGIES.map(s => html`
            <option value=${s} ?selected=${this.layoutStrategy === s}>${s}</option>
          `)}
        </select>
      </label>
      ${this.archetype ? html`
        <span class=${confidenceClass}>${this.archetype}</span>
      ` : nothing}
      <span class="stats">
        ${this.unitCount} unit${this.unitCount !== 1 ? 's' : ''},
        ${this.agentCount} agent${this.agentCount !== 1 ? 's' : ''},
        ${this.relationshipCount} rel${this.relationshipCount !== 1 ? 's' : ''}
      </span>
      <button class="export-btn" @click=${() => this.dispatchEvent(new CustomEvent('toolbar-export', { detail: { format: 'svg' }, bubbles: true }))}
        aria-label="Export SVG">SVG</button>
      <button class="export-btn" @click=${() => this.dispatchEvent(new CustomEvent('toolbar-export', { detail: { format: 'png' }, bubbles: true }))}
        aria-label="Export PNG">PNG</button>
    `;
  }
}
