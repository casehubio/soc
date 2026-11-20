import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import '@casehubio/mosaic-core';
import '@casehubio/pages-viz';
type FieldSchema = Record<string, unknown>;
import type { ErasureReceipt } from './types.js';

export const GdprErasureTopics = {
  ERASURE_COMPLETED: 'gdpr.erasure-completed',
} as const;

export interface GdprErasureActionProps {
  endpoint: string;
  subjectLabel: string;
  reasonOptions: string[];
}

@customElement('agency-gdpr-erasure-action')
export class GdprErasureAction extends LitElement {
  @property({ type: String }) endpoint = '';
  @property({ type: String, attribute: 'subject-label' }) subjectLabel = 'Subject';
  @property({ attribute: false }) reasonOptions: string[] = ['GDPR Art.17 Request', 'Data Retention Policy', 'Account Deletion'];

  @state() private _subjectId = '';
  @state() private _reason = '';
  @state() private _loading = false;
  @state() private _error = '';
  @state() private _receipt: ErasureReceipt | null = null;
  @state() private _confirmPending = false;

  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); }
    .form-container {
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: var(--pages-radius-3, 8px);
      padding: var(--pages-space-4, 1rem);
      background: var(--pages-neutral-1, #fff);
      max-width: 500px;
    }
    pages-schema-form { margin-bottom: var(--pages-space-3, 0.75rem); }
    .button-group {
      display: flex;
      gap: var(--pages-space-2, 0.5rem);
      margin-top: var(--pages-space-4, 1rem);
    }
    button {
      padding: var(--pages-space-3, 0.75rem) var(--pages-space-4, 1rem);
      border: none;
      border-radius: var(--pages-radius-2, 4px);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    .btn-primary {
      background: var(--pages-danger-9, #dc2626);
      color: white;
    }
    .btn-primary:hover { background: var(--pages-danger-10, #b91c1c); }
    .btn-primary:disabled {
      background: var(--pages-neutral-6, #a3a3a3);
      cursor: not-allowed;
    }
    .btn-secondary {
      background: var(--pages-neutral-4, #e5e5e5);
      color: var(--pages-neutral-11, #555);
    }
    .btn-secondary:hover { background: var(--pages-neutral-5, #d4d4d4); }
    .receipt {
      border: 1px solid var(--pages-success-6, #16a34a);
      border-radius: var(--pages-radius-3, 8px);
      padding: var(--pages-space-4, 1rem);
      background: var(--pages-success-2, #f0fdf4);
      max-width: 500px;
    }
    .receipt-title {
      font-weight: 600;
      color: var(--pages-success-11, #155724);
      margin-bottom: var(--pages-space-3, 0.75rem);
    }
    .receipt-row {
      display: flex;
      justify-content: space-between;
      padding: var(--pages-space-2, 0.5rem) 0;
      border-bottom: 1px solid var(--pages-success-4, #d4edda);
      font-size: 13px;
    }
    .receipt-row:last-child { border-bottom: none; }
    .receipt-label { font-weight: 600; color: var(--pages-success-10, #166534); }
    .receipt-value { color: var(--pages-success-11, #155724); }
    .error-text {
      color: var(--pages-danger-9, #dc2626);
      font-size: 13px;
      margin-top: var(--pages-space-2, 0.5rem);
    }
    .warning {
      background: var(--pages-warning-3, #fff3cd);
      border: 1px solid var(--pages-warning-6, #d97706);
      border-radius: var(--pages-radius-2, 4px);
      padding: var(--pages-space-3, 0.75rem);
      margin-bottom: var(--pages-space-3, 0.75rem);
      font-size: 13px;
      color: var(--pages-warning-11, #856404);
    }
  `;

  private _buildSchema(): FieldSchema {
    return {
      type: 'object',
      properties: {
        subjectId: {
          type: 'string',
          title: `${this.subjectLabel} ID`,
          placeholder: `Enter ${this.subjectLabel.toLowerCase()} ID`,
        },
        reason: {
          type: 'string',
          title: 'Erasure Reason',
          oneOf: this.reasonOptions.map(opt => ({ const: opt, title: opt })),
        },
      },
      required: ['subjectId', 'reason'],
    };
  }

  private _handleFormChange(e: CustomEvent) {
    const { data } = e.detail;
    this._subjectId = data.subjectId ?? '';
    this._reason = data.reason ?? '';
  }

  private _handleSubmit(e: Event) {
    e.preventDefault();
    const form = this.shadowRoot!.querySelector('pages-schema-form') as any;
    const result = form?.submit();
    if (!result) {
      this._error = `${this.subjectLabel} ID and reason are required`;
      return;
    }
    this._subjectId = result.subjectId;
    this._reason = result.reason;
    this._error = '';
    this._confirmPending = true;
  }

  private _cancelErasure() {
    this._confirmPending = false;
  }

  private async _performErasure() {
    this._confirmPending = false;
    this._loading = true;
    this._error = '';
    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: this._subjectId,
          reason: this._reason,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this._receipt = {
        erasureId: data.erasureId,
        subjectId: this._subjectId,
        reason: this._reason,
        status: data.status || 'WITHDRAWN',
        timestamp: data.timestamp || new Date().toISOString(),
        entryCount: data.entryCount,
      };
      emitPagesEvent(this, GdprErasureTopics.ERASURE_COMPLETED, {
        subjectId: this._subjectId,
        reason: this._reason,
        status: this._receipt.status,
      });
    } catch (e) {
      this._error = e instanceof Error ? e.message : 'Failed to perform erasure';
    } finally {
      this._loading = false;
    }
  }

  private _reset() {
    this._subjectId = '';
    this._reason = '';
    this._receipt = null;
    this._error = '';
  }

  override render() {
    if (this._receipt) {
      return html`
        <div class="receipt">
          <div class="receipt-title">
            ${this._receipt.status === 'ALREADY_WITHDRAWN' ? 'Erasure Already Complete' : 'Erasure Complete'}
          </div>
          ${this._receipt.erasureId ? html`
            <div class="receipt-row">
              <span class="receipt-label">Erasure ID</span>
              <span class="receipt-value">${this._receipt.erasureId}</span>
            </div>
          ` : ''}
          <div class="receipt-row">
            <span class="receipt-label">${this.subjectLabel} ID</span>
            <span class="receipt-value">${this._receipt.subjectId}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Reason</span>
            <span class="receipt-value">${this._receipt.reason}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">Status</span>
            <span class="receipt-value">${this._receipt.status}</span>
          </div>
          ${this._receipt.entryCount != null ? html`
            <div class="receipt-row">
              <span class="receipt-label">Entries Erased</span>
              <span class="receipt-value">${this._receipt.entryCount}</span>
            </div>
          ` : ''}
          <div class="receipt-row">
            <span class="receipt-label">Timestamp</span>
            <span class="receipt-value">${new Date(this._receipt.timestamp).toLocaleString()}</span>
          </div>
          <div style="margin-top: 1rem;">
            <button type="button" class="btn-secondary" @click=${this._reset}>Perform Another Erasure</button>
          </div>
        </div>
      `;
    }

    return html`
      <form class="form-container" @submit=${this._handleSubmit}>
        <div class="warning" role="alert" aria-live="assertive">
          This action is irreversible. All data for the specified ${this.subjectLabel.toLowerCase()} will be permanently erased.
        </div>
        <pages-schema-form
          .schema=${this._buildSchema()}
          .data=${{ subjectId: this._subjectId, reason: this._reason }}
          mode="edit"
          @pages-form-change=${this._handleFormChange}
        ></pages-schema-form>
        ${this._error ? html`<div class="error-text">${this._error}</div>` : ''}
        <div class="button-group">
          <button type="submit" class="btn-primary" ?disabled=${this._loading}>
            ${this._loading ? 'Processing...' : 'Confirm Erasure'}
          </button>
        </div>
      </form>
      <pages-confirm-dialog
        .open=${this._confirmPending}
        heading="Confirm Data Erasure"
        .message=${`Permanently erase all data for ${this.subjectLabel.toLowerCase()} "${this._subjectId}"?\nReason: ${this._reason}\n\nThis action cannot be undone.`}
        confirmLabel="Erase Data"
        confirmVariant="danger"
        persistent
        @confirm=${this._performErasure}
        @cancel=${this._cancelErasure}
      ></pages-confirm-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-gdpr-erasure-action': GdprErasureAction;
  }
}
