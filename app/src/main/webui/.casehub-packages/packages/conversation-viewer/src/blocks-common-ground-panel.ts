import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import type { CommonGroundState, GroundedFact, EpistemicStatus } from './types.js';
import { EPISTEMIC_STATUSES } from './types.js';

interface ColumnDef {
  status: EpistemicStatus;
  label: string;
  headerClass: string;
  emptyText: string;
}

const COLUMNS: readonly ColumnDef[] = [
  { status: 'ESTABLISHED', label: 'Established', headerClass: 'header-established', emptyText: 'No established facts yet' },
  { status: 'PENDING', label: 'Pending', headerClass: 'header-pending', emptyText: 'No pending claims' },
  { status: 'DISPUTED', label: 'Disputed', headerClass: 'header-disputed', emptyText: 'No disputed points' },
];

export interface CommonGroundPanelProps {
  commonGround?: CommonGroundState;
  factTopic: string;
}

@customElement('blocks-common-ground-panel')
export class CommonGroundPanel extends LitElement {
  @property({ attribute: false }) commonGround?: CommonGroundState;
  @property({ type: String }) factTopic = 'common-ground-fact';
  @property({ attribute: false }) renderFact?: (fact: GroundedFact) => TemplateResult | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Common ground');
  }

  static override styles = css`
    :host { display: block; height: 100%; overflow-y: auto; container-type: inline-size; }
    .grid {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 12px; padding: 12px; height: 100%; box-sizing: border-box;
    }
    .column { display: flex; flex-direction: column; min-height: 0; }
    .column-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 6px 10px; border-radius: var(--pages-radius-sm, 4px);
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.5px; margin-bottom: 8px;
    }
    .header-established { background: var(--pages-success-3, #dcfce7); color: var(--pages-success-9, #16a34a); }
    .header-pending { background: var(--pages-warning-3, #fef3c7); color: var(--pages-warning-9, #d97706); }
    .header-disputed { background: var(--pages-error-3, #fee2e2); color: var(--pages-error-9, #dc2626); }
    .count-badge {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 18px; height: 18px; border-radius: 9px; padding: 0 4px;
      font-size: 10px; font-weight: 700; background: currentColor;
    }
    .count-badge span { color: white; }
    .facts-list { display: flex; flex-direction: column; gap: 6px; overflow-y: auto; flex: 1; }
    .fact-card {
      padding: 8px 10px; border: 1px solid var(--pages-neutral-4, #e5e7eb);
      border-radius: var(--pages-radius-sm, 4px);
      background: var(--pages-neutral-1, #fafafa); cursor: pointer;
      transition: border-color 0.15s;
    }
    .fact-card:hover { border-color: var(--pages-accent-9, #6366f1); }
    .fact-topic {
      font-weight: 600; font-size: 13px; color: var(--pages-neutral-12, #111);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .fact-content {
      font-size: 12px; color: var(--pages-neutral-9, #6b7280); line-height: 1.4;
      margin-top: 4px; overflow: hidden; display: -webkit-box;
      -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    }
    .fact-footer {
      display: flex; gap: 6px; margin-top: 6px;
      font-size: 10px; color: var(--pages-neutral-8, #9ca3af);
    }
    .empty-placeholder {
      flex: 1; display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-style: italic; color: var(--pages-neutral-8, #9ca3af);
    }
    @container (max-width: 500px) {
      .grid { grid-template-columns: 1fr; }
    }
  `;

  private _partition(): Map<EpistemicStatus, GroundedFact[]> {
    const map = new Map<EpistemicStatus, GroundedFact[]>();
    for (const s of EPISTEMIC_STATUSES) map.set(s, []);
    if (this.commonGround) {
      for (const fact of this.commonGround.facts) {
        map.get(fact.epistemicStatus)?.push(fact);
      }
    }
    return map;
  }

  private _onFactClick(fact: GroundedFact): void {
    emitPagesEvent(this, `${this.factTopic}:selected`, {
      factId: fact.id, topic: fact.topic, epistemicStatus: fact.epistemicStatus,
    });
  }

  private _renderFactCard(fact: GroundedFact): TemplateResult {
    const custom = this.renderFact?.(fact);
    if (custom) return custom;
    return html`
      <div class="fact-card" @click=${() => this._onFactClick(fact)}>
        <div class="fact-topic">${fact.topic}</div>
        <div class="fact-content">${fact.content}</div>
        <div class="fact-footer">
          <span>R${fact.round}</span>
          <span>${fact.acknowledgedBy.length} ack</span>
          ${fact.disputedBy.length > 0 ? html`<span>${fact.disputedBy.length} disputed</span>` : nothing}
        </div>
      </div>
    `;
  }

  override render() {
    const partitioned = this._partition();
    return html`
      <div class="grid">
        ${COLUMNS.map(col => {
          const facts = partitioned.get(col.status) ?? [];
          return html`
            <div class="column">
              <div class="column-header ${col.headerClass}">
                <span>${col.label}</span>
                <span class="count-badge"><span>${facts.length}</span></span>
              </div>
              <div class="facts-list">
                ${facts.length > 0
                  ? facts.map(f => this._renderFactCard(f))
                  : html`<div class="empty-placeholder">${col.emptyText}</div>`}
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'blocks-common-ground-panel': CommonGroundPanel;
  }
}
