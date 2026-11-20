import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('pages-position-picker')
export class PagesPositionPicker extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ attribute: false }) anchor: HTMLElement | undefined;

  private _dismissTimer: ReturnType<typeof setTimeout> | undefined;
  private _escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') this._dismiss(); };

  override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('open')) {
      if (this.open) {
        this._positionNearAnchor();
        document.addEventListener('keydown', this._escHandler);
      } else {
        document.removeEventListener('keydown', this._escHandler);
        clearTimeout(this._dismissTimer);
      }
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._escHandler);
    clearTimeout(this._dismissTimer);
  }

  private _positionNearAnchor(): void {
    if (!this.anchor) return;
    const anchorRect = this.anchor.getBoundingClientRect();
    const parentRect = this.offsetParent?.getBoundingClientRect() ?? { top: 0, left: 0 };
    this.style.top = `${anchorRect.bottom - parentRect.top}px`;
    this.style.left = `${anchorRect.left - parentRect.left}px`;
  }

  private _dismiss(): void {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new CustomEvent('picker-close', { bubbles: true, composed: true }));
  }

  private _select(position: 'before' | 'after'): void {
    this.dispatchEvent(new CustomEvent('position-select', {
      bubbles: true, composed: true,
      detail: { position },
    }));
    this.open = false;
  }

  private _handleMouseLeave(): void {
    this._dismissTimer = setTimeout(() => this._dismiss(), 500);
  }

  private _handleMouseEnter(): void {
    clearTimeout(this._dismissTimer);
  }

  override render(): TemplateResult {
    if (!this.open) return html``;
    return html`
      <div class="position-popover"
        @mouseleave=${this._handleMouseLeave}
        @mouseenter=${this._handleMouseEnter}
      >
        <button @click=${() => this._select('before')}>Before</button>
        <button @click=${() => this._select('after')}>After</button>
      </div>
    `;
  }

  static override styles = css`
    :host {
      position: absolute;
      z-index: 1001;
      font-family: var(--pages-font-family, sans-serif);
      font-size: var(--pages-font-size-sm, 13px);
    }

    :host(:not([open])) {
      display: none;
    }

    .position-popover {
      display: flex;
      gap: 4px;
      padding: 6px;
      background: var(--pages-surface-bg, #fff);
      border: 1px solid var(--pages-border-color, #dadce0);
      border-radius: var(--pages-radius-md, 8px);
      box-shadow: var(--pages-shadow-3, 0 4px 16px rgba(0, 0, 0, 0.12));
    }

    button {
      padding: 4px 12px;
      border: 1px solid var(--pages-border-color, #dadce0);
      border-radius: var(--pages-radius-sm, 4px);
      background: var(--pages-surface-bg, #fff);
      color: var(--pages-text-primary, #333);
      cursor: pointer;
      font-size: inherit;
    }

    button:hover {
      background: var(--pages-primary, #1967d2);
      color: #fff;
      border-color: var(--pages-primary, #1967d2);
    }
  `;
}
