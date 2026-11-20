import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { OrchestrationPatternCategory } from '@casehubio/mosaic-core';
import { PatternViewMixin, patternViewStyles } from '../../shared-styles.js';
import '../../agent-card.js';
import './routing-strategy-view.js';

@customElement('agency-orchestration-choreography-view')
export class ChoreographyView extends PatternViewMixin(LitElement) {

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
    .layout {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .blackboard {
      background: rgba(249, 226, 175, 0.06);
      border: 2px dashed #f9e2af;
      border-radius: 12px;
      padding: 14px 28px;
      display: flex;
      align-items: center;
      gap: 12px;
      width: fit-content;
    }
    .blackboard-icon { font-size: 20px; }
    .blackboard-label {
      font-size: 13px;
      font-weight: 600;
      color: #f9e2af;
    }
    .blackboard-detail {
      font-size: 11px;
      color: #7f849c;
    }
    .activation-badge {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(148, 226, 213, 0.15);
      color: #94e2d5;
    }
    .react-arrows {
      display: flex;
      align-items: center;
      gap: 20px;
      color: #585b70;
      font-size: 10px;
    }
    .react-line {
      width: 1px;
      height: 16px;
      background: #585b70;
    }
    .react-label {
      font-size: 10px;
      color: #7f849c;
      font-style: italic;
    }
    .agents-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
      width: 100%;
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
        <div class="layout">
          <div class="blackboard">
            <span class="blackboard-icon">▦</span>
            <div>
              <div class="blackboard-label">Shared Blackboard</div>
              <div class="blackboard-detail">reactive state — no central controller</div>
            </div>
            ${p.activation ? html`<span class="activation-badge">${p.activation.type}</span>` : nothing}
          </div>
          <div class="react-arrows">
            <div class="react-line"></div>
            <span class="react-label">observe ⇅ write</span>
            <div class="react-line"></div>
          </div>
          <div class="agents-grid">
            ${(p.agents ?? []).map(a => html`<agent-card .agent=${a}></agent-card>`)}
          </div>
        </div>
        ${p.routing ? html`
          <agency-routing-strategy-view
            .routing=${p.routing}
            .agents=${p.agents ?? []}
            .governance=${p.governance}
          ></agency-routing-strategy-view>
        ` : nothing}
        ${this.renderMetadata(p)}
      </div>
    `;
  }

  private renderMetadata(p: OrchestrationPatternCategory): TemplateResult | typeof nothing {
    const cards: TemplateResult[] = [];
    if (p.aggregation) {
      cards.push(html`
        <div class="meta-card">
          <div class="meta-label">Aggregation</div>
          <div class="meta-type">${p.aggregation.type}</div>
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
