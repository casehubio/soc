import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { FocusTrapMixin } from '@casehubio/pages-primitives';

@customElement('blocks-confirm-dialog')
export class BlocksConfirmDialog extends FocusTrapMixin(LitElement) {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String }) heading = 'Confirm';
  @property({ type: String }) message = '';
  @property({ type: String }) confirmLabel = 'Confirm';
  @property({ type: String }) cancelLabel = 'Cancel';
  @property({ type: String }) confirmVariant: 'success' | 'danger' | 'neutral' = 'danger';
  @property({ type: Boolean }) showReason = false;
  @property({ type: Boolean }) persistent = false;

  @state() private _reason = '';

  private _boundEscape = this._handleEscape.bind(this);

  static override styles = css`
    :host { display: contents; }

    .overlay {
      position: fixed;
      inset: 0;
      background: oklch(0 0 0 / 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fade-in var(--pages-duration-fast, 120ms) var(--pages-ease-out);
    }

    .dialog {
      background: var(--pages-neutral-1, #fff);
      border-radius: var(--pages-radius-lg, 8px);
      box-shadow: var(--pages-elevation-3, 0 8px 30px oklch(0 0 0 / 0.12));
      padding: var(--pages-space-6, 24px);
      min-width: 320px;
      max-width: 480px;
      animation: scale-in var(--pages-duration-normal, 200ms) var(--pages-ease-out);
    }

    .heading {
      margin: 0 0 var(--pages-space-2, 8px);
      font-size: var(--pages-font-size-lg, 16px);
      font-weight: var(--pages-font-weight-semibold, 600);
      color: var(--pages-neutral-12, #111);
    }

    .message {
      color: var(--pages-neutral-11, #666);
      font-size: var(--pages-font-size-base, 14px);
      line-height: var(--pages-line-height-relaxed, 1.6);
      margin-bottom: var(--pages-space-5, 20px);
    }

    textarea {
      width: 100%;
      min-height: 60px;
      padding: var(--pages-space-2, 8px);
      border: 1px solid var(--pages-neutral-6, #ccc);
      border-radius: var(--pages-radius-sm, 4px);
      font-family: inherit;
      font-size: var(--pages-font-size-base, 14px);
      resize: vertical;
      margin-bottom: var(--pages-space-4, 16px);
      background: var(--pages-neutral-1, #fff);
      color: var(--pages-neutral-12, #111);
    }

    textarea:focus {
      outline: 2px solid var(--pages-accent-9, #2563eb);
      outline-offset: -1px;
      border-color: var(--pages-accent-9, #2563eb);
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--pages-space-2, 8px);
    }

    button {
      padding: var(--pages-space-1-5, 6px) var(--pages-space-4, 16px);
      border-radius: var(--pages-radius-sm, 4px);
      font-size: var(--pages-font-size-base, 14px);
      font-weight: var(--pages-font-weight-medium, 500);
      cursor: pointer;
      border: 1px solid transparent;
      transition: background var(--pages-duration-fast, 120ms) var(--pages-ease-out);
    }

    .btn-cancel {
      background: var(--pages-neutral-3, #f5f5f5);
      color: var(--pages-neutral-11, #666);
      border-color: var(--pages-neutral-6, #ccc);
    }

    .btn-cancel:hover { background: var(--pages-neutral-4, #e5e5e5); }

    .btn-confirm.variant-danger {
      background: var(--pages-danger-9, #dc2626);
      color: #fff;
    }

    .btn-confirm.variant-danger:hover { background: var(--pages-danger-10, #b91c1c); }

    .btn-confirm.variant-success {
      background: var(--pages-success-9, #16a34a);
      color: #fff;
    }

    .btn-confirm.variant-success:hover { background: var(--pages-success-10, #15803d); }

    .btn-confirm.variant-neutral {
      background: var(--pages-neutral-9, #888);
      color: #fff;
    }

    .btn-confirm.variant-neutral:hover { background: var(--pages-neutral-10, #666); }

    @keyframes fade-in { from { opacity: 0; } }
    @keyframes scale-in { from { transform: scale(0.95); opacity: 0; } }

    @media (prefers-reduced-motion: reduce) {
      .overlay, .dialog { animation: none; }
      button { transition: none; }
    }
  `;

  override render() {
    if (!this.open) return nothing;

    return html`
      <div class="overlay" @click=${this._handleOverlayClick}>
        <div
          class="dialog"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-heading"
          @click=${(e: Event) => e.stopPropagation()}
        >
          <h2 class="heading" id="confirm-heading">${this.heading}</h2>
          ${this.message ? html`<p class="message">${this.message}</p>` : nothing}
          ${this.showReason ? html`
            <textarea
              placeholder="Reason (optional)"
              .value=${this._reason}
              @input=${(e: Event) => { this._reason = (e.target as HTMLTextAreaElement).value; }}
            ></textarea>
          ` : nothing}
          <div class="actions">
            <button class="btn-cancel" @click=${this._handleCancel}>${this.cancelLabel}</button>
            <button class="btn-confirm variant-${this.confirmVariant}" @click=${this._handleConfirm}>${this.confirmLabel}</button>
          </div>
        </div>
      </div>
    `;
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('open')) {
      if (this.open) {
        document.addEventListener('keydown', this._boundEscape);
        const dialog = this.shadowRoot?.querySelector<HTMLElement>('.dialog');
        if (dialog) this.trapFocus(dialog);
      } else {
        document.removeEventListener('keydown', this._boundEscape);
        this.releaseFocus();
        this._reason = '';
      }
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._boundEscape);
  }

  private _handleOverlayClick(): void {
    if (!this.persistent) this._handleCancel();
  }

  private _handleConfirm(): void {
    const detail: { reason?: string } = {};
    if (this.showReason && this._reason) detail.reason = this._reason;
    this.dispatchEvent(new CustomEvent('confirm', { bubbles: true, composed: true, detail }));
  }

  private _handleCancel(): void {
    this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }));
  }

  private _handleEscape(e: KeyboardEvent): void {
    if (e.key === 'Escape') this._handleCancel();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'blocks-confirm-dialog': BlocksConfirmDialog;
  }
}
