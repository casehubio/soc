import { LitElement, html, css, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { assignTiers, detectPreferredView } from './coordination-graph-model.js';
import type { TierElement, GraphTier, GraphConnector, GraphNode } from './coordination-graph-model.js';
import type {
  CoordinationPipeline,
  CoordinationStep,
  CoordinationStepParams,
  SwimLanes,
  MatchRouting,
  MatchCase,
  PhaseItem,
  DrillDownDetail,
} from './coordination-types.js';
import { parseExpression } from './coordination-types.js';

const ACTION_ICONS: Record<string, { icon: string; cssClass: string }> = {
  'agent-delegate': { icon: '⬡', cssClass: 'agent' },
  'rest': { icon: 'R', cssClass: 'rest' },
  'graphql': { icon: 'G', cssClass: 'graphql' },
  'mcp-call': { icon: 'M', cssClass: 'mcp' },
};

const PATTERN_STYLES: Record<string, { icon: string; cssClass: string }> = {
  approve: { icon: '✓', cssClass: 'approve' },
  escalate: { icon: '⚠', cssClass: 'warn' },
  reject: { icon: '✕', cssClass: 'reject' },
};

const COLOR_MAP: Record<string, string> = {
  green: '#a6e3a1',
  amber: '#f9e2af',
  red: '#f38ba8',
  blue: '#89b4fa',
  purple: '#cba6f7',
  peach: '#fab387',
  teal: '#94e2d5',
  pink: '#f5c2e7',
};

@customElement('coordination-pipeline-view')
export class CoordinationPipelineView extends LitElement {
  @property({ attribute: false }) pipeline!: CoordinationPipeline;
  @property() viewMode: 'lanes' | 'graph' = 'lanes';
  @property({ type: Boolean, attribute: 'focus-mode' }) focusMode = false;

  static override styles = css`
    :host {
      display: block;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      color: #cdd6f4;
      background: #282a3a;
      border: 1px solid #3b3d52;
      border-radius: 8px;
      overflow: hidden;
    }

    /* ─── Header ─── */
    .pipeline-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid #3b3d52;
    }
    .pipeline-header .icon {
      font-size: 14px;
      color: #89b4fa;
    }
    .pipeline-header .title {
      font-size: 12px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .pipeline-header .meta {
      margin-left: auto;
      font-size: 11px;
      color: #585b70;
    }

    /* ─── View Toggle ─── */
    .view-toggle {
      display: flex;
      gap: 0;
      margin-left: auto;
      margin-right: 8px;
    }
    .toggle-btn {
      padding: 3px 10px;
      font-size: 11px;
      font-weight: 500;
      border-radius: 4px;
      cursor: pointer;
      color: #585b70;
      background: rgba(255, 255, 255, 0.04);
      user-select: none;
    }
    .toggle-btn.active {
      color: #89b4fa;
      background: rgba(137, 180, 250, 0.12);
      font-weight: 600;
    }
    .toggle-btn:hover:not(.active) {
      color: #7f849c;
    }

    /* ─── Step Card ─── */
    .step-card {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 13px;
      transition: background 0.15s;
    }
    .step-card:hover {
      background: rgba(255, 255, 255, 0.07);
    }
    .step-card.drillable {
      cursor: pointer;
      border-left: 3px solid #fab387;
    }
    .step-icon {
      width: 22px;
      height: 22px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      flex-shrink: 0;
      font-weight: 600;
    }
    .step-icon.agent   { background: rgba(250, 179, 135, 0.15); color: #fab387; }
    .step-icon.rest    { background: rgba(137, 180, 250, 0.15); color: #89b4fa; }
    .step-icon.graphql { background: rgba(245, 194, 231, 0.15); color: #f5c2e7; }
    .step-icon.mcp     { background: rgba(203, 166, 247, 0.15); color: #cba6f7; }
    .step-icon.approve { background: rgba(166, 227, 161, 0.15); color: #a6e3a1; }
    .step-icon.reject  { background: rgba(243, 139, 168, 0.15); color: #f38ba8; }
    .step-icon.warn    { background: rgba(249, 226, 175, 0.15); color: #f9e2af; }
    .step-action {
      font-weight: 500;
      color: #cdd6f4;
    }
    .step-target {
      color: #7f849c;
      font-size: 12px;
    }
    .step-badges {
      margin-left: auto;
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .badge-model {
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 3px;
      background: rgba(137, 180, 250, 0.2);
      color: #89b4fa;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .badge-format {
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 3px;
      background: rgba(166, 227, 161, 0.2);
      color: #a6e3a1;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .badge-channel {
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 3px;
      background: rgba(203, 166, 247, 0.2);
      color: #cba6f7;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .drill-hint {
      font-size: 11px;
      color: #585b70;
    }

    /* ─── Params / Invoke Body ─── */
    .invoke-body {
      padding: 4px 12px;
      font-size: 12px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      line-height: 1.6;
    }
    .invoke-body .key {
      color: #89b4fa;
    }
    .invoke-body .value {
      color: #a6e3a1;
    }
    .expr {
      font-size: 11px;
      padding: 1px 5px;
      border-radius: 3px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .expr.from {
      background: rgba(250, 179, 135, 0.15);
      color: #fab387;
    }
    .expr.param {
      background: rgba(203, 166, 247, 0.15);
      color: #cba6f7;
    }
    .expr.literal {
      color: #a6e3a1;
    }

    /* ─── Focus Mode ─── */
    .step-card.dimmed {
      opacity: 0.25;
      pointer-events: none;
      transition: opacity 0.2s;
    }
    .focus-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(137, 180, 250, 0.15);
      color: #89b4fa;
      font-weight: 600;
    }

    /* ─── Barrier ─── */
    .barrier-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      border-top: 1px dashed #585b70;
      border-bottom: 1px dashed #585b70;
      background: rgba(255, 255, 255, 0.02);
    }
    .barrier-bar.signal {
      border-color: #cba6f7;
      background: rgba(203, 166, 247, 0.06);
    }
    .barrier-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }
    .barrier-bar.signal .barrier-label {
      color: #cba6f7;
    }
    .barrier-bar.quorum .barrier-label {
      color: #7f849c;
    }
    .barrier-name {
      font-size: 12px;
      color: #7f849c;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .barrier-line {
      flex: 1;
      border-top: 1px dashed #585b70;
    }
    .barrier-bar.signal .barrier-line {
      border-color: #cba6f7;
    }
    .barrier-detail {
      font-size: 11px;
      color: #585b70;
    }

    /* ─── Swim Lanes ─── */
    .swim-lanes {
      display: grid;
      gap: 0;
    }
    .swim-lane {
      padding: 16px;
      border-right: 1px solid rgba(255, 255, 255, 0.06);
      min-height: 120px;
    }
    .swim-lane:last-child {
      border-right: none;
    }
    .lane-name {
      font-size: 13px;
      font-weight: 600;
      color: #89b4fa;
      margin-bottom: 12px;
      padding-bottom: 4px;
      border-bottom: 2px solid #89b4fa;
      display: inline-block;
    }
    .lane-step {
      margin-bottom: 8px;
    }
    .lane-step .step-card {
      font-size: 12px;
    }
    .lane-step .badge-model,
    .lane-step .badge-format {
      font-size: 8px;
    }
    .lane-params {
      padding: 2px 12px;
      margin-bottom: 8px;
    }
    .lane-params .invoke-body {
      padding: 4px 0;
      font-size: 11px;
    }
    .lane-badges {
      font-size: 11px;
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      padding: 2px 12px;
      margin-bottom: 8px;
    }

    /* ─── Graph View ─── */
    .graph-view {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;
      padding: 24px 32px;
    }
    .graph-tier {
      display: flex;
      justify-content: center;
      gap: 16px;
      padding: 8px 0;
      flex-wrap: wrap;
    }
    .graph-node-wrapper {
      position: relative;
    }
    .graph-node-wrapper.decision-node .step-card {
      border: 2px solid #f9e2af;
    }
    .graph-node-wrapper.outcome-node.green .step-card {
      border-left: 3px solid #a6e3a1;
      background: rgba(166, 227, 161, 0.08);
    }
    .graph-node-wrapper.outcome-node.amber .step-card {
      border-left: 3px solid #f9e2af;
      background: rgba(249, 226, 175, 0.08);
    }
    .graph-node-wrapper.outcome-node.red .step-card {
      border-left: 3px solid #f38ba8;
      background: rgba(243, 139, 168, 0.08);
    }
    .extra-steps {
      display: block;
      text-align: center;
      font-size: 10px;
      color: #585b70;
      margin-top: 4px;
    }
    .graph-connector {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 4px 0;
      gap: 4px;
    }
    .connector-chevron {
      font-size: 10px;
      color: #585b70;
    }
    .fan-out-labels {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    .edge-label {
      font-size: 10px;
      color: #7f849c;
      padding: 2px 8px;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 3px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .graph-quorum {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      background: rgba(137, 180, 250, 0.06);
      border: 1px dashed #89b4fa;
      border-radius: 4px;
    }
    .quorum-label {
      font-size: 11px;
      font-weight: 600;
      color: #89b4fa;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .quorum-detail {
      font-size: 11px;
      color: #585b70;
    }
    .graph-signal {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px;
    }
    .signal-label {
      font-size: 11px;
      font-weight: 600;
      color: #cba6f7;
    }
    .signal-desc {
      font-size: 11px;
      color: #585b70;
    }

    /* ─── Phase wrapper ─── */
    .phase-step {
      padding: 16px;
    }

    /* ─── Match/Case Routing ─── */
    .control-block {
      margin: 12px 0 0;
    }
    .control-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px 6px 0 0;
      font-size: 12px;
    }
    .keyword {
      font-weight: 600;
      color: #cba6f7;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }
    .condition {
      color: #f9e2af;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 11px;
    }
    .match-cases {
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-top: none;
      border-radius: 0 0 6px 6px;
      overflow: hidden;
    }
    .match-case {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .match-case:last-child {
      border-bottom: none;
    }
    .match-pattern {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 12px;
      color: #a6e3a1;
      min-width: 80px;
    }
    .match-arrow {
      color: #585b70;
    }
    .match-case .step-card {
      flex: 1;
      margin: 0;
    }
  `;

  override willUpdate(changed: PropertyValues) {
    if (changed.has('pipeline') && this.pipeline) {
      this.viewMode = detectPreferredView(this.pipeline.phases);
    }
  }

  override render() {
    if (!this.pipeline) return nothing;
    const p = this.pipeline;
    return html`
      ${this.renderHeader(p)}
      ${this.viewMode === 'graph' ? this.renderGraphView(p) : this.renderLanesView(p)}
    `;
  }

  private renderLanesView(p: CoordinationPipeline): TemplateResult {
    return html`${p.phases.map(phase => this.renderPhase(phase))}`;
  }

  private renderGraphView(p: CoordinationPipeline): TemplateResult {
    const elements = assignTiers(p.phases);
    return html`
      <div class="graph-view" role="img" aria-label="Pipeline topology: ${p.name}">
        ${elements.map(el => el.kind === 'tier'
          ? this._renderGraphTier(el)
          : this._renderGraphConnector(el)
        )}
      </div>
    `;
  }

  private _renderGraphTier(tier: GraphTier): TemplateResult {
    return html`
      <div class="graph-tier">
        ${tier.nodes.map(node => this._renderGraphNode(node))}
      </div>
    `;
  }

  private _renderGraphNode(node: GraphNode): TemplateResult {
    const colorClass = node.colorHint ? ` outcome-node ${node.colorHint}` : '';
    const decisionClass = node.routing ? ' decision-node' : '';
    const drillCtx = node.laneName ? { name: node.laneName, steps: node.laneSteps ?? [node.step] } : { name: node.step.target ?? node.step.action, steps: [node.step] };
    return html`
      <div class="graph-node-wrapper${colorClass}${decisionClass}">
        ${this.renderStepCard(node.step, drillCtx)}
        ${node.extraStepCount
          ? html`<span class="extra-steps">+${node.extraStepCount} more</span>`
          : nothing}
      </div>
    `;
  }

  private _renderGraphConnector(connector: GraphConnector): TemplateResult {
    return html`
      <div class="graph-connector ${connector.type}">
        ${connector.type === 'flow' && connector.barrier
          ? this._renderGraphBarrier(connector.barrier)
          : connector.type === 'fan-out'
            ? html`
                <span class="connector-chevron">▼</span>
                ${connector.barrier ? this._renderGraphBarrier(connector.barrier) : nothing}
                <div class="fan-out-labels">
                  ${connector.labels?.map(l => html`<span class="edge-label">${l}</span>`)}
                </div>
              `
            : connector.type === 'fan-in'
              ? html`
                  ${connector.barrier ? this._renderGraphBarrier(connector.barrier) : nothing}
                  <span class="connector-chevron">▼</span>
                `
              : html`<span class="connector-chevron">▼</span>`
        }
      </div>
    `;
  }

  private _renderGraphBarrier(barrier: NonNullable<GraphConnector['barrier']>): TemplateResult {
    if (barrier.type === 'quorum') {
      return html`
        <div class="graph-quorum">
          <span class="quorum-label">QUORUM</span>
          <span class="quorum-detail">${barrier.required} of ${barrier.of} required</span>
        </div>
      `;
    }
    return html`
      <div class="graph-signal">
        <span class="signal-label">◇ ${barrier.name}</span>
        ${barrier.description ? html`<span class="signal-desc">${barrier.description}</span>` : nothing}
      </div>
    `;
  }

  private _handleToggleKey(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      this.viewMode = this.viewMode === 'lanes' ? 'graph' : 'lanes';
    }
  }

  private renderHeader(p: CoordinationPipeline): TemplateResult {
    const parts: string[] = [];
    if (p.agentCount != null) parts.push(`${p.agentCount} agents`);
    if (p.barrierCount != null) parts.push(`${p.barrierCount} barriers`);
    if (p.channelCount != null) parts.push(`${p.channelCount} channel${p.channelCount !== 1 ? 's' : ''}`);
    return html`
      <div class="pipeline-header">
        <span class="icon">⫘</span>
        <span class="title">${p.name}</span>
        <div class="view-toggle" role="radiogroup" aria-label="View mode">
          <span role="radio" aria-checked="${this.viewMode === 'lanes'}"
                class="toggle-btn ${this.viewMode === 'lanes' ? 'active' : ''}"
                @click="${() => { this.viewMode = 'lanes'; }}"
                tabindex="${this.viewMode === 'lanes' ? '0' : '-1'}"
                @keydown="${this._handleToggleKey}">Lanes</span>
          <span role="radio" aria-checked="${this.viewMode === 'graph'}"
                class="toggle-btn ${this.viewMode === 'graph' ? 'active' : ''}"
                @click="${() => { this.viewMode = 'graph'; }}"
                tabindex="${this.viewMode === 'graph' ? '0' : '-1'}"
                @keydown="${this._handleToggleKey}">Graph</span>
        </div>
        ${this.focusMode ? html`<span class="focus-badge">🔍 LLM Logic</span>` : nothing}
        ${parts.length > 0
          ? html`<span class="meta">${parts.join(' · ')}</span>`
          : nothing}
      </div>
    `;
  }

  private renderPhase(phase: PhaseItem): TemplateResult {
    switch (phase.type) {
      case 'step':
        return html`
          <div class="phase-step">
            ${this.renderStepCard(phase, { name: phase.target ?? phase.action, steps: [phase] })}
            ${phase.params ? this.renderParams(phase.params) : nothing}
            ${phase.routing ? this.renderMatchRouting(phase.routing) : nothing}
          </div>
        `;
      case 'signal':
        return this.renderBarrier(phase);
      case 'quorum':
        return this.renderBarrier(phase);
      case 'parallel':
        return this.renderSwimLanes(phase.lanes);
    }
  }

  private renderStepCard(step: CoordinationStep, drillContext?: { name: string; steps: CoordinationStep[] }, matchPattern?: string): TemplateResult {
    const actionDef = ACTION_ICONS[step.action] ?? { icon: '•', cssClass: 'default' };
    const patternStyle = matchPattern ? PATTERN_STYLES[matchPattern] : undefined;
    const iconClass = patternStyle?.cssClass ?? actionDef.cssClass;
    const iconChar = patternStyle?.icon ?? actionDef.icon;

    const canDrill = step.action === 'agent-delegate' && drillContext != null;
    const isDimmed = this.focusMode && step.action !== 'agent-delegate';
    const drillClick = canDrill ? () => this._emitDrillDown(drillContext.name, drillContext.steps) : undefined;
    const drillKey = canDrill ? (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._emitDrillDown(drillContext.name, drillContext.steps); }
    } : undefined;

    return html`
      <div class="step-card${canDrill ? ' drillable' : ''}${isDimmed ? ' dimmed' : ''}"
           role="${canDrill ? 'button' : nothing}"
           tabindex="${canDrill ? '0' : nothing}"
           @click="${drillClick ?? nothing}"
           @keydown="${drillKey ?? nothing}">
        <div class="step-icon ${iconClass}">${iconChar}</div>
        <span class="step-action">${step.action}</span>
        ${step.target
          ? html`<span class="step-target">${step.target}</span>`
          : nothing}
        <span class="step-badges">
          ${step.model ? html`<span class="badge-model">${step.model}</span>` : nothing}
          ${step.outputFormat ? html`<span class="badge-format">${step.outputFormat}</span>` : nothing}
          ${step.channel ? html`<span class="badge-channel">→ ${step.channel}</span>` : nothing}
          ${canDrill ? html`<span class="drill-hint">↗ drill down</span>` : nothing}
        </span>
      </div>
    `;
  }

  private _emitDrillDown(agentName: string, steps: CoordinationStep[]) {
    this.dispatchEvent(new CustomEvent('coordination:drill-down', {
      bubbles: true,
      composed: true,
      detail: { agentName, steps } satisfies DrillDownDetail,
    }));
  }

  private renderParams(params: CoordinationStepParams): TemplateResult {
    return html`
      <div class="invoke-body">
        ${Object.entries(params).map(([key, val]) => {
          const expr = parseExpression(val);
          return html`
            <div>
              <span class="key">${key}:</span>
              ${expr.type === 'literal'
                ? html`<span class="value">"${val}"</span>`
                : html`<span class="expr ${expr.type}">${val}</span>`}
            </div>
          `;
        })}
      </div>
    `;
  }

  private renderBarrier(phase: Extract<PhaseItem, { type: 'signal' }> | Extract<PhaseItem, { type: 'quorum' }>): TemplateResult {
    const isSignal = phase.type === 'signal';
    const label = isSignal ? '◇ signal' : '▮ quorum';
    const detail = phase.type === 'quorum'
      ? `required: ${phase.required} of ${phase.of}`
      : phase.description ?? '';

    return html`
      <div class="barrier-bar ${phase.type}">
        <span class="barrier-label">${label}</span>
        <span class="barrier-name">${phase.name}</span>
        <div class="barrier-line"></div>
        ${detail ? html`<span class="barrier-detail">${detail}</span>` : nothing}
      </div>
    `;
  }

  private renderSwimLanes(lanes: SwimLanes): TemplateResult {
    const entries = Object.entries(lanes);
    const cols = entries.length;
    return html`
      <div class="swim-lanes" style="grid-template-columns: ${'1fr '.repeat(cols).trim()}">
        ${entries.map(([name, steps]) => this.renderLane(name, steps))}
      </div>
    `;
  }

  private renderLane(name: string, steps: CoordinationStep[]): TemplateResult {
    return html`
      <div class="swim-lane">
        <div class="lane-name">${name}</div>
        ${steps.map(step => html`
          <div class="lane-step">
            ${this.renderStepCard(step, { name, steps })}
            ${step.params ? html`
              <div class="lane-params">
                <div class="invoke-body">
                  ${Object.entries(step.params).map(([key, val]) => {
                    const expr = parseExpression(val);
                    return html`
                      <div>
                        <span class="key">${key}:</span>
                        ${expr.type === 'literal'
                          ? html`<span class="value">"${val}"</span>`
                          : html`<span class="expr ${expr.type}">${val}</span>`}
                      </div>
                    `;
                  })}
                </div>
              </div>
            ` : nothing}
          </div>
        `)}
      </div>
    `;
  }

  private renderMatchRouting(routing: MatchRouting): TemplateResult {
    return html`
      <div class="control-block">
        <div class="control-header">
          <span class="keyword">match</span>
          <span class="condition">${routing.expression}</span>
        </div>
        <div class="match-cases">
          ${routing.cases.map(c => this.renderMatchCase(c))}
        </div>
      </div>
    `;
  }

  private renderMatchCase(c: MatchCase): TemplateResult {
    return html`
      <div class="match-case">
        <span class="match-pattern">"${c.pattern}"</span>
        <span class="match-arrow">→</span>
        ${this.renderStepCard(c.step, undefined, c.pattern)}
      </div>
    `;
  }
}
