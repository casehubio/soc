import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { SocialPatternCategory, CognitionConfig, DriveConfigSpec } from '@casehubio/mosaic-core';
import { PatternViewMixin, patternViewStyles } from '../../shared-styles.js';

const SECTION_META: Record<string, { label: string; icon: string }> = {
  drive: { label: 'Drive', icon: '⚡' },
  mood: { label: 'Mood', icon: '🎭' },
  personalityEvolution: { label: 'Personality Evolution', icon: '🔄' },
  userModel: { label: 'User Model', icon: '👤' },
  strategyLearning: { label: 'Strategy Learning', icon: '📈' },
  mentalModel: { label: 'Mental Model', icon: '🧠' },
  narrative: { label: 'Narrative', icon: '📖' },
  goalProposal: { label: 'Goal Proposal', icon: '🎯' },
  goalEscalation: { label: 'Goal Escalation', icon: '⬆' },
  normDetection: { label: 'Norm Detection', icon: '📏' },
  collectiveGoal: { label: 'Collective Goal', icon: '🤝' },
  retention: { label: 'Retention', icon: '💾' },
  cognitiveGoal: { label: 'Cognitive Goal', icon: '💡' },
};

const DURATION_FIELDS = new Set([
  'decayTimeConstant', 'staleStateTimeout', 'affiliationStaleDuration',
  'synthesisCooldown', 'expectedTickInterval', 'evictionTimeout',
  'beliefHalfLife', 'desireHalfLife', 'intentionHalfLife', 'inferenceCooldown',
  'quietPeriodBypass', 'staleAfter', 'cooldown', 'surfacingCooldown',
]);

@customElement('agency-social-cognition-view')
export class CognitionView extends PatternViewMixin(LitElement) {

  static override styles = [patternViewStyles, css`
    :host {
      --pattern-badge-color: rgba(245, 194, 231, 0.2);
      --pattern-badge-text: #f5c2e7;
    }
    .body { padding: 24px 16px; }
    .sections-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 10px;
    }
    .section-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .section-card.active {
      border-color: rgba(245, 194, 231, 0.25);
      background: rgba(245, 194, 231, 0.04);
    }
    .section-header {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-icon { font-size: 14px; }
    .section-name {
      font-size: 12px;
      font-weight: 600;
      color: #cdd6f4;
    }
    .section-status {
      margin-left: auto;
      font-size: 9px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .status-active {
      background: rgba(166, 227, 161, 0.15);
      color: #a6e3a1;
    }
    .status-inactive {
      background: rgba(255, 255, 255, 0.05);
      color: #585b70;
    }
    .config-fields {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 4px;
    }
    .config-field {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
    }
    .field-label {
      font-size: 10px;
      color: #7f849c;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .field-value {
      font-size: 10px;
      color: #cdd6f4;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      text-align: right;
    }
    .field-value.duration {
      color: #89b4fa;
    }
    .axis-weights {
      display: flex;
      flex-direction: column;
      gap: 3px;
      margin-top: 2px;
    }
    .axis-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .axis-name {
      font-size: 9px;
      color: #7f849c;
      min-width: 60px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .axis-bar {
      flex: 1;
      height: 4px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 2px;
      overflow: hidden;
    }
    .axis-fill {
      height: 100%;
      background: #f5c2e7;
      border-radius: 2px;
    }
    .axis-value {
      font-size: 9px;
      color: #cdd6f4;
      min-width: 24px;
      text-align: right;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .sub-section {
      margin-top: 4px;
      padding: 6px 8px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 4px;
    }
    .sub-section-label {
      font-size: 9px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 4px;
    }
    .summary {
      text-align: center;
      font-size: 11px;
      color: #7f849c;
      margin-top: 12px;
    }
    .no-cognition {
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
    const p = this.spec as SocialPatternCategory;
    return html`
      <div class="header">
        <span class="header-label">PATTERN</span>
        ${p.name ? html`<span class="header-name">${p.name}</span>` : nothing}
        <span class="type-badge">${p.type}</span>
        ${p.description ? html`<span class="header-desc">${p.description}</span>` : nothing}
      </div>
      <div class="body">
        ${p.cognition ? this.renderCognition(p.cognition) : html`<div class="no-cognition">No cognition configuration</div>`}
      </div>
    `;
  }

  private renderCognition(cognition: CognitionConfig): TemplateResult {
    const allKeys = Object.keys(SECTION_META);
    const activeCount = allKeys.filter(k => cognition[k as keyof CognitionConfig] != null).length;
    return html`
      <div class="sections-grid">
        ${allKeys.map(key => this.renderSection(key, cognition[key as keyof CognitionConfig]))}
      </div>
      <div class="summary">${activeCount} of ${allKeys.length} cognitive modules configured</div>
    `;
  }

  private renderSection(key: string, value: unknown): TemplateResult {
    const meta = SECTION_META[key] ?? { label: key, icon: '•' };
    const active = value != null;
    return html`
      <div class="section-card ${active ? 'active' : ''}">
        <div class="section-header">
          <span class="section-icon">${meta.icon}</span>
          <span class="section-name">${meta.label}</span>
          <span class="section-status ${active ? 'status-active' : 'status-inactive'}">${active ? 'on' : 'off'}</span>
        </div>
        ${active ? this.renderConfigDetail(key, value as Record<string, unknown>) : nothing}
      </div>
    `;
  }

  private renderConfigDetail(key: string, config: Record<string, unknown>): TemplateResult {
    const entries = Object.entries(config);
    if (entries.length === 0) return html``;

    const specialKeys = new Set(['axisWeights', 'baseline', 'synthesisGate', 'stageConfig']);
    const scalarEntries = entries.filter(([k]) => !specialKeys.has(k));
    const driveConfig = key === 'drive' ? config as DriveConfigSpec : null;
    const baseline = key === 'mood' && config.baseline ? config.baseline as Record<string, number> : null;
    const synthesisGate = key === 'narrative' && config.synthesisGate ? config.synthesisGate as Record<string, unknown> : null;

    return html`
      <div class="config-fields">
        ${scalarEntries.map(([k, v]) => this.renderField(k, v))}
      </div>
      ${driveConfig?.axisWeights ? this.renderAxisWeights(driveConfig.axisWeights) : nothing}
      ${baseline ? this.renderSubSection('Baseline', baseline) : nothing}
      ${synthesisGate ? this.renderSubSection('Synthesis Gate', synthesisGate) : nothing}
    `;
  }

  private renderField(key: string, value: unknown): TemplateResult {
    const isDuration = DURATION_FIELDS.has(key);
    const display = String(value);
    return html`
      <div class="config-field">
        <span class="field-label">${key}</span>
        <span class="field-value ${isDuration ? 'duration' : ''}">${display}</span>
      </div>
    `;
  }

  private renderAxisWeights(weights: Record<string, number>): TemplateResult {
    return html`
      <div class="axis-weights">
        ${Object.entries(weights).map(([axis, weight]) => html`
          <div class="axis-row">
            <span class="axis-name">${axis}</span>
            <div class="axis-bar">
              <div class="axis-fill" style="width: ${Math.min(weight * 100, 100)}%"></div>
            </div>
            <span class="axis-value">${weight}</span>
          </div>
        `)}
      </div>
    `;
  }

  private renderSubSection(label: string, obj: Record<string, unknown>): TemplateResult {
    return html`
      <div class="sub-section">
        <div class="sub-section-label">${label}</div>
        <div class="config-fields">
          ${Object.entries(obj).map(([k, v]) => this.renderField(k, v))}
        </div>
      </div>
    `;
  }
}
