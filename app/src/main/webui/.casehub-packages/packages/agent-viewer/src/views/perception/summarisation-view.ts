import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { PerceptionPatternCategory, SummarisationLevel } from '@casehubio/mosaic-core';
import { PatternViewMixin, patternViewStyles } from '../../shared-styles.js';

@customElement('agency-perception-summarisation-view')
export class SummarisationView extends PatternViewMixin(LitElement) {

  static override styles = [patternViewStyles, css`
    :host {
      --pattern-badge-color: rgba(148, 226, 213, 0.2);
      --pattern-badge-text: #94e2d5;
    }
    .body { padding: 24px 16px; }
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
    .level-card {
      width: 100%;
      max-width: 400px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 12px 16px;
    }
    .level-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .level-number {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      background: rgba(148, 226, 213, 0.15);
      color: #94e2d5;
      flex-shrink: 0;
    }
    .level-title {
      font-size: 12px;
      font-weight: 600;
      color: #cdd6f4;
    }
    .level-detail {
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
    .grouping-badge {
      font-size: 10px;
      font-weight: 500;
      padding: 1px 6px;
      border-radius: 3px;
      background: rgba(137, 180, 250, 0.15);
      color: #89b4fa;
    }
    .emit-node {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 16px;
      border: 1px dashed rgba(148, 226, 213, 0.3);
      border-radius: 6px;
      background: rgba(148, 226, 213, 0.03);
    }
    .emit-label {
      font-size: 9px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .emit-event {
      font-size: 11px;
      color: #94e2d5;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .no-pipeline {
      text-align: center;
      color: #7f849c;
      font-size: 12px;
      font-style: italic;
      padding: 24px;
    }
  `];

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
        ${p.pipeline ? this.renderPipeline(p) : html`<div class="no-pipeline">No pipeline configured</div>`}
      </div>
    `;
  }

  private renderPipeline(p: PerceptionPatternCategory): TemplateResult {
    const pipeline = p.pipeline!;
    return html`
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
          ${this.renderLevel(level, i)}
        `)}
      </div>
    `;
  }

  private renderLevel(level: SummarisationLevel, index: number): TemplateResult {
    return html`
      <div class="level-card">
        <div class="level-header">
          <span class="level-number">${index + 1}</span>
          <span class="level-title">Level ${index + 1}</span>
          <span class="grouping-badge">${level.grouping}</span>
        </div>
        <div class="level-detail">
          <div class="detail-item">
            <span class="detail-label">Summariser</span>
            <span class="detail-value">${level.summariser.type}</span>
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
