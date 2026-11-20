import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { PerceptionPatternCategory, WorldSection, RendererSpec } from '@casehubio/mosaic-core';
import { PatternViewMixin, patternViewStyles } from '../../shared-styles.js';

@customElement('agency-perception-observation-view')
export class ObservationView extends PatternViewMixin(LitElement) {

  static override styles = [patternViewStyles, css`
    :host {
      --pattern-badge-color: rgba(148, 226, 213, 0.2);
      --pattern-badge-text: #94e2d5;
    }
    .body { padding: 24px 16px; display: flex; flex-direction: column; gap: 20px; }
    .section-label {
      font-size: 10px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .actions-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .action-tag {
      font-size: 10px;
      font-weight: 500;
      padding: 3px 10px;
      border-radius: 4px;
      background: rgba(148, 226, 213, 0.12);
      color: #94e2d5;
    }
    .sections-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .section-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 10px 14px;
    }
    .section-type-badge {
      font-size: 10px;
      font-weight: 500;
      padding: 1px 6px;
      border-radius: 3px;
      background: rgba(137, 180, 250, 0.15);
      color: #89b4fa;
      margin-right: 8px;
    }
    .section-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 6px;
    }
    .tag {
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 3px;
      background: rgba(203, 166, 247, 0.12);
      color: #cba6f7;
    }
    .threshold-bar-container {
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
    }
    .threshold-bar {
      position: relative;
      height: 28px;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 6px;
      overflow: hidden;
      margin-top: 8px;
    }
    .threshold-zone {
      position: absolute;
      top: 0;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .zone-verbatim {
      left: 0;
      background: rgba(166, 227, 161, 0.15);
      color: #a6e3a1;
      border-right: 2px solid rgba(166, 227, 161, 0.4);
    }
    .zone-grouped {
      background: rgba(249, 226, 175, 0.15);
      color: #f9e2af;
      border-right: 2px solid rgba(249, 226, 175, 0.4);
    }
    .zone-summarised {
      background: rgba(243, 139, 168, 0.1);
      color: #f38ba8;
    }
    .threshold-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
    }
    .threshold-label {
      font-size: 9px;
      color: #7f849c;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .pipeline-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .pipeline-step {
      font-size: 10px;
      padding: 3px 10px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #cdd6f4;
    }
    .no-world {
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
        ${p.world ? this.renderWorld(p) : html`<div class="no-world">No world definition configured</div>`}
      </div>
    `;
  }

  private renderWorld(p: PerceptionPatternCategory): TemplateResult {
    const world = p.world!;
    return html`
      ${world.actions?.length ? this.renderActions(world.actions) : nothing}
      ${world.sections?.length ? this.renderSections(world.sections) : nothing}
      ${world.renderer ? this.renderThresholdBar(world.renderer) : nothing}
      ${world.pipeline?.length ? this.renderPipeline(world.pipeline) : nothing}
    `;
  }

  private renderActions(actions: string[]): TemplateResult {
    return html`
      <div>
        <div class="section-label">Actions</div>
        <div class="actions-row">
          ${actions.map(a => html`<span class="action-tag">${a}</span>`)}
        </div>
      </div>
    `;
  }

  private renderSections(sections: WorldSection[]): TemplateResult {
    return html`
      <div>
        <div class="section-label">Sections</div>
        <div class="sections-list">
          ${sections.map(s => html`
            <div class="section-card">
              <span class="section-type-badge">${s.type}</span>
              ${s.requiredTags?.length ? html`
                <div class="section-tags">
                  ${s.requiredTags.map(t => html`<span class="tag">${t}</span>`)}
                </div>
              ` : nothing}
            </div>
          `)}
        </div>
      </div>
    `;
  }

  private renderThresholdBar(renderer: RendererSpec): TemplateResult {
    const maxThreshold = Math.max(renderer.groupedThreshold * 1.5, 30);
    const verbatimPct = (renderer.verbatimThreshold / maxThreshold) * 100;
    const groupedPct = (renderer.groupedThreshold / maxThreshold) * 100;
    return html`
      <div class="threshold-bar-container">
        <div class="section-label">Rendering Tiers</div>
        <div class="threshold-bar">
          <div class="threshold-zone zone-verbatim" style="width: ${verbatimPct}%">verbatim</div>
          <div class="threshold-zone zone-grouped" style="left: ${verbatimPct}%; width: ${groupedPct - verbatimPct}%">grouped</div>
          <div class="threshold-zone zone-summarised" style="left: ${groupedPct}%; right: 0">summarised</div>
        </div>
        <div class="threshold-labels">
          <span class="threshold-label">0</span>
          <span class="threshold-label">≤${renderer.verbatimThreshold}</span>
          <span class="threshold-label">≤${renderer.groupedThreshold}</span>
          <span class="threshold-label">${renderer.groupedThreshold}+</span>
        </div>
      </div>
    `;
  }

  private renderPipeline(pipeline: string[]): TemplateResult {
    return html`
      <div>
        <div class="section-label">Pipeline</div>
        <div class="pipeline-list">
          ${pipeline.map(step => html`<span class="pipeline-step">${step}</span>`)}
        </div>
      </div>
    `;
  }
}
