import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@casehubio/pages-ui-components';

@customElement('casehub-diagram-toolbar')
export class CasehubDiagramToolbar extends LitElement {
  @property({ type: Boolean }) dirty = false;
  @property({ type: Boolean }) saving = false;
  @property({ type: Boolean }) hasBackend = false;
  @property({ type: Boolean }) hasNodes = false;
  @property({ type: Boolean }) runtimeAvailable = false;
  @property({ type: String }) mode: 'design' | 'runtime' = 'design';
  @property({ type: Number }) staleSeconds = 0;
  @property({ type: String }) caseStatus?: string;

  static override styles = css`
    :host { display: flex; align-items: center; gap: 8px; padding: 4px 12px; border-bottom: 1px solid var(--pages-border-color, #ddd); height: 32px; box-sizing: border-box; font-family: var(--pages-font-family, system-ui, sans-serif); }
    button {
      border: 1px solid var(--pages-border-color, #ccc); border-radius: 4px;
      background: var(--pages-surface-color, #fff); cursor: pointer;
      padding: 2px 10px; font-size: 12px; color: var(--pages-text-color, #333);
      display: flex; align-items: center; gap: 4px;
    }
    button:hover:not(:disabled) { background: var(--pages-surface-raised, #f5f5f5); }
    button:disabled { opacity: 0.4; cursor: default; }
    .dirty-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--pages-warning-color, #f59e0b); }
    .mode-toggle[aria-pressed="true"] { background: var(--pages-accent-subtle, #e8f0fe); border-color: var(--pages-accent-color, #1a73e8); color: var(--pages-accent-color, #1a73e8); }
    .spacer { flex: 1; }
    .stale-badge { font-size: 11px; color: var(--pages-warning-color, #f59e0b); }
  `;

  override render() {
    const saveSection = this.hasBackend ? html`
      <button ?disabled=${!this.dirty || this.saving} @click=${this._save}>
        ${this.saving ? 'Saving…' : 'Save'}
      </button>
      ${this.dirty ? html`<span class="dirty-dot"></span>` : nothing}
    ` : nothing;

    const caseBadge = this.caseStatus ? html`
      <pages-status-badge domain="case" state=${this.caseStatus} size="sm" showIcon></pages-status-badge>
    ` : nothing;

    const modeSection = this.runtimeAvailable ? html`
      <span class="spacer"></span>
      ${caseBadge}
      <button class="mode-toggle"
        aria-pressed=${this.mode === 'runtime'}
        @click=${this._toggleMode}>
        ${this.mode === 'design' ? '⚡ Runtime' : '✏️ Design'}
      </button>
      ${this.staleSeconds > 0 ? html`<span class="stale-badge">⚠ stale (${this.staleSeconds}s ago)</span>` : nothing}
    ` : nothing;

    const exportSection = html`
      <button ?disabled=${!this.hasNodes} @click=${() => this._export('svg')}>Export SVG</button>
      <button ?disabled=${!this.hasNodes} @click=${() => this._export('png')}>Export PNG</button>
    `;

    return html`${saveSection}${exportSection}${modeSection}`;
  }

  private _save(): void {
    this.dispatchEvent(new CustomEvent('toolbar-save', { bubbles: true, composed: true }));
  }

  private _export(format: 'svg' | 'png'): void {
    this.dispatchEvent(new CustomEvent('toolbar-export', {
      detail: { format },
      bubbles: true,
      composed: true,
    }));
  }

  private _toggleMode(): void {
    const newMode = this.mode === 'design' ? 'runtime' : 'design';
    this.dispatchEvent(new CustomEvent('toolbar-mode-change', {
      detail: { mode: newMode },
      bubbles: true,
      composed: true,
    }));
  }
}
