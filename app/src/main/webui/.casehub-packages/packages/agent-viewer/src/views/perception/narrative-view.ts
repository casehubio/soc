import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { PerceptionPatternCategory, SummarisationLevel } from '@casehubio/mosaic-core';
import { PatternViewMixin, patternViewStyles } from '../../shared-styles.js';

@customElement('agency-perception-narrative-view')
export class NarrativeView extends PatternViewMixin(LitElement) {

  static override styles = [patternViewStyles, css`
    :host {
      --pattern-badge-color: rgba(148, 226, 213, 0.2);
      --pattern-badge-text: #94e2d5;
    }
    .body { padding: 24px 16px; }
    .narrative-label {
      font-size: 10px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: center;
      margin-bottom: 12px;
    }
    .pipeline {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
    }
    .source-node {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 20px;
      border: 2px solid #94e2d5;
      border-radius: 8px;
      background: rgba(148, 226, 213, 0.06);
    }
    .source-icon { font-size: 16px; }
    .source-label {
      font-size: 10px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .source-event {
      font-size: 12px;
      font-weight: 500;
      color: #94e2d5;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .connector {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
    }
    .connector-line {
      width: 2px;
      height: 20px;
      background: #585b70;
    }
    .connector-arrow {
      font-size: 10px;
      color: #585b70;
      line-height: 1;
    }
    .stage-card {
      width: 100%;
      max-width: 400px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 12px 16px;
    }
    .stage-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .stage-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stage-l0 {
      background: rgba(166, 227, 161, 0.15);
      color: #a6e3a1;
    }
    .stage-l1 {
      background: rgba(249, 226, 175, 0.15);
      color: #f9e2af;
    }
    .stage-l2 {
      background: rgba(245, 194, 231, 0.15);
      color: #f5c2e7;
    }
    .stage-title {
      font-size: 12px;
      font-weight: 600;
      color: #cdd6f4;
    }
    .stage-detail {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .detail-label {
      font-size: 9px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .detail-value {
      font-size: 11px;
      color: #cdd6f4;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .narrative-output {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 20px;
      border: 2px dashed rgba(245, 194, 231, 0.3);
      border-radius: 8px;
      background: rgba(245, 194, 231, 0.04);
    }
    .output-icon { font-size: 16px; }
    .output-label {
      font-size: 10px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .output-desc {
      font-size: 11px;
      color: #f5c2e7;
    }
    .no-pipeline {
      text-align: center;
      color: #7f849c;
      font-size: 12px;
      font-style: italic;
      padding: 24px;
    }
  `];

  private static readonly STAGE_LABELS = ['L0 Signals', 'L1 Summaries', 'L2 Narrative'] as const;
  private static readonly STAGE_CLASSES = ['stage-l0', 'stage-l1', 'stage-l2'] as const;

  override render() {
    if (!this.spec) return this.renderEmptyState();
    return html`${this.renderTabBar()}${this.renderTabPanel()}`;
  }

  override renderExecution() {
    const p = this.spec as PerceptionPatternCategory;
    return html`
      <div class="header">
        <span class="header-label">PATTERN</span>
        ${p.name ? html`<span class="header-name">${p.name}</span>` : nothing}
        <span class="type-badge">${p.type}</span>
        ${p.description ? html`<span class="header-desc">${p.description}</span>` : nothing}
      </div>
      <div class="body">
        ${p.pipeline ? this.renderNarrativePipeline(p) : html`<div class="no-pipeline">No pipeline configured</div>`}
      </div>
    `;
  }

  private renderNarrativePipeline(p: PerceptionPatternCategory): TemplateResult {
    const pipeline = p.pipeline!;
    return html`
      <div class="narrative-label">Decision Narrative Pipeline</div>
      <div class="pipeline">
        <div class="source-node">
          <span class="source-icon">⚡</span>
          <div>
            <div class="source-label">Source</div>
            <div class="source-event">${pipeline.source}</div>
          </div>
        </div>
        ${pipeline.levels.map((level, i) => html`
          <div class="connector">
            <div class="connector-line"></div>
            <span class="connector-arrow">▼</span>
          </div>
          ${this.renderStage(level, i)}
        `)}
        <div class="connector">
          <div class="connector-line"></div>
          <span class="connector-arrow">▼</span>
        </div>
        <div class="narrative-output">
          <span class="output-icon">📄</span>
          <div>
            <div class="output-label">Output</div>
            <div class="output-desc">Decision Narrative</div>
          </div>
        </div>
      </div>
    `;
  }

  private renderStage(level: SummarisationLevel, index: number): TemplateResult {
    const label = NarrativeView.STAGE_LABELS[index] ?? `L${index}`;
    const stageCss = NarrativeView.STAGE_CLASSES[index] ?? 'stage-l0';
    return html`
      <div class="stage-card">
        <div class="stage-header">
          <span class="stage-badge ${stageCss}">${label}</span>
          <span class="stage-title">${level.summariser.type}</span>
        </div>
        <div class="stage-detail">
          <div class="detail-item">
            <span class="detail-label">Grouping</span>
            <span class="detail-value">${level.grouping}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Emits</span>
            <span class="detail-value">${level.emit}</span>
          </div>
        </div>
      </div>
    `;
  }
}
