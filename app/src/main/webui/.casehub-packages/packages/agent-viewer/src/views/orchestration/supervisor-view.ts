import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { OrchestrationPatternCategory } from '@casehubio/mosaic-core';
import { PatternViewMixin, patternViewStyles } from '../../shared-styles.js';
import '../../agent-card.js';
import './routing-strategy-view.js';

@customElement('agency-orchestration-supervisor-view')
export class SupervisorView extends PatternViewMixin(LitElement) {

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
      background: rgba(250, 179, 135, 0.15);
      color: #fab387;
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
    .hub {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .supervisor-node {
      background: rgba(250, 179, 135, 0.08);
      border: 2px solid #fab387;
      border-radius: 12px;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .supervisor-icon { font-size: 20px; }
    .supervisor-label {
      font-size: 14px;
      font-weight: 600;
      color: #fab387;
    }
    .supervisor-detail {
      font-size: 11px;
      color: #7f849c;
    }
    .spokes {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .spoke-line {
      width: 1px;
      height: 20px;
      background: #585b70;
    }
    .spoke-arrow {
      font-size: 10px;
      color: #585b70;
      line-height: 1;
    }
    .workers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
      width: 100%;
    }
    .aggregation-card {
      background: rgba(137, 180, 250, 0.08);
      border: 2px solid #89b4fa;
      border-radius: 8px;
      padding: 10px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .agg-icon { font-size: 18px; }
    .agg-strategy {
      font-size: 12px;
      font-weight: 600;
      color: #89b4fa;
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
    const p = this.spec as OrchestrationPatternCategory;
    if (!p) return this.renderEmptyState();
    return html`
      <div class="header">
        <span class="category-badge">${p.category}</span>
        <span class="type-badge">${p.type}</span>
        ${p.name ? html`<span class="header-name">${p.name}</span>` : nothing}
      </div>
      ${p.description ? html`<div class="description">${p.description}</div>` : nothing}
      <div class="body">
        <div class="hub">
          <div class="supervisor-node">
            <span class="supervisor-icon">⬢</span>
            <div>
              <div class="supervisor-label">Supervisor</div>
              <div class="supervisor-detail">hub-and-spoke routing</div>
            </div>
          </div>
          ${p.routing ? html`
            <agency-routing-strategy-view
              .routing=${p.routing}
              .agents=${p.agents ?? []}
              .governance=${p.governance}
            ></agency-routing-strategy-view>
          ` : html`
            <div class="spokes">
              <div class="spoke-line"></div>
              <span class="spoke-arrow">▼</span>
            </div>
            <div class="workers-grid">
              ${(p.agents ?? []).map(a => html`<agent-card .agent=${a}></agent-card>`)}
            </div>
          `}
          ${this.renderAggregation(p)}
        </div>
        ${this.renderMetadata(p)}
      </div>
    `;
  }

  private renderAggregation(p: OrchestrationPatternCategory): TemplateResult | typeof nothing {
    if (!p.aggregation) return nothing;
    return html`
      <div class="spokes">
        <span class="spoke-arrow">▲</span>
        <div class="spoke-line"></div>
      </div>
      <div class="aggregation-card">
        <span class="agg-icon">⚖</span>
        <span class="agg-strategy">${p.aggregation.type.toUpperCase().replace(/-/g, ' ')}</span>
      </div>
    `;
  }

  private renderMetadata(p: OrchestrationPatternCategory): TemplateResult | typeof nothing {
    const cards: TemplateResult[] = [];
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
