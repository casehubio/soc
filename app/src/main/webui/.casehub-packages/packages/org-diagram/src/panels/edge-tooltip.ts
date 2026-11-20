import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('org-edge-tooltip')
export class OrgEdgeTooltip extends LitElement {
  @property() label = '';
  @property() edgeType = '';
  @property({ type: Number }) x = 0;
  @property({ type: Number }) y = 0;
  @property({ type: Boolean }) visible = false;

  @state() private _dismissTimeout: ReturnType<typeof setTimeout> | null = null;

  override createRenderRoot() { return this; }

  show(label: string, edgeType: string, x: number, y: number) {
    if (this._dismissTimeout) { clearTimeout(this._dismissTimeout); this._dismissTimeout = null; }
    this.label = label;
    this.edgeType = edgeType;
    this.x = x;
    this.y = y;
    this.visible = true;
  }

  scheduleDismiss() {
    if (this._dismissTimeout) clearTimeout(this._dismissTimeout);
    this._dismissTimeout = setTimeout(() => { this.visible = false; this._dismissTimeout = null; }, 150);
  }

  cancelDismiss() {
    if (this._dismissTimeout) { clearTimeout(this._dismissTimeout); this._dismissTimeout = null; }
  }

  private _readableType(type: string): string {
    return type
      .replace(/^org-/, '')
      .replace(/-/g, ' ')
      .toUpperCase();
  }

  override render() {
    if (!this.visible) return nothing;
    const displayLabel = this.label || this._readableType(this.edgeType);
    if (!displayLabel) return nothing;

    return html`
      <div
        role="tooltip"
        aria-label=${displayLabel}
        style="position:absolute;left:${this.x}px;top:${this.y}px;z-index:100;background:#fff;border:1px solid #e2e8f0;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.12);padding:6px 10px;font-size:10px;pointer-events:auto;max-width:280px;"
        @mouseenter=${() => this.cancelDismiss()}
        @mouseleave=${() => this.scheduleDismiss()}
      >
        <div style="font-weight:600;color:#4a5568;">${displayLabel}</div>
      </div>
    `;
  }
}
