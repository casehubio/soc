import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { SocialPatternCategory, RetentionConfig } from '@casehubio/mosaic-core';
import { PatternViewMixin, patternViewStyles } from '../../shared-styles.js';

@customElement('agency-social-memory-hygiene-view')
export class MemoryHygieneView extends PatternViewMixin(LitElement) {

  static override styles = [patternViewStyles, css`
    :host {
      --pattern-badge-color: rgba(245, 194, 231, 0.2);
      --pattern-badge-text: #f5c2e7;
    }
    .body { padding: 24px 16px; display: flex; flex-direction: column; gap: 20px; align-items: center; }
    .threshold-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .threshold-label {
      font-size: 10px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .threshold-value {
      font-size: 28px;
      font-weight: 700;
      color: #f5c2e7;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .threshold-desc {
      font-size: 11px;
      color: #7f849c;
      font-style: italic;
    }
    .weights-section {
      width: 100%;
      max-width: 400px;
    }
    .section-label {
      font-size: 10px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
      text-align: center;
    }
    .weight-rows {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .weight-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .weight-name {
      font-size: 11px;
      font-weight: 500;
      color: #cdd6f4;
      width: 90px;
      text-align: right;
      flex-shrink: 0;
    }
    .weight-bar-container {
      flex: 1;
      height: 16px;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 4px;
      overflow: hidden;
    }
    .weight-bar {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    .bar-confidence { background: rgba(137, 180, 250, 0.6); }
    .bar-recency { background: rgba(166, 227, 161, 0.6); }
    .bar-scope { background: rgba(249, 226, 175, 0.6); }
    .bar-trust { background: rgba(203, 166, 247, 0.6); }
    .weight-value {
      font-size: 11px;
      font-weight: 600;
      color: #7f849c;
      width: 36px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .no-retention {
      text-align: center;
      color: #7f849c;
      font-size: 12px;
      font-style: italic;
      padding: 24px;
    }
  `];

  private static readonly WEIGHT_META: Array<{ key: keyof RetentionConfig; label: string; barClass: string }> = [
    { key: 'confidenceWeight', label: 'Confidence', barClass: 'bar-confidence' },
    { key: 'recencyWeight', label: 'Recency', barClass: 'bar-recency' },
    { key: 'scopeWeight', label: 'Scope', barClass: 'bar-scope' },
    { key: 'trustWeight', label: 'Trust', barClass: 'bar-trust' },
  ];

  override render() {
    if (!this.spec) return this.renderEmptyState();
    return html`${this.renderTabBar()}${this.renderTabPanel()}`;
  }

  override renderExecution() {
    const p = this.spec as SocialPatternCategory;
    const retention = p.retention ?? p.cognition?.retention;
    return html`
      <div class="header">
        <span class="header-label">PATTERN</span>
        ${p.name ? html`<span class="header-name">${p.name}</span>` : nothing}
        <span class="type-badge">${p.type}</span>
        ${p.description ? html`<span class="header-desc">${p.description}</span>` : nothing}
      </div>
      <div class="body">
        ${retention ? this.renderRetention(retention) : html`<div class="no-retention">No retention configuration</div>`}
      </div>
    `;
  }

  private renderRetention(retention: RetentionConfig): TemplateResult {
    return html`
      ${retention.retentionThreshold != null ? html`
        <div class="threshold-section">
          <span class="threshold-label">Retention Threshold</span>
          <span class="threshold-value">${retention.retentionThreshold}</span>
          <span class="threshold-desc">Memories scoring below this are evicted</span>
        </div>
      ` : nothing}
      ${this.renderWeights(retention)}
    `;
  }

  private renderWeights(retention: RetentionConfig): TemplateResult {
    const weights = MemoryHygieneView.WEIGHT_META.filter(w => retention[w.key] != null);
    if (weights.length === 0) return html``;
    return html`
      <div class="weights-section">
        <div class="section-label">Scoring Weights</div>
        <div class="weight-rows">
          ${weights.map(w => this.renderWeightRow(w.label, retention[w.key]!, w.barClass))}
        </div>
      </div>
    `;
  }

  private renderWeightRow(label: string, value: number, barClass: string): TemplateResult {
    const pct = Math.min(value * 100, 100);
    return html`
      <div class="weight-row">
        <span class="weight-name">${label}</span>
        <div class="weight-bar-container">
          <div class="weight-bar ${barClass}" style="width: ${pct}%"></div>
        </div>
        <span class="weight-value">${value}</span>
      </div>
    `;
  }
}
