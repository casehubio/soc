import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { DeliberationPatternCategory, NegotiationParty, AcceptancePolicy } from '@casehubio/mosaic-core';
import { PatternViewMixin, patternViewStyles } from '../../shared-styles.js';
import '../../agent-card.js';

@customElement('agency-deliberation-negotiation-view')
export class NegotiationView extends PatternViewMixin(LitElement) {

  static override styles = [patternViewStyles, css`
    .header {
      padding: 10px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-label {
      font-size: 12px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header-name {
      font-size: 13px;
      font-weight: 500;
      color: #f0f4ff;
    }
    .type-badge {
      padding: 1px 7px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      background: rgba(203, 166, 247, 0.2);
      color: #cba6f7;
    }
    .header-desc {
      margin-left: auto;
      font-size: 11px;
      color: #7f849c;
      max-width: 400px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .body { padding: 24px 16px; }
    .parties {
      display: flex;
      justify-content: center;
      gap: 32px;
      margin-bottom: 16px;
      align-items: center;
      flex-wrap: wrap;
    }
    .party-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 12px 16px;
      text-align: center;
      min-width: 140px;
    }
    .party-name {
      font-size: 13px;
      font-weight: 600;
      color: #cdd6f4;
    }
    .party-role {
      font-size: 10px;
      font-weight: 500;
      padding: 1px 6px;
      border-radius: 3px;
      background: rgba(203, 166, 247, 0.12);
      color: #cba6f7;
      margin-top: 4px;
      display: inline-block;
    }
    .exchange-icon {
      font-size: 20px;
      color: #7f849c;
    }
    .acceptance-section {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
    }
    .acceptance-card {
      background: rgba(166, 227, 161, 0.06);
      border: 1px solid rgba(166, 227, 161, 0.2);
      border-radius: 8px;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .acceptance-label {
      font-size: 10px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .acceptance-type {
      font-size: 12px;
      font-weight: 600;
      color: #a6e3a1;
    }
    .acceptance-threshold {
      font-size: 11px;
      color: #7f849c;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .flow-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 4px 0;
      color: #585b70;
    }
    .flow-line {
      width: 1px;
      height: 16px;
      background: #585b70;
    }
    .flow-arrow {
      font-size: 10px;
      line-height: 1;
    }
    .outcome-section {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-top: 12px;
    }
    .outcome {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .outcome-label {
      font-size: 10px;
      font-weight: 600;
    }
    .outcome-label.accepted { color: #a6e3a1; }
    .outcome-label.deadlocked { color: #f38ba8; }
    .outcome-box {
      padding: 6px 16px;
      border-radius: 6px;
      font-size: 12px;
    }
    .outcome-box.accepted {
      border: 1px solid #a6e3a1;
      background: rgba(166, 227, 161, 0.08);
      color: #a6e3a1;
    }
    .outcome-box.deadlocked {
      border: 1px solid #f38ba8;
      background: rgba(243, 139, 168, 0.08);
      color: #f38ba8;
    }
    .metadata {
      display: flex;
      justify-content: center;
      gap: 24px;
      flex-wrap: wrap;
      margin-top: 16px;
    }
    .meta-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      padding: 8px 14px;
      min-width: 140px;
    }
    .meta-label {
      font-size: 10px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .meta-type {
      font-size: 11px;
      font-weight: 600;
      color: #89b4fa;
    }
    .meta-detail {
      font-size: 10px;
      color: #7f849c;
      margin-top: 2px;
    }
  `];

  private static readonly PARTY_COLORS = ['#89b4fa', '#a6e3a1', '#fab387', '#cba6f7'] as const;

  override render() {
    const p = this.spec as DeliberationPatternCategory;
    if (!p) return this.renderEmptyState();
    return html`
      <div class="header">
        <span class="header-label">PATTERN</span>
        ${p.name ? html`<span class="header-name">${p.name}</span>` : nothing}
        <span class="type-badge">${p.type}</span>
        ${p.description ? html`<span class="header-desc">${p.description}</span>` : nothing}
      </div>
      <div class="body">
        ${this.renderParties(p)}
        ${p.acceptance ? this.renderAcceptance(p.acceptance) : nothing}
        ${this.renderFlowIndicator()}
        ${this.renderOutcomes(p)}
        ${this.renderMetadata(p)}
      </div>
    `;
  }

  private renderParties(p: DeliberationPatternCategory): TemplateResult | typeof nothing {
    if (p.parties?.length) {
      return this.renderNamedParties(p.parties);
    }
    const agents = p.agents ?? [];
    if (agents.length === 0) return nothing;
    return html`
      <div class="parties">
        ${agents.map(a => html`<agent-card .agent=${a}></agent-card>`)}
      </div>
    `;
  }

  private renderNamedParties(parties: NegotiationParty[]): TemplateResult {
    if (parties.length === 2) {
      return html`
        <div class="parties">
          ${this.renderPartyCard(parties[0]!, 0)}
          <div class="exchange-icon">⇄</div>
          ${this.renderPartyCard(parties[1]!, 1)}
        </div>
      `;
    }
    return html`
      <div class="parties">
        ${parties.map((party, i) => this.renderPartyCard(party, i))}
      </div>
    `;
  }

  private renderPartyCard(party: NegotiationParty, index: number): TemplateResult {
    const color = NegotiationView.PARTY_COLORS[index] ?? '#7f849c';
    return html`
      <div class="party-card" style="border-color: ${color}">
        <div class="party-name" style="color: ${color}">${party.name}</div>
        ${party.role ? html`<div class="party-role">${party.role}</div>` : nothing}
      </div>
    `;
  }

  private renderAcceptance(acceptance: AcceptancePolicy): TemplateResult {
    return html`
      <div class="acceptance-section">
        <div class="acceptance-card">
          <span class="acceptance-label">Acceptance</span>
          <span class="acceptance-type">${acceptance.type}</span>
          ${acceptance.type === 'threshold' && acceptance.value != null
            ? html`<span class="acceptance-threshold">≥ ${acceptance.value}</span>`
            : nothing}
        </div>
      </div>
    `;
  }

  private renderFlowIndicator(): TemplateResult {
    return html`
      <div class="flow-indicator">
        <div class="flow-line"></div>
        <span class="flow-arrow">▼</span>
      </div>
    `;
  }

  private renderOutcomes(p: DeliberationPatternCategory): TemplateResult {
    const hasEscalation = p.failurePolicy?.onDeadlock === 'ESCALATE';
    return html`
      <div class="outcome-section">
        <div class="outcome">
          <div class="outcome-label accepted">ACCEPTED</div>
          <div class="outcome-box accepted">→ binding agreement</div>
        </div>
        <div class="outcome">
          <div class="outcome-label deadlocked">DEADLOCKED</div>
          <div class="outcome-box deadlocked">→ ${hasEscalation ? 'escalate' : 'fail'}</div>
        </div>
      </div>
    `;
  }

  private renderMetadata(p: DeliberationPatternCategory): TemplateResult | typeof nothing {
    const cards: TemplateResult[] = [];
    if (p.maxRounds) {
      cards.push(html`
        <div class="meta-card">
          <div class="meta-label">Max Rounds</div>
          <div class="meta-type">${p.maxRounds}</div>
        </div>
      `);
    }
    if (p.termination?.length) {
      cards.push(html`
        <div class="meta-card">
          <div class="meta-label">Termination</div>
          ${p.termination.map(t => html`<div class="meta-type">${t.type}</div>`)}
        </div>
      `);
    }
    if (p.failurePolicy) {
      cards.push(html`
        <div class="meta-card">
          <div class="meta-label">Failure Policy</div>
          ${p.failurePolicy.onRoutingFailure ? html`<div class="meta-detail">routing: ${p.failurePolicy.onRoutingFailure}</div>` : nothing}
          ${p.failurePolicy.onDeadlock ? html`<div class="meta-detail">deadlock: ${p.failurePolicy.onDeadlock}</div>` : nothing}
        </div>
      `);
    }
    return cards.length > 0 ? html`<div class="metadata">${cards}</div>` : nothing;
  }
}
