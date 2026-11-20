import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { AgentDescriptor } from './agent-types.js';
import type { PatternCategory } from '@casehubio/mosaic-core';
import type { CoordinationStep } from './coordination-types.js';
import './eidos-view.js';
import './views/deliberation/voting-view.js';
import './views/deliberation/debate-view.js';
import './views/base-pattern-view.js';
import './views/playbook-spec-view.js';
import './views/orchestration/supervisor-view.js';
import './views/orchestration/choreography-view.js';
import './views/orchestration/saga-view.js';
import './views/orchestration/decomposition-view.js';
import './views/deliberation/negotiation-view.js';
import './views/deliberation/coalition-view.js';
import './views/deliberation/normative-view.js';
import './views/governance/judgment-view.js';
import './views/perception/summarisation-view.js';
import './views/perception/observation-view.js';
import './views/perception/narrative-view.js';
import './views/optimisation/prompt-optimisation-view.js';
import './views/social/cognition-view.js';
import './views/social/memory-hygiene-view.js';

export type AgentTab = 'eidos' | 'pattern' | 'steps';

export interface BreadcrumbBackDetail {
  index: number;
  segment: string;
}

export interface AgentViewerData {
  agent: AgentDescriptor;
  spec?: PatternCategory;
  breadcrumb?: string[];
  steps?: CoordinationStep[];
}

@customElement('agent-viewer')
export class AgentViewer extends LitElement {
  @property({ attribute: false }) data!: AgentViewerData;
  @state() private activeTab: AgentTab = 'eidos';

  static override styles = css`
    :host {
      display: block;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      color: #cdd6f4;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 0;
      font-size: 12px;
      color: #7f849c;
      margin-bottom: 8px;
    }
    .breadcrumb-segment {
      color: #7f849c;
      cursor: pointer;
      transition: color 0.15s;
    }
    .breadcrumb-segment:hover {
      color: #89b4fa;
    }
    .breadcrumb-current {
      color: #cdd6f4;
      font-weight: 500;
    }
    .breadcrumb-sep {
      color: #585b70;
      font-size: 10px;
    }

    .tab-bar {
      display: flex;
      gap: 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      margin-bottom: 16px;
    }
    .tab {
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 500;
      color: #7f849c;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: color 0.15s, border-color 0.15s;
      user-select: none;
    }
    .tab:hover {
      color: #bac2de;
    }
    .tab.active {
      color: #89b4fa;
      border-bottom-color: #89b4fa;
    }
    .tab.disabled {
      color: #45475a;
      cursor: not-allowed;
    }

    .tab-content {
      min-height: 100px;
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 120px;
      color: #585b70;
      font-size: 12px;
      font-style: italic;
    }

    /* ─── Step Cards (Steps tab) ─── */
    .steps-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .step-card {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 13px;
    }
    .step-icon {
      width: 22px; height: 22px; border-radius: 4px;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; flex-shrink: 0; font-weight: 600;
    }
    .step-icon.agent   { background: rgba(250, 179, 135, 0.15); color: #fab387; }
    .step-icon.rest    { background: rgba(137, 180, 250, 0.15); color: #89b4fa; }
    .step-icon.graphql { background: rgba(245, 194, 231, 0.15); color: #f5c2e7; }
    .step-icon.mcp     { background: rgba(203, 166, 247, 0.15); color: #cba6f7; }
    .step-icon.approve { background: rgba(166, 227, 161, 0.15); color: #a6e3a1; }
    .step-icon.reject  { background: rgba(243, 139, 168, 0.15); color: #f38ba8; }
    .step-icon.warn    { background: rgba(249, 226, 175, 0.15); color: #f9e2af; }
    .step-action { font-weight: 500; color: #cdd6f4; }
    .step-target { color: #7f849c; font-size: 12px; }
    .step-badges { margin-left: auto; display: flex; gap: 6px; align-items: center; }
    .badge-model {
      font-size: 9px; padding: 1px 6px; border-radius: 3px;
      background: rgba(137, 180, 250, 0.2); color: #89b4fa;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .badge-format {
      font-size: 9px; padding: 1px 6px; border-radius: 3px;
      background: rgba(166, 227, 161, 0.2); color: #a6e3a1;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .badge-channel {
      font-size: 9px; padding: 1px 6px; border-radius: 3px;
      background: rgba(203, 166, 247, 0.2); color: #cba6f7;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
  `;

  override render() {
    if (!this.data) return nothing;
    return html`
      ${this.renderBreadcrumb()}
      ${this.renderTabBar()}
      <div class="tab-content">
        ${this.renderActiveTab()}
      </div>
    `;
  }

  private renderBreadcrumb(): TemplateResult | typeof nothing {
    const bc = this.data.breadcrumb;
    if (!bc?.length) return nothing;
    const segments = bc.slice(0, -1);
    const current = bc[bc.length - 1];
    return html`
      <nav class="breadcrumb" role="navigation" aria-label="Breadcrumb">
        ${segments.map((s, i) => html`
          <span class="breadcrumb-segment" role="link" tabindex="0"
                @click="${() => this._emitBreadcrumbBack(i, s)}"
                @keydown="${(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._emitBreadcrumbBack(i, s); } }}">${s}</span>
          <span class="breadcrumb-sep" aria-hidden="true">›</span>
        `)}
        <span class="breadcrumb-current" aria-current="page">${current}</span>
      </nav>
    `;
  }

  private _emitBreadcrumbBack(index: number, segment: string) {
    this.dispatchEvent(new CustomEvent('viewer:breadcrumb-back', {
      bubbles: true,
      composed: true,
      detail: { index, segment },
    }));
  }

  private renderTabBar(): TemplateResult {
    const hasPattern = !!this.data.spec;
    const hasSteps = !!this.data.steps?.length;
    return html`
      <div class="tab-bar" role="tablist">
        <div class="tab ${this.activeTab === 'eidos' ? 'active' : ''}" role="tab"
             aria-selected="${this.activeTab === 'eidos'}"
             @click=${() => this.selectTab('eidos')}>Eidos</div>
        <div class="tab ${this.activeTab === 'pattern' ? 'active' : ''} ${hasPattern ? '' : 'disabled'}" role="tab"
             aria-selected="${this.activeTab === 'pattern'}"
             @click=${() => hasPattern && this.selectTab('pattern')}>Pattern</div>
        ${hasSteps ? html`
          <div class="tab ${this.activeTab === 'steps' ? 'active' : ''}" role="tab"
               aria-selected="${this.activeTab === 'steps'}"
               @click=${() => this.selectTab('steps')}>Steps</div>
        ` : nothing}
      </div>
    `;
  }

  private selectTab(tab: AgentTab): void {
    this.activeTab = tab;
  }

  private renderActiveTab(): TemplateResult {
    switch (this.activeTab) {
      case 'eidos':
        return html`<eidos-view .agent=${this.data.agent}></eidos-view>`;
      case 'pattern':
        return this.renderPattern();
      case 'steps':
        return this._renderSteps();
    }
  }

  private _renderSteps(): TemplateResult {
    const steps = this.data.steps;
    if (!steps?.length) return html`<div class="empty-state">No steps data available</div>`;
    return html`
      <div class="steps-list">
        ${steps.map(step => this._renderStepCard(step))}
      </div>
    `;
  }

  private _renderStepCard(step: CoordinationStep): TemplateResult {
    const ACTION_ICONS: Record<string, { icon: string; cssClass: string }> = {
      'agent-delegate': { icon: '⬡', cssClass: 'agent' },
      'rest': { icon: 'R', cssClass: 'rest' },
      'graphql': { icon: 'G', cssClass: 'graphql' },
      'mcp-call': { icon: 'M', cssClass: 'mcp' },
    };
    const actionDef = ACTION_ICONS[step.action] ?? { icon: '•', cssClass: 'default' };
    const iconClass = actionDef.cssClass;
    const iconChar = actionDef.icon;
    return html`
      <div class="step-card">
        <div class="step-icon ${iconClass}">${iconChar}</div>
        <span class="step-action">${step.action}</span>
        ${step.target ? html`<span class="step-target">${step.target}</span>` : nothing}
        <span class="step-badges">
          ${step.model ? html`<span class="badge-model">${step.model}</span>` : nothing}
          ${step.outputFormat ? html`<span class="badge-format">${step.outputFormat}</span>` : nothing}
          ${step.channel ? html`<span class="badge-channel">→ ${step.channel}</span>` : nothing}
        </span>
      </div>
    `;
  }

  private renderPattern(): TemplateResult {
    const spec = this.data.spec;
    if (!spec) return html`<div class="empty-state">No pattern data available</div>`;
    switch (spec.category) {
      case 'orchestration':
        switch (spec.type) {
          case 'supervisor':
            return html`<agency-orchestration-supervisor-view .spec=${spec}></agency-orchestration-supervisor-view>`;
          case 'choreography':
            return html`<agency-orchestration-choreography-view .spec=${spec}></agency-orchestration-choreography-view>`;
          case 'saga':
            return html`<agency-orchestration-saga-view .spec=${spec}></agency-orchestration-saga-view>`;
          case 'decomposition':
            return html`<agency-orchestration-decomposition-view .spec=${spec}></agency-orchestration-decomposition-view>`;
          default: return html`<agency-base-pattern-view .spec=${spec}></agency-base-pattern-view>`;
        }
      case 'deliberation':
        switch (spec.type) {
          case 'voting':
            return html`<agency-deliberation-voting-view .spec=${spec}></agency-deliberation-voting-view>`;
          case 'debate':
            return html`<agency-deliberation-debate-view .spec=${spec}></agency-deliberation-debate-view>`;
          case 'negotiation':
            return html`<agency-deliberation-negotiation-view .spec=${spec}></agency-deliberation-negotiation-view>`;
          case 'coalition':
            return html`<agency-deliberation-coalition-view .spec=${spec}></agency-deliberation-coalition-view>`;
          case 'normative':
            return html`<agency-deliberation-normative-view .spec=${spec}></agency-deliberation-normative-view>`;
          default: return html`<agency-base-pattern-view .spec=${spec}></agency-base-pattern-view>`;
        }
      case 'perception':
        switch (spec.type) {
          case 'summarisation':
            return html`<agency-perception-summarisation-view .spec=${spec}></agency-perception-summarisation-view>`;
          case 'observation':
            return html`<agency-perception-observation-view .spec=${spec}></agency-perception-observation-view>`;
          case 'narrative':
            return html`<agency-perception-narrative-view .spec=${spec}></agency-perception-narrative-view>`;
          default: return html`<agency-base-pattern-view .spec=${spec}></agency-base-pattern-view>`;
        }
      case 'communication':
        switch (spec.type) {
          case 'channel-execution':
          case 'channel-summary':
            return html`<agency-base-pattern-view .spec=${spec}></agency-base-pattern-view>`;
          default: return html`<agency-base-pattern-view .spec=${spec}></agency-base-pattern-view>`;
        }
      case 'governance':
        switch (spec.type) {
          case 'judgment':
            return html`<agency-governance-judgment-view .spec=${spec}></agency-governance-judgment-view>`;
          case 'oversight':
          case 'attestation':
          case 'trust':
            return html`<agency-base-pattern-view .spec=${spec}></agency-base-pattern-view>`;
          default: return html`<agency-base-pattern-view .spec=${spec}></agency-base-pattern-view>`;
        }
      case 'optimisation':
        switch (spec.type) {
          case 'prompt-optimisation':
            return html`<agency-optimisation-prompt-view .spec=${spec}></agency-optimisation-prompt-view>`;
          default: return html`<agency-base-pattern-view .spec=${spec}></agency-base-pattern-view>`;
        }
      case 'social':
        switch (spec.type) {
          case 'cognition':
            return html`<agency-social-cognition-view .spec=${spec}></agency-social-cognition-view>`;
          case 'memory-hygiene':
            return html`<agency-social-memory-hygiene-view .spec=${spec}></agency-social-memory-hygiene-view>`;
          case 'reflection':
            return html`<agency-base-pattern-view .spec=${spec}></agency-base-pattern-view>`;
          default: return html`<agency-base-pattern-view .spec=${spec}></agency-base-pattern-view>`;
        }
      case 'playbook':
        return html`<agency-playbook-spec-view .spec=${spec}></agency-playbook-spec-view>`;
      default: return html`<agency-base-pattern-view .spec=${spec as any}></agency-base-pattern-view>`;
    }
  }
}
