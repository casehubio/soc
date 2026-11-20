import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { DeliberationPatternCategory } from '@casehubio/mosaic-core';
import { PatternViewMixin, patternViewStyles } from '../../shared-styles.js';
import '../../agent-card.js';

@customElement('agency-deliberation-coalition-view')
export class CoalitionView extends PatternViewMixin(LitElement) {

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
    .layout {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .coalition-label {
      font-size: 10px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .agents-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
      width: 100%;
    }
    .capability-section {
      width: 100%;
      margin-top: 8px;
    }
    .capability-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      padding: 12px;
      background: rgba(148, 226, 213, 0.04);
      border: 1px dashed rgba(148, 226, 213, 0.2);
      border-radius: 8px;
    }
    .capability-tag {
      font-size: 10px;
      font-weight: 500;
      padding: 3px 10px;
      border-radius: 4px;
      background: rgba(148, 226, 213, 0.12);
      color: #94e2d5;
    }
    .coverage-label {
      text-align: center;
      font-size: 10px;
      color: #7f849c;
      font-style: italic;
      margin-top: 6px;
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
        <div class="layout">
          <div class="coalition-label">Coalition Members</div>
          <div class="agents-grid">
            ${(p.agents ?? []).map(a => html`<agent-card .agent=${a}></agent-card>`)}
          </div>
          ${this.renderCapabilities(p)}
        </div>
        ${this.renderMetadata(p)}
      </div>
    `;
  }

  private renderCapabilities(p: DeliberationPatternCategory): TemplateResult | typeof nothing {
    const agents = p.agents ?? [];
    const allCaps = new Set<string>();
    for (const a of agents) {
      for (const c of a.capabilities ?? []) allCaps.add(c);
    }
    if (allCaps.size === 0) return nothing;
    return html`
      <div class="capability-section">
        <div class="coalition-label" style="text-align:center;margin-bottom:8px">Capability Coverage</div>
        <div class="capability-grid">
          ${[...allCaps].sort().map(c => html`<span class="capability-tag">${c}</span>`)}
        </div>
        <div class="coverage-label">${allCaps.size} capabilities covered by ${agents.length} agents</div>
      </div>
    `;
  }

  private renderMetadata(p: DeliberationPatternCategory): TemplateResult | typeof nothing {
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
