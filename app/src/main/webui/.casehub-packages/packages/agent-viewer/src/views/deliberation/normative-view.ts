import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { DeliberationPatternCategory } from '@casehubio/mosaic-core';
import { PatternViewMixin, patternViewStyles } from '../../shared-styles.js';
import '../../agent-card.js';

@customElement('agency-deliberation-normative-view')
export class NormativeView extends PatternViewMixin(LitElement) {

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
    .section-label {
      font-size: 10px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      text-align: center;
    }
    .advocates {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-bottom: 16px;
      align-items: center;
      flex-wrap: wrap;
    }
    .conflict-icon {
      font-size: 20px;
      color: #f38ba8;
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
    .arbiter-section {
      display: flex;
      justify-content: center;
      margin: 12px 0;
    }
    .arbiter-card {
      background: rgba(249, 226, 175, 0.08);
      border: 2px solid #f9e2af;
      border-radius: 8px;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .arbiter-icon { font-size: 18px; }
    .arbiter-label {
      font-size: 12px;
      font-weight: 600;
      color: #f9e2af;
    }
    .arbiter-detail {
      font-size: 11px;
      color: #7f849c;
    }
    .arbiter-model {
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 3px;
      background: rgba(137, 180, 250, 0.15);
      color: #89b4fa;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .ruling {
      display: flex;
      justify-content: center;
      margin-top: 12px;
    }
    .ruling-box {
      padding: 8px 20px;
      border: 1px solid #a6e3a1;
      background: rgba(166, 227, 161, 0.08);
      border-radius: 6px;
      font-size: 12px;
      color: #a6e3a1;
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
        <div class="section-label">Competing Rule Advocates</div>
        ${this.renderAdvocates(p)}
        ${p.judge ? html`
          ${this.renderFlowIndicator()}
          ${this.renderArbiter(p)}
          ${this.renderFlowIndicator()}
          <div class="ruling"><div class="ruling-box">→ binding ruling</div></div>
        ` : nothing}
        ${this.renderMetadata(p)}
      </div>
    `;
  }

  private renderAdvocates(p: DeliberationPatternCategory): TemplateResult | typeof nothing {
    const agents = p.agents ?? [];
    if (agents.length === 0) return nothing;
    if (agents.length === 2) {
      return html`
        <div class="advocates">
          <agent-card .agent=${agents[0]}></agent-card>
          <div class="conflict-icon">⚡</div>
          <agent-card .agent=${agents[1]}></agent-card>
        </div>
      `;
    }
    return html`
      <div class="advocates">
        ${agents.map((a, i) => html`
          ${i > 0 ? html`<div class="conflict-icon">⚡</div>` : nothing}
          <agent-card .agent=${a}></agent-card>
        `)}
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

  private renderArbiter(p: DeliberationPatternCategory): TemplateResult | typeof nothing {
    const j = p.judge;
    if (!j) return nothing;
    return html`
      <div class="arbiter-section">
        <div class="arbiter-card">
          <span class="arbiter-icon">⚖</span>
          <div>
            <div class="arbiter-label">${j.name}</div>
            ${j.description ? html`<div class="arbiter-detail">${j.description}</div>` : nothing}
          </div>
          ${j.model ? html`<span class="arbiter-model">${j.model}</span>` : nothing}
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
