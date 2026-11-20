import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { WorkItemResponse, WorkIdentity } from '@casehubio/mosaic-core';

@customElement('agency-detail-action-bar')
export class DetailActionBar extends LitElement {
  @property({ type: Object }) workItem: WorkItemResponse | null = null;
  @property({ type: Object }) identity: WorkIdentity | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'toolbar');
    this.setAttribute('aria-label', 'Work item actions');
  }

  static override styles = css`
    :host {
      display: block;
      position: sticky;
      top: 60px;
      background: var(--pages-neutral-1, #fff);
      border-bottom: 1px solid var(--pages-neutral-5, #e0e0e0);
      padding: var(--pages-space-2, 8px);
      z-index: 10;
    }

    .actions {
      display: flex;
      gap: var(--pages-space-2, 8px);
      flex-wrap: wrap;
    }

    button {
      padding: var(--pages-space-1-5, 6px) var(--pages-space-3, 12px);
      border-radius: var(--pages-radius-sm, 4px);
      font-family: var(--pages-font-family, system-ui);
      font-size: var(--pages-font-size-sm, 12px);
      font-weight: var(--pages-font-weight-medium, 500);
      cursor: pointer;
      border: none;
    }

    @media (prefers-reduced-motion: no-preference) {
      button {
        transition: background-color 120ms ease-out;
      }
    }

    button:hover {
      opacity: 0.9;
    }

    button:focus-visible {
      outline: 2px solid var(--pages-accent-9, #2563eb);
      outline-offset: 2px;
    }

    .primary {
      background: var(--pages-accent-9, #2563eb);
      color: #fff;
    }

    .secondary {
      background: var(--pages-neutral-3, #f3f3f3);
      color: var(--pages-neutral-12, #111);
    }

    .danger {
      background: var(--pages-danger-9, #dc2626);
      color: #fff;
    }

    .success {
      background: var(--pages-success-9, #16a34a);
      color: #fff;
    }
  `;

  override render(): TemplateResult {
    if (!this.workItem) return html``;

    const status = this.workItem.status;
    const userId = this.identity?.userId;

    // Determine available actions based on status
    const actions: Array<{ label: string; action: string; variant: string }> = [];

    switch (status) {
      case 'PENDING':
        actions.push({ label: 'Claim', action: 'claim', variant: 'primary' });
        actions.push({ label: 'Escalate', action: 'escalate', variant: 'secondary' });
        break;

      case 'ASSIGNED':
        actions.push({ label: 'Start', action: 'start', variant: 'primary' });
        actions.push({ label: 'Release', action: 'release', variant: 'secondary' });
        actions.push({ label: 'Delegate', action: 'delegate', variant: 'secondary' });
        actions.push({ label: 'Escalate', action: 'escalate', variant: 'secondary' });
        break;

      case 'IN_PROGRESS':
        actions.push({ label: 'Complete', action: 'complete', variant: 'success' });
        actions.push({ label: 'Reject', action: 'reject', variant: 'danger' });
        actions.push({ label: 'Suspend', action: 'suspend', variant: 'secondary' });
        actions.push({ label: 'Delegate', action: 'delegate', variant: 'secondary' });
        actions.push({ label: 'Escalate', action: 'escalate', variant: 'secondary' });
        break;

      case 'SUSPENDED':
        actions.push({ label: 'Resume', action: 'resume', variant: 'primary' });
        actions.push({ label: 'Cancel', action: 'cancel', variant: 'danger' });
        actions.push({ label: 'Escalate', action: 'escalate', variant: 'secondary' });
        break;

      case 'DELEGATED':
        // Show accept/decline only if current user is the delegation target
        if (this.workItem.assigneeId === userId) {
          actions.push({ label: 'Accept Delegation', action: 'accept-delegation', variant: 'success' });
          actions.push({ label: 'Decline Delegation', action: 'decline-delegation', variant: 'danger' });
        }
        break;

      // Terminal statuses have no actions
      case 'COMPLETED':
      case 'REJECTED':
      case 'FAULTED':
      case 'CANCELLED':
      case 'EXPIRED':
      case 'ESCALATED':
      case 'OBSOLETE':
        return html``; // No action bar for terminal states
    }

    return html`
      <div class="actions">
        ${actions.map(
          ({ label, action, variant }) => html`
            <button
              class="${variant}"
              @click="${() => this._handleAction(action)}"
            >
              ${label}
            </button>
          `,
        )}
      </div>
    `;
  }

  private _handleAction(action: string): void {
    this.dispatchEvent(
      new CustomEvent('action-click', {
        bubbles: true,
        composed: true,
        detail: { action, workItemId: this.workItem?.id },
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-detail-action-bar': DetailActionBar;
  }
}
