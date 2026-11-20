import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { OptimisationPatternCategory, PromptOptimisationPipeline } from '@casehubio/mosaic-core';
import { PatternViewMixin, patternViewStyles } from '../../shared-styles.js';

@customElement('agency-optimisation-prompt-view')
export class PromptOptimisationView extends PatternViewMixin(LitElement) {

  static override styles = [patternViewStyles, css`
    :host {
      --pattern-badge-color: rgba(249, 226, 175, 0.2);
      --pattern-badge-text: #f9e2af;
    }
    .body { padding: 24px 16px; }
    .pipelines-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .pipeline-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      overflow: hidden;
    }
    .pipeline-header {
      padding: 10px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pipeline-name {
      font-size: 13px;
      font-weight: 600;
      color: #f9e2af;
    }
    .optimiser-badge {
      font-size: 10px;
      font-weight: 500;
      padding: 1px 6px;
      border-radius: 3px;
      background: rgba(137, 180, 250, 0.15);
      color: #89b4fa;
    }
    .diversity-badge {
      font-size: 10px;
      font-weight: 500;
      padding: 1px 6px;
      border-radius: 3px;
      background: rgba(203, 166, 247, 0.12);
      color: #cba6f7;
    }
    .pipeline-body {
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .signature-section {
      padding: 10px 14px;
      background: rgba(249, 226, 175, 0.04);
      border: 1px dashed rgba(249, 226, 175, 0.2);
      border-radius: 6px;
    }
    .signature-id {
      font-size: 11px;
      font-weight: 600;
      color: #f9e2af;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .signature-prompt {
      font-size: 11px;
      color: #a6adc8;
      margin-top: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .config-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 8px;
    }
    .config-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      padding: 8px 12px;
    }
    .config-label {
      font-size: 9px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .config-value {
      font-size: 12px;
      font-weight: 600;
      color: #cdd6f4;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .safety-section {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .safety-card {
      background: rgba(243, 139, 168, 0.06);
      border: 1px solid rgba(243, 139, 168, 0.15);
      border-radius: 6px;
      padding: 8px 12px;
      flex: 1;
      min-width: 120px;
    }
    .safety-label {
      font-size: 9px;
      font-weight: 600;
      color: #f38ba8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .safety-value {
      font-size: 12px;
      font-weight: 600;
      color: #f38ba8;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .scorer-badge {
      font-size: 10px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(166, 227, 161, 0.15);
      color: #a6e3a1;
    }
    .section-label {
      font-size: 10px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .examples-count {
      font-size: 11px;
      color: #7f849c;
      font-style: italic;
    }
    .no-pipelines {
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
    const p = this.spec as OptimisationPatternCategory;
    const entries = p.pipelines ? Object.entries(p.pipelines) : [];
    return html`
      <div class="header">
        <span class="header-label">PATTERN</span>
        ${p.name ? html`<span class="header-name">${p.name}</span>` : nothing}
        <span class="type-badge">${p.type}</span>
        ${p.description ? html`<span class="header-desc">${p.description}</span>` : nothing}
      </div>
      <div class="body">
        ${entries.length > 0
          ? html`<div class="pipelines-grid">${entries.map(([name, pipeline]) => this.renderPipeline(name, pipeline))}</div>`
          : html`<div class="no-pipelines">No optimisation pipelines configured</div>`}
      </div>
    `;
  }

  private renderPipeline(name: string, pipeline: PromptOptimisationPipeline): TemplateResult {
    return html`
      <div class="pipeline-card">
        <div class="pipeline-header">
          <span class="pipeline-name">${name}</span>
          <span class="optimiser-badge">${pipeline.optimiser.type}</span>
          ${pipeline.optimiser.diversityStrategy ? html`<span class="diversity-badge">${pipeline.optimiser.diversityStrategy}</span>` : nothing}
          ${pipeline.confidenceScorer ? html`<span class="scorer-badge">scorer: ${pipeline.confidenceScorer.type}</span>` : nothing}
        </div>
        <div class="pipeline-body">
          ${this.renderSignature(pipeline)}
          ${pipeline.config ? this.renderConfig(pipeline) : nothing}
          ${pipeline.safety ? this.renderSafety(pipeline) : nothing}
          ${pipeline.examples?.length ? html`<div class="examples-count">${pipeline.examples.length} training examples</div>` : nothing}
        </div>
      </div>
    `;
  }

  private renderSignature(pipeline: PromptOptimisationPipeline): TemplateResult {
    return html`
      <div class="signature-section">
        <div class="section-label">Signature</div>
        <div class="signature-id">${pipeline.signature.id}</div>
        ${pipeline.signature.baseSystemPrompt ? html`<div class="signature-prompt">${pipeline.signature.baseSystemPrompt}</div>` : nothing}
      </div>
    `;
  }

  private renderConfig(pipeline: PromptOptimisationPipeline): TemplateResult {
    const cfg = pipeline.config!;
    const cards: TemplateResult[] = [];
    if (cfg.maxExamples != null) cards.push(this.configCard('Max Examples', cfg.maxExamples));
    if (cfg.minQualityThreshold != null) cards.push(this.configCard('Min Quality', cfg.minQualityThreshold));
    if (cfg.minOutcomeCount != null) cards.push(this.configCard('Min Outcomes', cfg.minOutcomeCount));
    if (cfg.minVariantOutcomes != null) cards.push(this.configCard('Min Variants', cfg.minVariantOutcomes));
    return cards.length > 0 ? html`
      <div>
        <div class="section-label">Configuration</div>
        <div class="config-grid">${cards}</div>
      </div>
    ` : html``;
  }

  private configCard(label: string, value: number): TemplateResult {
    return html`
      <div class="config-card">
        <div class="config-label">${label}</div>
        <div class="config-value">${value}</div>
      </div>
    `;
  }

  private renderSafety(pipeline: PromptOptimisationPipeline): TemplateResult {
    const s = pipeline.safety!;
    return html`
      <div>
        <div class="section-label">Safety Guardrails</div>
        <div class="safety-section">
          ${s.qualityFloor != null ? html`
            <div class="safety-card">
              <div class="safety-label">Quality Floor</div>
              <div class="safety-value">${s.qualityFloor}</div>
            </div>
          ` : nothing}
          ${s.maxExperimentCycles != null ? html`
            <div class="safety-card">
              <div class="safety-label">Max Cycles</div>
              <div class="safety-value">${s.maxExperimentCycles}</div>
            </div>
          ` : nothing}
          ${s.circuitBreakerThreshold != null ? html`
            <div class="safety-card">
              <div class="safety-label">Circuit Breaker</div>
              <div class="safety-value">${s.circuitBreakerThreshold}</div>
            </div>
          ` : nothing}
        </div>
      </div>
    `;
  }
}
