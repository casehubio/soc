import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import { PagesConfirmDialog } from '@casehubio/pages-ui-components';
import { FocusTrapMixin, LiveRegionMixin } from '@casehubio/pages-primitives/a11y';
import type { WorkIdentity } from '@casehubio/mosaic-core';
import '@casehubio/mosaic-sla-indicator';

export const ApprovalGateTopics = {
  DECIDED: 'gate.decided',
  INFO_REQUESTED: 'gate.info-requested',
} as const;

export interface GateDecidedPayload {
  readonly gateId: string;
  readonly outcome: string;
  readonly resolution?: string | undefined;
  readonly serverData: unknown;
}

export interface OutcomeDefinition {
  key: string;
  label: string;
  variant: 'success' | 'danger' | 'neutral';
}

export interface QuorumConfig {
  required: number;
  total: number;
  voters: VoterStatus[];
}

export interface VoterStatus {
  id: string;
  name: string;
  status: 'voted' | 'pending';
  outcome?: string;
}

export interface GateDecision {
  timestamp: string;
  actor: string;
  outcome: string;
}

const DEFAULT_OUTCOMES: OutcomeDefinition[] = [
  { key: 'approve', label: 'Approve', variant: 'success' },
  { key: 'reject', label: 'Reject', variant: 'danger' },
];

export interface ApprovalGateProps {
  gateId: string;
  endpoint: string;
  identity: WorkIdentity;
  prompt: string;
  contextText: string;
  outcomes: OutcomeDefinition[];
  quorum: QuorumConfig | null;
  deadline: string | null;
  slaWindow: number | null;
  history: GateDecision[];
  data: Record<string, unknown> | null;
  requireConfirmation: boolean;
}

@customElement('agency-approval-gate')
export class ApprovalGate extends LiveRegionMixin(FocusTrapMixin(LitElement)) {
  @property({ type: String, attribute: 'gate-id' }) gateId = '';
  @property({ type: String }) endpoint = '';
  @property({ attribute: false }) identity: WorkIdentity = { userId: '', displayName: '', groups: [] };
  @property({ type: String }) prompt = '';
  @property({ type: String, attribute: 'context-text' }) contextText = '';
  @property({ attribute: false }) outcomes: OutcomeDefinition[] = DEFAULT_OUTCOMES;
  @property({ attribute: false }) quorum: QuorumConfig | null = null;
  @property({ type: String }) deadline: string | null = null;
  @property({ type: Number, attribute: 'sla-window' }) slaWindow: number | null = null;
  @property({ attribute: false }) history: GateDecision[] = [];
  @property({ attribute: false }) data: Record<string, unknown> | null = null;
  @property({ type: Boolean, attribute: 'require-confirmation' }) requireConfirmation = true;

  @state() private _selectedOutcome: OutcomeDefinition | null = null;
  @state() private _submitting = false;
  @state() private _error: string | null = null;
  @state() private _hasSlottedEvidence = false;
  @state() private _showNoteInput = false;
  @state() private _noteText = '';

  static override styles = css`
    :host {
      display: block;
      font-family: var(--pages-font-family, system-ui);
      color: var(--pages-neutral-12, #111);
    }

    .gate {
      border: 1px solid var(--pages-neutral-6, #ccc);
      border-radius: var(--pages-radius-lg, 8px);
      padding: var(--pages-space-5, 20px);
      background: var(--pages-neutral-1, #fff);
    }

    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--pages-space-3, 12px);
      margin-bottom: var(--pages-space-4, 16px);
    }

    .prompt {
      font-size: var(--pages-font-size-lg, 16px);
      font-weight: var(--pages-font-weight-semibold, 600);
      line-height: var(--pages-line-height-relaxed, 1.6);
      margin: 0;
    }

    .context {
      color: var(--pages-neutral-11, #666);
      font-size: var(--pages-font-size-base, 14px);
      line-height: var(--pages-line-height-relaxed, 1.6);
      margin: 0 0 var(--pages-space-4, 16px);
    }

    .evidence-kv {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--pages-space-1, 4px) var(--pages-space-3, 12px);
      font-size: var(--pages-font-size-sm, 12px);
      padding: var(--pages-space-3, 12px);
      background: var(--pages-neutral-2, #fafafa);
      border-radius: var(--pages-radius-sm, 4px);
      margin-bottom: var(--pages-space-4, 16px);
    }

    .evidence-key {
      font-weight: var(--pages-font-weight-medium, 500);
      color: var(--pages-neutral-11, #666);
    }

    .evidence-value {
      color: var(--pages-neutral-12, #111);
    }

    .quorum-section {
      margin-bottom: var(--pages-space-4, 16px);
    }

    .quorum-bar {
      height: var(--pages-space-2, 8px);
      background: var(--pages-neutral-4, #e5e5e5);
      border-radius: var(--pages-radius-sm, 4px);
      overflow: hidden;
      margin-bottom: var(--pages-space-2, 8px);
    }

    .quorum-fill {
      height: 100%;
      background: var(--pages-accent-9, #2563eb);
      border-radius: var(--pages-radius-sm, 4px);
      transition: width var(--pages-duration-normal, 200ms) var(--pages-ease-out);
    }

    .voter-list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--pages-space-2, 8px);
      font-size: var(--pages-font-size-sm, 12px);
    }

    .voter {
      display: inline-flex;
      align-items: center;
      gap: var(--pages-space-1, 4px);
      padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px);
      border-radius: var(--pages-radius-sm, 4px);
      background: var(--pages-neutral-3, #f5f5f5);
    }

    .voter.voted {
      background: var(--pages-success-3, #dcfce7);
      color: var(--pages-success-11, #166534);
    }

    .voter.current {
      outline: 2px solid var(--pages-accent-9, #2563eb);
      outline-offset: 1px;
    }

    .voter-badge {
      font-size: var(--pages-font-size-xs, 11px);
      font-weight: var(--pages-font-weight-medium, 500);
    }

    .history-section {
      margin-bottom: var(--pages-space-4, 16px);
    }

    .history-section summary {
      cursor: pointer;
      font-size: var(--pages-font-size-sm, 12px);
      font-weight: var(--pages-font-weight-medium, 500);
      color: var(--pages-neutral-11, #666);
    }

    .history-list {
      list-style: none;
      padding: 0;
      margin: var(--pages-space-2, 8px) 0 0;
      font-size: var(--pages-font-size-sm, 12px);
    }

    .history-list li {
      padding: var(--pages-space-1, 4px) 0;
      color: var(--pages-neutral-11, #666);
    }

    .actions {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 8px);
      flex-wrap: wrap;
    }

    .action-btn {
      padding: var(--pages-space-2, 8px) var(--pages-space-4, 16px);
      border-radius: var(--pages-radius-sm, 4px);
      font-size: var(--pages-font-size-base, 14px);
      font-weight: var(--pages-font-weight-medium, 500);
      cursor: pointer;
      border: 1px solid transparent;
      transition: background var(--pages-duration-fast, 120ms) var(--pages-ease-out);
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .action-btn.variant-success {
      background: var(--pages-success-9, #16a34a);
      color: #fff;
    }

    .action-btn.variant-success:hover:not(:disabled) {
      background: var(--pages-success-10, #15803d);
    }

    .action-btn.variant-danger {
      background: var(--pages-danger-9, #dc2626);
      color: #fff;
    }

    .action-btn.variant-danger:hover:not(:disabled) {
      background: var(--pages-danger-10, #b91c1c);
    }

    .action-btn.variant-neutral {
      background: var(--pages-neutral-9, #888);
      color: #fff;
    }

    .action-btn.variant-neutral:hover:not(:disabled) {
      background: var(--pages-neutral-10, #666);
    }

    .voted-banner {
      padding: var(--pages-space-3, 12px);
      background: var(--pages-accent-3, #dbeafe);
      border-radius: var(--pages-radius-sm, 4px);
      font-size: var(--pages-font-size-sm, 12px);
      color: var(--pages-accent-11, #1e40af);
      margin-bottom: var(--pages-space-3, 12px);
    }

    .error {
      color: var(--pages-danger-9, #dc2626);
      font-size: var(--pages-font-size-sm, 12px);
      margin-top: var(--pages-space-2, 8px);
    }

    .info-request-link {
      color: var(--pages-accent-9, #2563eb);
      cursor: pointer;
      font-size: var(--pages-font-size-sm, 12px);
      text-decoration: underline;
      border: none;
      background: transparent;
      padding: 0;
      font-family: inherit;
    }

    .info-request-link:hover:not(:disabled) {
      color: var(--pages-accent-10, #1e40af);
    }

    .info-request-link:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .info-request-form {
      margin-top: var(--pages-space-3, 12px);
      display: flex;
      flex-direction: column;
      gap: var(--pages-space-2, 8px);
    }

    .info-request-textarea {
      width: 100%;
      min-height: 80px;
      padding: var(--pages-space-2, 8px);
      border: 1px solid var(--pages-neutral-6, #ccc);
      border-radius: var(--pages-radius-sm, 4px);
      font-family: inherit;
      font-size: var(--pages-font-size-sm, 12px);
      resize: vertical;
    }

    .info-request-actions {
      display: flex;
      gap: var(--pages-space-2, 8px);
    }

    .info-request-submit {
      padding: var(--pages-space-2, 8px) var(--pages-space-3, 12px);
      background: var(--pages-accent-9, #2563eb);
      color: #fff;
      border: none;
      border-radius: var(--pages-radius-sm, 4px);
      font-size: var(--pages-font-size-sm, 12px);
      cursor: pointer;
    }

    .info-request-submit:hover {
      background: var(--pages-accent-10, #1e40af);
    }

    .info-request-cancel {
      padding: var(--pages-space-2, 8px) var(--pages-space-3, 12px);
      background: var(--pages-neutral-4, #e5e5e5);
      color: var(--pages-neutral-12, #111);
      border: none;
      border-radius: var(--pages-radius-sm, 4px);
      font-size: var(--pages-font-size-sm, 12px);
      cursor: pointer;
    }

    .info-request-cancel:hover {
      background: var(--pages-neutral-5, #d4d4d4);
    }

    @media (prefers-reduced-motion: reduce) {
      .quorum-fill { transition: none; }
      .action-btn { transition: none; }
    }
  `;

  override render() {
    const decided = this._isAlreadyDecided();
    const votedOutcome = decided ? this._getUserVoteLabel() : null;

    return html`
      <div class="gate">
        <div class="header">
          <p class="prompt" id="gate-prompt">${this.prompt}</p>
          ${this.deadline !== null ? html`<agency-sla-indicator
            .deadline=${this.deadline}
            .slaWindow=${this.slaWindow}
            compact
          ></agency-sla-indicator>` : nothing}
        </div>

        ${this.contextText ? html`<p class="context">${this.contextText}</p>` : nothing}

        <slot name="evidence" @slotchange=${this._handleEvidenceSlotChange}></slot>
        ${!this._hasSlottedEvidence && this.data !== null ? html`
          <div class="evidence-kv">
            ${Object.entries(this.data).map(([key, value]) => html`
              <span class="evidence-key">${key}</span>
              <span class="evidence-value">${String(value)}</span>
            `)}
          </div>
        ` : nothing}

        ${this.quorum !== null ? this._renderQuorum() : nothing}

        ${this.history.length > 0 ? this._renderHistory() : nothing}

        ${decided ? html`
          <div class="voted-banner">You voted: ${votedOutcome}</div>
        ` : nothing}

        <div class="actions">
          ${this.outcomes.map(o => html`
            <button
              class="action-btn variant-${o.variant}"
              aria-describedby="gate-prompt"
              ?disabled=${decided || this._submitting}
              @click=${() => this._handleOutcomeClick(o)}
            >${o.label}</button>
          `)}
        </div>

        ${!decided ? html`
          <button
            class="info-request-link"
            ?disabled=${this._submitting}
            @click=${this._handleInfoRequestToggle}
          >Request more information</button>
        ` : nothing}

        ${this._showNoteInput ? html`
          <div class="info-request-form">
            <textarea
              class="info-request-textarea"
              placeholder="What information do you need?"
              .value=${this._noteText}
              @input=${this._handleNoteInput}
            ></textarea>
            <div class="info-request-actions">
              <button class="info-request-submit" @click=${this._handleInfoRequestSubmit}>Submit</button>
              <button class="info-request-cancel" @click=${this._handleInfoRequestCancel}>Cancel</button>
            </div>
          </div>
        ` : nothing}

        ${this._error !== null ? html`<p class="error">${this._error}</p>` : nothing}

        <pages-confirm-dialog
          .open=${this._selectedOutcome !== null}
          heading="Confirm decision"
          .message=${'Are you sure you want to: ' + (this._selectedOutcome?.label ?? '')}
          .confirmLabel=${this._selectedOutcome?.label ?? 'Confirm'}
          .confirmVariant=${this._selectedOutcome?.variant ?? 'danger'}
          showReason
          persistent
          @confirm=${this._handleConfirm}
          @cancel=${this._handleDialogCancel}
        ></pages-confirm-dialog>
      </div>
    `;
  }

  private _renderQuorum() {
    const q = this.quorum!;
    const votedCount = q.voters.filter(v => v.status === 'voted').length;
    const pct = (votedCount / q.required) * 100;

    return html`
      <div class="quorum-section">
        <div class="quorum-bar" role="progressbar"
             aria-valuemin="0"
             aria-valuenow="${votedCount}"
             aria-valuemax="${q.required}"
             aria-label="Quorum progress: ${votedCount} of ${q.required} required">
          <div class="quorum-fill" style="width: ${Math.min(pct, 100)}%"></div>
        </div>
        <div class="voter-list">
          ${q.voters.map(v => html`
            <span class="voter ${v.status} ${v.id === this.identity.userId ? 'current' : ''}">
              ${v.name}
              <span class="voter-badge">${v.status === 'voted' ? '✓' : '…'}</span>
            </span>
          `)}
        </div>
      </div>
    `;
  }

  private _renderHistory() {
    return html`
      <details class="history-section">
        <summary>Previous decisions (${this.history.length})</summary>
        <ul class="history-list">
          ${this.history.map(d => html`
            <li>${d.actor} — ${d.outcome} (${d.timestamp})</li>
          `)}
        </ul>
      </details>
    `;
  }

  private _isAlreadyDecided(): boolean {
    if (this.quorum !== null) {
      return this.quorum.voters.some(v => v.id === this.identity.userId && v.status === 'voted');
    }
    return this.history.some(h => h.actor === this.identity.userId);
  }

  private _getUserVoteLabel(): string {
    if (this.quorum !== null) {
      const voter = this.quorum.voters.find(v => v.id === this.identity.userId && v.status === 'voted');
      if (voter?.outcome) {
        const outcome = this.outcomes.find(o => o.key === voter.outcome);
        return outcome?.label ?? voter.outcome;
      }
      return 'decided';
    }
    const entry = this.history.find(h => h.actor === this.identity.userId);
    if (entry) {
      const outcome = this.outcomes.find(o => o.key === entry.outcome);
      return outcome?.label ?? entry.outcome;
    }
    return 'decided';
  }

  private _handleOutcomeClick(outcome: OutcomeDefinition): void {
    if (this._isAlreadyDecided() || this._submitting) return;

    if (this.requireConfirmation) {
      this._selectedOutcome = outcome;
    } else {
      void this._submitDecision(outcome.key);
    }
  }

  private async _handleConfirm(e: Event): Promise<void> {
    const detail = (e as CustomEvent<{ reason?: string }>).detail;
    if (!this._selectedOutcome) return;
    const key = this._selectedOutcome.key;
    const resolution = detail.reason;
    this._selectedOutcome = null;
    await this._submitDecision(key, resolution);
  }

  private _handleDialogCancel(): void {
    this._selectedOutcome = null;
  }

  private async _submitDecision(outcomeKey: string, resolution?: string): Promise<void> {
    this._submitting = true;
    this._error = null;

    try {
      const body: { outcome: string; resolution?: string } = { outcome: outcomeKey };
      if (resolution) body.resolution = resolution;

      const response = await fetch(`${this.endpoint}/workitems/${this.gateId}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let errorBody: unknown = null;
        try { errorBody = await response.json(); } catch { /* non-JSON or missing body */ }
        const serverMessage =
          errorBody !== null && typeof errorBody === 'object' && !Array.isArray(errorBody)
            ? (errorBody as Record<string, unknown>).error ?? (errorBody as Record<string, unknown>).message
            : null;
        throw new Error(
          typeof serverMessage === 'string' && serverMessage
            ? serverMessage
            : `HTTP ${response.status}`
        );
      }

      const serverData: unknown = await response.json().catch(() => null);

      const outcomeLabel = this.outcomes.find(o => o.key === outcomeKey)?.label ?? outcomeKey;
      emitPagesEvent(this, ApprovalGateTopics.DECIDED, {
        gateId: this.gateId,
        outcome: outcomeKey,
        resolution,
        serverData,
      } satisfies GateDecidedPayload);
      this.announce(`Decision submitted: ${outcomeLabel}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this._error = message;
      this.announce(`Decision failed: ${message}`, 'assertive');
    } finally {
      this._submitting = false;
    }
  }

  private _handleEvidenceSlotChange(e: Event): void {
    const slot = e.target as HTMLSlotElement;
    this._hasSlottedEvidence = slot.assignedElements().length > 0;
  }

  private _handleInfoRequestToggle(): void {
    this._showNoteInput = !this._showNoteInput;
    if (!this._showNoteInput) {
      this._noteText = '';
    }
  }

  private _handleNoteInput(e: Event): void {
    this._noteText = (e.target as HTMLTextAreaElement).value;
  }

  private _handleInfoRequestSubmit(): void {
    if (!this._noteText.trim()) return;
    emitPagesEvent(this, ApprovalGateTopics.INFO_REQUESTED, {
      gateId: this.gateId,
      note: this._noteText,
    });
    this.announce('Information request submitted');
    this._showNoteInput = false;
    this._noteText = '';
  }

  private _handleInfoRequestCancel(): void {
    this._showNoteInput = false;
    this._noteText = '';
  }

  configure(props: {
    gateId?: string;
    endpoint?: string;
    identity?: WorkIdentity;
    prompt?: string;
    contextText?: string;
    outcomes?: OutcomeDefinition[];
    quorum?: QuorumConfig | null;
    deadline?: string | null;
    slaWindow?: number | null;
    history?: GateDecision[];
    data?: Record<string, unknown> | null;
    requireConfirmation?: boolean;
  }): void {
    if (props.gateId !== undefined) this.gateId = props.gateId;
    if (props.endpoint !== undefined) this.endpoint = props.endpoint;
    if (props.identity !== undefined) this.identity = props.identity;
    if (props.prompt !== undefined) this.prompt = props.prompt;
    if (props.contextText !== undefined) this.contextText = props.contextText;
    if (props.outcomes !== undefined) this.outcomes = props.outcomes;
    if (props.quorum !== undefined) this.quorum = props.quorum;
    if (props.deadline !== undefined) this.deadline = props.deadline;
    if (props.slaWindow !== undefined) this.slaWindow = props.slaWindow;
    if (props.history !== undefined) this.history = props.history;
    if (props.data !== undefined) this.data = props.data;
    if (props.requireConfirmation !== undefined) this.requireConfirmation = props.requireConfirmation;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-approval-gate': ApprovalGate;
  }
}
