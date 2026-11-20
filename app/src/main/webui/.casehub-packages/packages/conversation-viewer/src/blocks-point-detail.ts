import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@casehubio/pages-ui-components';
import { formatTimestamp, statusBorderColour, entryCardStyles, badgeStyles } from '@casehubio/mosaic-core';
import type { EntryCategory } from '@casehubio/mosaic-core';
import type { ConversationPoint, ConversationEntry, SubTaskFinding, FlagEntry, ObligationChain } from './types.js';
import '@casehubio/mosaic-core';

function entryTypeCategory(entryType: string): EntryCategory {
  switch (entryType) {
    case 'AGREE': case 'VERIFIED': return 'success';
    case 'COUNTER': case 'FLAG_HUMAN': case 'HUMAN_OVERRIDE': return 'warning';
    case 'DISPUTE': return 'error';
    case 'QUALIFY': return 'accent';
    default: return 'neutral';
  }
}

export interface PointDetailProps {
  point?: ConversationPoint;
  findings: SubTaskFinding[];
  flags: FlagEntry[];
  obligations: ObligationChain[];
}

@customElement('blocks-point-detail')
export class PointDetail extends LitElement {
  @property({ attribute: false }) point?: ConversationPoint;
  @property({ attribute: false }) findings: SubTaskFinding[] = [];
  @property({ attribute: false }) flags: FlagEntry[] = [];
  @property({ attribute: false }) obligations: ObligationChain[] = [];
  @property({ attribute: false }) renderEntry?: (entry: ConversationEntry) => TemplateResult | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Conversation point detail');
  }

  static override styles = [entryCardStyles, badgeStyles, css`
    :host { display: flex; flex-direction: column; height: 100%; overflow-y: auto; }
    .detail-container { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
    .detail-header { display: flex; flex-direction: column; gap: 6px; padding-bottom: 10px; border-bottom: 1px solid var(--pages-neutral-4, #e5e7eb); }
    .detail-topic-row { display: flex; align-items: center; gap: 8px; }
    .detail-topic { font-size: 16px; font-weight: 600; color: var(--pages-neutral-12, #111); flex: 1; }
    .detail-badges { display: flex; gap: 6px; flex-wrap: wrap; }
    .thread { display: flex; flex-direction: column; gap: 8px; }
    .entry-type { text-transform: lowercase; }
    .section-header {
      font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
      color: var(--pages-neutral-8, #9ca3af); padding: 8px 0 4px;
      border-bottom: 1px solid var(--pages-neutral-4, #e5e7eb); margin-top: 8px;
    }
    .finding-card {
      margin-left: 20px; padding: 8px 10px;
      border-left: 2px dashed var(--pages-neutral-5, #d4d4d4);
      background: var(--pages-neutral-2, #f5f5f5); border-radius: 0 var(--pages-radius-sm, 4px) var(--pages-radius-sm, 4px) 0;
      font-size: 12px;
    }
    .finding-header { display: flex; gap: 6px; font-size: 11px; color: var(--pages-neutral-8, #9ca3af); margin-bottom: 4px; }
    .finding-type { font-weight: 600; }
    .flag-banner {
      padding: 8px 10px; border: 2px solid var(--pages-warning-9, #d97706);
      background: var(--pages-warning-2, #fef3c7); border-radius: var(--pages-radius-sm, 4px);
    }
    .flag-label {
      font-size: 10px; font-weight: 700; color: var(--pages-warning-9, #d97706);
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;
    }
    .flag-content { font-size: 12px; color: var(--pages-neutral-12, #111); }
    .obligation-card {
      padding: 8px 10px; border: 1px solid var(--pages-neutral-4, #e5e7eb);
      border-radius: var(--pages-radius-sm, 4px); background: var(--pages-neutral-1, #fafafa);
      display: flex; flex-direction: column; gap: 6px;
    }
    .obligation-header { font-size: 11px; color: var(--pages-neutral-8, #9ca3af); }
    .empty { color: var(--pages-neutral-8, #9ca3af); font-size: 12px; font-style: italic; text-align: center; padding: 24px; }
  `];

  private _renderEntryCard(entry: ConversationEntry): TemplateResult {
    const custom = this.renderEntry?.(entry);
    if (custom) return custom;
    const borderColour = statusBorderColour(entryTypeCategory(entry.entryType));
    return html`
      <div class="entry-card" style="border-left-color: ${borderColour}">
        <div class="entry-header">
          <span class="entry-agent">${entry.agentRole}</span>
          <span class="entry-type">${entry.entryType}</span>
          ${entry.timestamp ? html`<span class="entry-timestamp">${formatTimestamp(entry.timestamp)}</span>` : nothing}
        </div>
        <div class="entry-content">${entry.content}</div>
      </div>
    `;
  }

  override render() {
    if (!this.point) return html`<div class="empty">Select a point to view details</div>`;

    const { topic, status, classification, entries } = this.point;

    return html`
      <div class="detail-container">
        <div class="detail-header">
          <div class="detail-topic-row">
            <span class="detail-topic">${topic}</span>
            <pages-status-badge domain="conversation" state=${status}></pages-status-badge>
          </div>
          <div class="detail-badges">
            <span class="badge badge-priority">${classification.priority}</span>
            <span class="badge badge-scope">${classification.scope}</span>
            ${classification.location ? html`<span class="badge badge-location">${classification.location}</span>` : nothing}
          </div>
        </div>

        <div class="thread">
          ${entries.map(e => this._renderEntryCard(e))}
        </div>

        ${this.findings.length > 0 ? html`
          <div class="findings-section">
            <div class="section-header">Sub-task findings</div>
            ${this.findings.map(f => html`
              <div class="finding-card">
                <div class="finding-header">
                  <span class="finding-type">${f.taskType}</span>
                  <span>· ${f.status} · R${f.round}</span>
                </div>
                <div>${f.content}</div>
              </div>
            `)}
          </div>
        ` : nothing}

        ${this.obligations.length > 0 ? html`
          <div class="obligations-section">
            <div class="section-header">Obligation chains</div>
            ${this.obligations.map(o => html`
              <div class="obligation-card">
                <div class="obligation-header">${o.commitment.state} · ${o.correlationId}</div>
                ${o.transitions.map(t => html`
                  <commitment-transition-badge .transition=${t} compact></commitment-transition-badge>
                `)}
                <commitment-range-bar
                  .state=${o.commitment.state}
                  .createdAt=${o.commitment.createdAt}
                  .resolvedAt=${o.commitment.resolvedAt}
                  .acknowledgedAt=${o.commitment.acknowledgedAt}
                  .deadline=${o.commitment.deadline}
                  mode="compact"
                ></commitment-range-bar>
              </div>
            `)}
          </div>
        ` : nothing}

        ${this.flags.length > 0 ? html`
          <div class="flags-section">
            <div class="section-header">Flags</div>
            ${this.flags.map(f => html`
              <div class="flag-banner">
                <div class="flag-label">⚠ Flagged by ${f.flaggedBy} · R${f.round}</div>
                <div class="flag-content">${f.content}</div>
              </div>
            `)}
          </div>
        ` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'blocks-point-detail': PointDetail;
  }
}
