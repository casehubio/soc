import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { OrchestrationPatternCategory, AgentRefSpec } from '@casehubio/mosaic-core';
import { PatternViewMixin, patternViewStyles } from '../../shared-styles.js';
import './routing-strategy-view.js';

@customElement('agency-orchestration-saga-view')
export class SagaView extends PatternViewMixin(LitElement) {

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
    .saga-track {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
    }
    .saga-step {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      max-width: 500px;
    }
    .step-forward {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(166, 227, 161, 0.06);
      border: 1px solid rgba(166, 227, 161, 0.2);
      border-radius: 8px;
      padding: 10px 14px;
    }
    .step-index {
      width: 22px;
      height: 22px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      background: rgba(166, 227, 161, 0.15);
      color: #a6e3a1;
      flex-shrink: 0;
    }
    .step-name {
      font-size: 13px;
      font-weight: 500;
      color: #cdd6f4;
    }
    .step-desc {
      font-size: 11px;
      color: #7f849c;
    }
    .compensation-arrow {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      color: #f38ba8;
      white-space: nowrap;
    }
    .compensation-arrow .arrow-line {
      width: 40px;
      height: 1px;
      background: rgba(243, 139, 168, 0.4);
    }
    .compensation-label {
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 3px;
      background: rgba(243, 139, 168, 0.1);
      color: #f38ba8;
    }
    .step-connector {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2px 0;
      color: #585b70;
    }
    .connector-line {
      width: 1px;
      height: 12px;
      background: #585b70;
    }
    .connector-arrow {
      font-size: 8px;
      line-height: 1;
    }
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
        ${this.renderSagaTrack(p)}
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

  private renderSagaTrack(p: OrchestrationPatternCategory): TemplateResult | typeof nothing {
    const agents = p.agents ?? [];
    if (agents.length === 0) return nothing;
    return html`
      <div class="saga-track">
        ${agents.map((a, i) => html`
          ${i > 0 ? html`
            <div class="step-connector">
              <div class="connector-line"></div>
              <span class="connector-arrow">▼</span>
            </div>
          ` : nothing}
          ${this.renderSagaStep(a, i, agents.length)}
        `)}
      </div>
    `;
  }

  private renderSagaStep(agent: AgentRefSpec, index: number, total: number): TemplateResult {
    return html`
      <div class="saga-step">
        <div class="step-forward">
          <span class="step-index">${index + 1}</span>
          <div>
            <div class="step-name">${agent.name}</div>
            ${agent.description ? html`<div class="step-desc">${agent.description}</div>` : nothing}
          </div>
        </div>
        ${index < total - 1 ? html`
          <div class="compensation-arrow">
            <span>↺</span>
            <span class="arrow-line"></span>
            <span class="compensation-label">compensate</span>
          </div>
        ` : nothing}
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
    if (p.failurePolicy?.agentRetry) {
      const r = p.failurePolicy.agentRetry;
      cards.push(html`
        <div class="meta-card">
          <div class="meta-label">Retry Policy</div>
          <div class="meta-detail">max: ${r.maxRetries ?? '—'}</div>
          <div class="meta-detail">backoff: ${r.backoffStrategy ?? '—'}</div>
          ${r.onExhausted ? html`<div class="meta-detail">exhausted: ${r.onExhausted}</div>` : nothing}
        </div>
      `);
    } else if (p.failurePolicy) {
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
