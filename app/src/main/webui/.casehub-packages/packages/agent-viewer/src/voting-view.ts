import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { DeliberationPatternCategory } from '@casehubio/mosaic-core';
// flow is vertical through levels — CSS indicators, not SVG arrows
import './agent-card.js';

@customElement('voting-view')
export class VotingView extends LitElement {
  @property({ attribute: false }) pattern!: DeliberationPatternCategory;

  static override styles = css`
    :host {
      display: block;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      overflow: hidden;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      color: #cdd6f4;
    }

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
    .header-meta {
      margin-left: auto;
      font-size: 11px;
      color: #7f849c;
    }
    .body { padding: 24px; }
    .agents-row {
      display: flex;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }
    .section-label {
      font-size: 10px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
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
    .aggregation {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
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
    .agg-detail {
      font-size: 11px;
      color: #7f849c;
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
    .judgment-card {
      background: rgba(137, 180, 250, 0.08);
      border: 2px solid #89b4fa;
      border-radius: 8px;
      padding: 10px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 16px auto 0;
      width: fit-content;
    }
    .judgment-icon { font-size: 18px; }
    .judgment-type {
      font-size: 12px;
      font-weight: 600;
      color: #89b4fa;
    }
    .judgment-detail {
      font-size: 11px;
      color: #7f849c;
    }
    .outcomes {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-top: 16px;
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
    .outcome-label.agreed { color: #a6e3a1; }
    .outcome-label.contested { color: #f9e2af; }
    .outcome-box {
      padding: 6px 16px;
      border-radius: 6px;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .outcome-box.agreed {
      border: 1px solid #a6e3a1;
      background: rgba(166, 227, 161, 0.08);
      color: #a6e3a1;
    }
    .outcome-box.contested {
      border: 1px solid #f9e2af;
      background: rgba(249, 226, 175, 0.08);
      color: #f9e2af;
    }
    .escalation-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      background: rgba(148, 226, 213, 0.15);
      border: 1px solid rgba(148, 226, 213, 0.3);
      border-radius: 4px;
    }
    .escalation-name {
      font-size: 11px;
      color: #94e2d5;
    }
  `;

  override render() {
    if (!this.pattern) return nothing;
    const p = this.pattern;
    return html`
      <div class="header">
        <span class="header-label">PATTERN</span>
        ${p.name ? html`<span class="header-name">${p.name}</span>` : nothing}
        <span class="type-badge">${p.type}</span>
        <span class="header-meta">${this.headerMeta()}</span>
      </div>
      <div class="body">
        <div class="agents-row">
          ${(p.agents ?? []).map(a => html`<agent-card .agent=${a}></agent-card>`)}
        </div>
        ${this.renderFlowIndicator()}
        ${this.renderAggregation()}
        ${this.renderOutcomes()}
        ${this.renderMetadata()}
        ${this.renderJudgment()}
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

  private renderAggregation(): TemplateResult | typeof nothing {
    const a = this.pattern.aggregation;
    if (!a) return nothing;
    const detail: string[] = [];
    const j = this.pattern.judgment;
    if (j?.trigger?.threshold != null) detail.push(`threshold: ${j.trigger.threshold}`);
    return html`
      <div class="aggregation">
        <div class="aggregation-card">
          <span class="agg-icon">⚖</span>
          <div>
            <div class="agg-strategy">${a.type.toUpperCase().replace(/-/g, ' ')}</div>
            ${detail.length > 0 ? html`<div class="agg-detail">${detail.join(' · ')}</div>` : nothing}
          </div>
        </div>
      </div>
    `;
  }

  private renderMetadata(): TemplateResult | typeof nothing {
    const p = this.pattern;
    const cards: TemplateResult[] = [];
    if (p.aggregation) {
      cards.push(html`
        <div class="meta-card">
          <div class="section-label">Aggregation</div>
          <div class="meta-type">${p.aggregation.type}</div>
        </div>
      `);
    }
    if (p.termination?.length) {
      cards.push(html`
        <div class="meta-card">
          <div class="section-label">Termination</div>
          ${p.termination.map(t => html`
            <div class="meta-type">${t.type}</div>
            ${t.iterations ? html`<div class="meta-detail">${t.iterations} iterations</div>` : nothing}
          `)}
        </div>
      `);
    }
    if (p.failurePolicy) {
      const fp = p.failurePolicy;
      cards.push(html`
        <div class="meta-card">
          <div class="section-label">Failure Policy</div>
          ${fp.routingFailureAction ? html`<div class="meta-detail">routing: ${fp.routingFailureAction}</div>` : nothing}
          ${fp.aggregationFailureAction ? html`<div class="meta-detail">deadlock: ${fp.aggregationFailureAction}</div>` : nothing}
        </div>
      `);
    }
    return cards.length > 0 ? html`<div class="metadata">${cards}</div>` : nothing;
  }

  private renderOutcomes(): TemplateResult | typeof nothing {
    const j = this.pattern.judgment;
    if (!j) return nothing;
    const callerNames = j.caller.callerNames ?? (j.caller.callerName ? [j.caller.callerName] : []);
    return html`
      <div class="outcomes">
        <div class="outcome">
          <div class="outcome-label agreed">AGREED</div>
          <div class="outcome-box agreed">→ decision</div>
        </div>
        <div class="outcome">
          <div class="outcome-label contested">CONTESTED</div>
          <div class="outcome-box contested">
            → escalate to${callerNames.map(n => html`
              <div class="escalation-badge">
                <span style="font-size:10px">👤</span>
                <span class="escalation-name">${n}</span>
              </div>`)}
          </div>
        </div>
      </div>
    `;
  }

  private renderJudgment(): TemplateResult | typeof nothing {
    const j = this.pattern.judgment;
    if (!j) return nothing;
    const callerNames = j.caller.callerNames ?? (j.caller.callerName ? [j.caller.callerName] : []);
    return html`
      <div class="judgment-card">
        <span class="judgment-icon">⚖</span>
        <div>
          <div class="judgment-type">${j.caller.type.toUpperCase().replace(/-/g, ' ')}</div>
          <div class="judgment-detail">
            trigger: ${j.trigger.type}${j.trigger.threshold != null ? ` (${j.trigger.threshold})` : ''}
            ${callerNames.length > 0 ? html` · ${callerNames.join(', ')}` : nothing}
          </div>
        </div>
      </div>
    `;
  }

  private headerMeta(): string {
    const p = this.pattern;
    const parts: string[] = [];
    if (p.aggregation) parts.push(p.aggregation.type);
    if (p.termination?.length) {
      for (const t of p.termination) {
        if (t.type === 'max-iterations' && t.iterations) parts.push(`max ${t.iterations} rounds`);
        else if (t.type !== 'single-pass') parts.push(t.type);
      }
      if (p.termination.some(t => t.type === 'single-pass')) parts.push('single-pass');
    }
    if (p.judgment) parts.push('escalation on contested');
    return parts.join(' · ');
  }
}
