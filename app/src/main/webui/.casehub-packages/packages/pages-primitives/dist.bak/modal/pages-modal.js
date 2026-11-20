var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { LitElement, html, css, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { FocusTrapMixin } from '../a11y/focus-trap.js';
export class PagesModal extends FocusTrapMixin(LitElement) {
    constructor() {
        super(...arguments);
        this.open = false;
        this.variant = 'dialog';
        this.size = 'md';
        this.noCloseButton = false;
        this.closeOnBackdrop = undefined;
        this.ariaLabel = null;
        this._hasHeaderContent = false;
        this._isAnimating = false;
        this._savedOverflow = '';
        this._savedScrollY = 0;
        this._wasOpen = false;
        this._handleNativeClose = () => {
            this._isAnimating = false;
            this.releaseFocus();
            document.body.style.overflow = this._savedOverflow;
            window.scrollTo(0, this._savedScrollY);
            if (this.open) {
                this.open = false;
            }
            const dialog = this._dialog;
            this.dispatchEvent(new CustomEvent('pages-modal-close', {
                bubbles: true,
                composed: true,
                detail: { returnValue: dialog?.returnValue ?? '' },
            }));
        };
        this._handleCancel = (e) => {
            e.preventDefault();
            this.requestClose();
        };
        this._handleBackdropClick = (e) => {
            if (e.target === this._dialog && this._shouldCloseOnBackdrop) {
                this.requestClose();
            }
        };
        this._onHeaderSlotChange = () => {
            this._checkHeaderContent();
        };
    }
    get _dialog() {
        return this.shadowRoot?.querySelector('dialog') ?? null;
    }
    get _shouldShowCloseButton() {
        if (this.noCloseButton)
            return false;
        return this.variant === 'dialog';
    }
    get _shouldCloseOnBackdrop() {
        if (this.closeOnBackdrop !== undefined)
            return this.closeOnBackdrop;
        return this.variant === 'dialog';
    }
    requestClose(returnValue) {
        if (!this.open || this._isAnimating)
            return;
        const cancelEvent = new CustomEvent('pages-modal-cancel', {
            bubbles: true,
            composed: true,
            cancelable: true,
        });
        this.dispatchEvent(cancelEvent);
        if (cancelEvent.defaultPrevented)
            return;
        const dialog = this._dialog;
        if (!dialog)
            return;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reducedMotion) {
            dialog.close(returnValue ?? '');
            return;
        }
        this._isAnimating = true;
        dialog.classList.add('closing');
        const duration = getComputedStyle(dialog).animationDuration;
        if (!duration || duration === '0s') {
            dialog.classList.remove('closing');
            dialog.close(returnValue ?? '');
            return;
        }
        const onEnd = () => {
            dialog.removeEventListener('animationend', onEnd);
            dialog.classList.remove('closing');
            dialog.close(returnValue ?? '');
        };
        dialog.addEventListener('animationend', onEnd);
    }
    updated(changed) {
        super.updated(changed);
        if (!changed.has('open'))
            return;
        const dialog = this._dialog;
        if (!dialog)
            return;
        if (this.open && !this._wasOpen) {
            if (this._isAnimating)
                return;
            this._savedScrollY = window.scrollY;
            this._savedOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            dialog.showModal();
            const surface = this.shadowRoot?.querySelector('.modal-surface');
            if (surface)
                this.trapFocus(surface);
        }
        else if (!this.open && this._wasOpen) {
            dialog.classList.remove('closing');
            if (dialog.hasAttribute('open')) {
                dialog.close();
            }
        }
        this._wasOpen = this.open;
    }
    firstUpdated() {
        this._checkHeaderContent();
    }
    _checkHeaderContent() {
        const slot = this.shadowRoot?.querySelector('slot[name="header"]');
        if (!slot)
            return;
        this._hasHeaderContent = slot.assignedNodes().length > 0;
        if (!this._hasHeaderContent && !this.ariaLabel) {
            console.warn('pages-modal opened without an accessible name — provide header slot content or set aria-label.');
        }
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        if (this._wasOpen) {
            document.body.style.overflow = this._savedOverflow;
            window.scrollTo(0, this._savedScrollY);
            this._isAnimating = false;
            this._wasOpen = false;
        }
    }
    static { this.styles = css `
    :host { display: contents; }

    dialog {
      border: none;
      padding: 0;
      max-width: min(600px, 90vw);
      max-height: calc(100vh - var(--pages-space-8, 2rem));
      border-radius: var(--pages-radius-lg, 8px);
      box-shadow: var(--pages-shadow-4, 0 8px 24px rgba(0,0,0,0.4));
      background: var(--pages-neutral-1, white);
      font-family: var(--pages-font-family, system-ui, sans-serif);
      color: var(--pages-neutral-12, #1a1a1a);
      overflow: visible;
    }

    dialog::backdrop {
      background: var(--pages-modal-backdrop, oklch(0% 0 0 / 0.5));
    }

    dialog[open] {
      animation: modal-enter var(--pages-duration-fast, 150ms) var(--pages-ease-out, ease-out);
    }
    dialog[open]::backdrop {
      animation: backdrop-enter var(--pages-duration-fast, 150ms) var(--pages-ease-out, ease-out);
    }

    dialog.closing {
      animation: modal-exit var(--pages-duration-fast, 150ms) var(--pages-ease-out, ease-out) forwards;
    }
    dialog.closing::backdrop {
      animation: backdrop-exit var(--pages-duration-fast, 150ms) var(--pages-ease-out, ease-out) forwards;
    }

    @keyframes modal-enter {
      from { opacity: 0; transform: translateY(8px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes backdrop-enter {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes modal-exit {
      to { opacity: 0; transform: translateY(8px) scale(0.97); }
    }
    @keyframes backdrop-exit {
      to { opacity: 0; }
    }

    @media (prefers-reduced-motion: reduce) {
      dialog[open], dialog[open]::backdrop,
      dialog.closing, dialog.closing::backdrop {
        animation: none;
      }
    }

    dialog.size-sm { max-width: min(400px, 90vw); }
    dialog.size-md { max-width: min(600px, 90vw); }
    dialog.size-lg { max-width: min(800px, 90vw); }
    dialog.size-full {
      max-width: calc(100vw - var(--pages-space-8, 2rem));
      max-height: calc(100vh - var(--pages-space-8, 2rem));
    }

    .modal-surface {
      display: flex;
      flex-direction: column;
      max-height: inherit;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--pages-space-6, 1.5rem);
      padding-bottom: 0;
    }

    #modal-header {
      flex: 1;
      font-size: var(--pages-font-size-lg, 1.125rem);
      font-weight: var(--pages-font-weight-semibold, 600);
      line-height: var(--pages-line-height-lg, 1.5);
    }

    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--pages-space-8, 2rem);
      height: var(--pages-space-8, 2rem);
      border: none;
      background: transparent;
      color: var(--pages-neutral-9, #888);
      cursor: pointer;
      border-radius: var(--pages-radius-sm, 4px);
      font-size: 1.25rem;
      line-height: 1;
      flex-shrink: 0;
      margin-left: var(--pages-space-2, 0.5rem);
    }
    .close-btn:hover { color: var(--pages-neutral-11, #333); }
    .close-btn:focus-visible {
      outline: 2px solid var(--pages-accent-9, #007bff);
      outline-offset: 2px;
    }

    .modal-body {
      padding: var(--pages-space-6, 1.5rem);
      overflow-y: auto;
      flex: 1;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--pages-space-3, 0.75rem);
      padding: var(--pages-space-6, 1.5rem);
      padding-top: 0;
    }

    .modal-actions:empty { display: none; }
  `; }
    render() {
        return html `
      <dialog
        class="size-${this.size}"
        role=${this.variant}
        aria-labelledby=${this._hasHeaderContent ? 'modal-header' : nothing}
        aria-label=${!this._hasHeaderContent && this.ariaLabel ? this.ariaLabel : nothing}
        aria-modal="true"
        @cancel=${this._handleCancel}
        @close=${this._handleNativeClose}
        @click=${this._handleBackdropClick}
      >
        <div class="modal-surface">
          <header class="modal-header">
            <div id="modal-header">
              <slot name="header" @slotchange=${this._onHeaderSlotChange}></slot>
            </div>
            ${this._shouldShowCloseButton ? html `
              <button class="close-btn" @click=${() => { this.requestClose(); }} aria-label="Close">✕</button>
            ` : nothing}
          </header>
          <div class="modal-body">
            <slot></slot>
          </div>
          <footer class="modal-actions">
            <slot name="actions"></slot>
          </footer>
        </div>
      </dialog>
    `;
    }
}
__decorate([
    property({ type: Boolean, reflect: true })
], PagesModal.prototype, "open", void 0);
__decorate([
    property()
], PagesModal.prototype, "variant", void 0);
__decorate([
    property()
], PagesModal.prototype, "size", void 0);
__decorate([
    property({ type: Boolean, attribute: 'no-close-button' })
], PagesModal.prototype, "noCloseButton", void 0);
__decorate([
    property({ type: Boolean, attribute: 'close-on-backdrop' })
], PagesModal.prototype, "closeOnBackdrop", void 0);
__decorate([
    property({ attribute: false })
], PagesModal.prototype, "ariaLabel", void 0);
__decorate([
    state()
], PagesModal.prototype, "_hasHeaderContent", void 0);
__decorate([
    state()
], PagesModal.prototype, "_isAnimating", void 0);
if (!customElements.get('pages-modal')) {
    customElements.define('pages-modal', PagesModal);
}
//# sourceMappingURL=pages-modal.js.map