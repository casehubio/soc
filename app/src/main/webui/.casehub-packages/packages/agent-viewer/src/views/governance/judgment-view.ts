import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { GovernancePatternCategory, AgentRefSpec } from '@casehubio/mosaic-core';
import { PatternViewMixin, patternViewStyles } from '../../shared-styles.js';
import '../../agent-card.js';

@customElement('agency-governance-judgment-view')
export class JudgmentView extends PatternViewMixin(LitElement) {

  static override styles = [patternViewStyles, css`
    .header {
      padding: 10px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .category-badge {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(243, 139, 168, 0.15);
      color: #f38ba8;
    }
    .type-badge {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(166, 227, 161, 0.15);
      color: #a6e3a1;
    }
    .header-name {
      font-size: 14px;
      font-weight: 600;
      color: #f0f4ff;
      margin-left: auto;
    }
    .description {
      padding: 12px 16px;
      font-size: 13px;
      color: #a6adc8;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .body { padding: 24px 16px; }
    .escalation-chain {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
    }
    .escalation-arrow {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2px 0;
      color: #585b70;
    }
    .arrow-line {
      width: 1px;
      height: 14px;
      background: #585b70;
    }
    .arrow-icon {
      font-size: 8px;
      line-height: 1;
    }
    .arrow-label {
      font-size: 9px;
      color: #7f849c;
      font-style: italic;
    }
    .chain-step {
      width: 100%;
      max-width: 400px;
    }
    .gate-badge {
      text-align: center;
      margin-top: 12px;
    }
    .gate-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 16px;
      background: rgba(249, 226, 175, 0.08);
      border: 2px solid #f9e2af;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      color: #f9e2af;
    }
    .gate-icon { font-size: 16px; }
    .metadata {
      display: flex;
      justify-content: center;
      gap: 24px;
      flex-wrap: wrap;
      margin-top: 20px;
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
    .meta-detail {
      font-size: 10px;
      color: #7f849c;
      margin-top: 2px;
    }
  `];

  override render() {
    const p = this.spec as GovernancePatternCategory;
    if (!p) return this.renderEmptyState();
    return html`
      <div class="header">
        <span class="category-badge">${p.category}</span>
        <span class="type-badge">${p.type}</span>
        ${p.name ? html`<span class="header-name">${p.name}</span>` : nothing}
      </div>
      ${p.description ? html`<div class="description">${p.description}</div>` : nothing}
      <div class="body">
        ${this.renderEscalationChain(p)}
        <div class="gate-badge">
          <div class="gate-pill">
            <span class="gate-icon">⚖</span>
            judgment gate
          </div>
        </div>
        ${this.renderMetadata(p)}
      </div>
    `;
  }

  private renderEscalationChain(p: GovernancePatternCategory): TemplateResult | typeof nothing {
    const agents = p.agents ?? [];
    if (agents.length === 0) return nothing;
    return html`
      <div class="escalation-chain">
        ${agents.map((a, i) => html`
          ${i > 0 ? html`
            <div class="escalation-arrow">
              <div class="arrow-line"></div>
              <span class="arrow-icon">▼</span>
              <span class="arrow-label">escalate</span>
            </div>
          ` : nothing}
          <div class="chain-step">
            <agent-card .agent=${a}></agent-card>
          </div>
        `)}
      </div>
    `;
  }

  private renderMetadata(p: GovernancePatternCategory): TemplateResult | typeof nothing {
    if (!p.failurePolicy) return nothing;
    return html`
      <div class="metadata">
        <div class="meta-card">
          <div class="meta-label">Failure Policy</div>
          ${p.failurePolicy.onRoutingFailure ? html`<div class="meta-detail">routing: ${p.failurePolicy.onRoutingFailure}</div>` : nothing}
          ${p.failurePolicy.onDeadlock ? html`<div class="meta-detail">deadlock: ${p.failurePolicy.onDeadlock}</div>` : nothing}
        </div>
      </div>
    `;
  }
}
