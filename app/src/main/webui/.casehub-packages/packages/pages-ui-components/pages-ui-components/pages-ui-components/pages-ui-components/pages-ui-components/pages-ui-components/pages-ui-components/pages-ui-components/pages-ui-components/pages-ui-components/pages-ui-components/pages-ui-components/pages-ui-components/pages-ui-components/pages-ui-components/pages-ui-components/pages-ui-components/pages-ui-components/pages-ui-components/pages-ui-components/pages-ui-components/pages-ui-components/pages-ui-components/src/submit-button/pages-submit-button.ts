import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";

interface SubmitResult {
  readonly success: boolean;
  readonly error?: string;
}

@customElement("pages-submit-button")
export class PagesSubmitButton extends LitElement {
  static override styles = css`
    :host { display: inline-block; }
    button {
      display: inline-flex; align-items: center; gap: var(--pages-space-1, 4px);
      padding: var(--pages-space-1-5, 6px) var(--pages-space-4, 16px);
      border-radius: var(--pages-radius-sm, 4px);
      font-size: var(--pages-font-size-base, 14px);
      font-family: var(--pages-font-family, system-ui, sans-serif);
      font-weight: var(--pages-font-weight-medium, 500);
      cursor: pointer; border: 1px solid transparent;
      transition: background var(--pages-duration-fast, 120ms) var(--pages-ease-out);
    }
    button:disabled { cursor: not-allowed; opacity: 0.6; }
    .primary { background: var(--pages-accent-9, #5470c6); color: white; border-color: var(--pages-accent-9, #5470c6); }
    .primary:hover:not(:disabled) { background: var(--pages-accent-10, #4060b6); }
    .danger { background: var(--pages-danger-9, #dc2626); color: white; border-color: var(--pages-danger-9, #dc2626); }
    .danger:hover:not(:disabled) { background: var(--pages-danger-10, #b91c1c); }
    .secondary { background: var(--pages-neutral-8, #6c757d); color: white; }
    .secondary:hover:not(:disabled) { background: var(--pages-neutral-9, #5a6268); }
    .ghost { background: transparent; color: var(--pages-accent-9, #5470c6); }
    .ghost:hover:not(:disabled) { background: var(--pages-neutral-3, #f5f5f5); }
    .outline { background: transparent; color: var(--pages-accent-9, #5470c6); border: 1px solid var(--pages-accent-7, #99c2e6); }
    .outline:hover:not(:disabled) { background: var(--pages-accent-3, #e6f0fa); }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spinner { width: 14px; height: 14px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; }
    .result { padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px); border-radius: var(--pages-radius-sm, 4px); font-size: var(--pages-font-size-sm, 13px); margin-top: var(--pages-space-1, 4px); }
    .result-success { background: var(--pages-success-3, #d4edda); color: var(--pages-success-11, #155724); }
    .result-error { background: var(--pages-danger-3, #f8d7da); color: var(--pages-danger-11, #721c24); }
  `;

  @property() label = "Submit";
  @property() variant: "primary" | "danger" | "secondary" | "ghost" | "outline" = "primary";
  @property({ type: Boolean }) disabled = false;

  @state() private _isLoading = false;
  @state() private _resultMessage: string | null = null;
  @state() private _resultType: "success" | "error" | null = null;
  private _timeoutId: ReturnType<typeof setTimeout> | null = null;
  private _successClearId: ReturnType<typeof setTimeout> | null = null;

  override render() {
    const isDisabled = this.disabled || this._isLoading;
    return html`
      <div>
        <button class=${classMap({ [this.variant]: true })}
                ?disabled=${isDisabled}
                aria-busy=${String(this._isLoading)}
                aria-disabled=${isDisabled ? "true" : "false"}
                @click=${this._handleClick}>
          ${this._isLoading ? html`<span class="spinner" aria-hidden="true"></span>` : ""}
          ${this.label}
        </button>
        ${this._resultMessage ? html`
          <div class="result ${this._resultType === "success" ? "result-success" : "result-error"}">
            ${this._resultMessage}
          </div>
        ` : ""}
      </div>
    `;
  }

  private _handleClick(): void {
    if (this._isLoading || this.disabled) return;
    this._isLoading = true;
    this._resultMessage = null;
    this._resultType = null;

    this._timeoutId = setTimeout(() => {
      this._handleResult({ success: false, error: "Form submit timed out" });
    }, 5000);

    this.dispatchEvent(new CustomEvent("pages-form-submit", {
      bubbles: true, composed: true,
      detail: { resolve: (result: SubmitResult) => { this._handleResult(result); } },
    }));
  }

  private _handleResult(result: SubmitResult): void {
    if (this._timeoutId !== null) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
    this._isLoading = false;
    if (result.success) {
      this._resultMessage = "Submitted";
      this._resultType = "success";
      this._successClearId = setTimeout(() => {
        this._resultMessage = null;
        this._resultType = null;
        this._successClearId = null;
      }, 3000);
    } else if (result.error) {
      this._resultMessage = result.error;
      this._resultType = "error";
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._timeoutId !== null) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
    if (this._successClearId !== null) {
      clearTimeout(this._successClearId);
      this._successClearId = null;
    }
  }
}
