import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { RoutingSpec, AgentRefSpec, GovernanceSpec, RoutingAgentStatus } from '@casehubio/mosaic-core';
import { patternViewStyles } from '../../shared-styles.js';
import '../../agent-card.js';

export type RoutingRendererFn = (
  routing: RoutingSpec,
  agents: AgentRefSpec[],
  agentStatuses?: Record<string, RoutingAgentStatus>,
) => TemplateResult;

const registry = new Map<string, RoutingRendererFn>();

export function registerRoutingRenderer(type: string, fn: RoutingRendererFn): void {
  registry.set(type, fn);
}

export { registry as routingRendererRegistry };

const STATUS_BORDERS: Record<RoutingAgentStatus, string> = {
  'selected': '#a6e3a1',
  'skipped': '#f9e2af',
  'not-evaluated': '#585b70',
  'excluded': '#f38ba8',
};

export function renderAgentWithStatus(
  agent: AgentRefSpec,
  statuses?: Record<string, RoutingAgentStatus>,
): TemplateResult {
  const status = agent.name && statuses?.[agent.name];
  const border = status ? `border-left: 3px solid ${STATUS_BORDERS[status]};` : '';
  const label = status ? ` — ${status}` : '';
  return html`
    <div data-agent-status=${status || 'none'}
         style="${border}"
         aria-label="agent ${agent.name ?? 'unnamed'}${label}">
      <agent-card .agent=${agent}></agent-card>
    </div>
  `;
}

function renderGenericLayout(
  _routing: RoutingSpec,
  agents: AgentRefSpec[],
  statuses?: Record<string, RoutingAgentStatus>,
): TemplateResult {
  return html`
    <div class="agents-grid">
      ${agents.map(a => renderAgentWithStatus(a, statuses))}
    </div>
  `;
}

function renderFirstMatch(
  routing: RoutingSpec,
  agents: AgentRefSpec[],
  statuses?: Record<string, RoutingAgentStatus>,
): TemplateResult {
  const r = routing as { type: 'first-match'; guard?: string };
  return html`
    ${r.guard ? html`
      <div class="guard-badge" aria-label="guard expression: ${r.guard}">
        <span class="guard-icon">⛁</span>
        <code class="guard-code">${r.guard}</code>
      </div>
    ` : nothing}
    <div class="candidate-list" role="list" aria-label="candidate agents, first match order">
      ${agents.map((a, i) => html`
        <div class="candidate-row" role="listitem">
          <div class="candidate-index">${i + 1}</div>
          <div class="candidate-arrow">→</div>
          ${renderAgentWithStatus(a, statuses)}
        </div>
      `)}
    </div>
  `;
}

registerRoutingRenderer('first-match', renderFirstMatch);

function renderRoundRobin(
  _routing: RoutingSpec,
  agents: AgentRefSpec[],
  statuses?: Record<string, RoutingAgentStatus>,
): TemplateResult {
  return html`
    <div data-rotation-indicator style="text-align: center; margin-bottom: 12px;">
      <span style="font-size: 20px; color: #fab387;">⟳</span>
      <span style="font-size: 11px; color: #7f849c; margin-left: 6px;">cycling assignment</span>
    </div>
    <div class="candidate-list" role="list" aria-label="round-robin cycle">
      ${agents.map((a, i) => html`
        <div class="candidate-row" role="listitem" data-cycle-position=${i + 1}>
          <div class="candidate-index">${i + 1}</div>
          <div class="candidate-arrow">→</div>
          ${renderAgentWithStatus(a, statuses)}
        </div>
      `)}
    </div>
  `;
}

function renderSequential(
  _routing: RoutingSpec,
  agents: AgentRefSpec[],
  statuses?: Record<string, RoutingAgentStatus>,
): TemplateResult {
  return html`
    <div style="margin-bottom: 8px;">
      <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 8px; border-radius: 4px; background: rgba(137, 180, 250, 0.15); color: #89b4fa;">one-shot</span>
    </div>
    <div class="candidate-list" role="list" aria-label="sequential chain">
      ${agents.map((a, i) => html`
        <div class="candidate-row" role="listitem" data-seq-step=${i + 1}>
          <div class="candidate-index">${i + 1}</div>
          <div class="candidate-arrow">${i < agents.length - 1 ? '→' : '⇥'}</div>
          ${renderAgentWithStatus(a, statuses)}
        </div>
      `)}
    </div>
  `;
}

function renderSelectAll(
  _routing: RoutingSpec,
  agents: AgentRefSpec[],
  statuses?: Record<string, RoutingAgentStatus>,
): TemplateResult {
  return html`
    <div data-fanout-hub style="text-align: center; margin-bottom: 12px;">
      <span style="display: inline-block; padding: 6px 16px; border: 2px solid #fab387; border-radius: 8px; font-size: 12px; font-weight: 600; color: #fab387;">dispatch all</span>
    </div>
    <div style="display: flex; justify-content: center; margin-bottom: 8px;">
      ${agents.map(() => html`<span style="color: #585b70; margin: 0 4px;">↓</span>`)}
    </div>
    <div class="agents-grid">
      ${agents.map(a => renderAgentWithStatus(a, statuses))}
    </div>
  `;
}

registerRoutingRenderer('round-robin', renderRoundRobin);
registerRoutingRenderer('sequential', renderSequential);
registerRoutingRenderer('select-all', renderSelectAll);

function renderLlmSelected(
  routing: RoutingSpec,
  agents: AgentRefSpec[],
  statuses?: Record<string, RoutingAgentStatus>,
): TemplateResult {
  const r = routing as { type: 'llm-selected'; model?: string; prompt?: string };
  return html`
    <div data-llm-node style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(203, 166, 247, 0.08); border: 1px solid rgba(203, 166, 247, 0.3); border-radius: 8px; margin-bottom: 12px;">
      <span style="font-size: 18px;">🧠</span>
      <div>
        <div style="font-size: 12px; font-weight: 600; color: #cba6f7;">LLM Selection</div>
        ${r.model ? html`<div style="font-size: 10px; color: #7f849c;">${r.model}</div>` : nothing}
      </div>
    </div>
    ${r.prompt ? html`
      <div style="font-size: 11px; font-style: italic; color: #a6adc8; padding: 6px 10px; background: rgba(255,255,255,0.02); border-radius: 4px; margin-bottom: 12px;">${r.prompt}</div>
    ` : nothing}
    <div style="display: flex; justify-content: center; margin-bottom: 8px;">
      <span style="color: #585b70;">↓</span>
    </div>
    <div class="agents-grid">
      ${agents.map(a => renderAgentWithStatus(a, statuses))}
    </div>
  `;
}

function renderCbrAgent(
  routing: RoutingSpec,
  agents: AgentRefSpec[],
  statuses?: Record<string, RoutingAgentStatus>,
): TemplateResult {
  const r = routing as { type: 'cbr-agent'; similarityThreshold?: number };
  const threshPct = r.similarityThreshold != null ? Math.round(r.similarityThreshold * 100) : null;
  return html`
    <div data-cbr-node style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(148, 226, 213, 0.08); border: 1px solid rgba(148, 226, 213, 0.3); border-radius: 8px; margin-bottom: 12px;">
      <span style="font-size: 18px;">📋</span>
      <div>
        <div style="font-size: 12px; font-weight: 600; color: #94e2d5;">Case-Based Reasoning</div>
        ${threshPct != null ? html`<div style="font-size: 10px; color: #7f849c;">similarity ≥ ${threshPct}%</div>` : nothing}
      </div>
    </div>
    <div style="display: flex; justify-content: center; margin-bottom: 8px;">
      <span style="color: #585b70;">↓</span>
    </div>
    <div class="agents-grid">
      ${agents.map(a => renderAgentWithStatus(a, statuses))}
    </div>
  `;
}

function renderDispositionAware(
  routing: RoutingSpec,
  agents: AgentRefSpec[],
  statuses?: Record<string, RoutingAgentStatus>,
): TemplateResult {
  const r = routing as { type: 'disposition-aware'; axes?: Array<{ axis: string; weight: number }> };
  const axes = r.axes ?? [];
  return html`
    ${axes.length > 0 ? html`
      <div style="margin-bottom: 12px;">
        <div style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #7f849c; margin-bottom: 6px;">Disposition Axes</div>
        ${axes.map(a => {
          const pct = Math.round(a.weight * 100);
          return html`
            <div data-axis-bar style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span style="font-size: 11px; color: #a6adc8; min-width: 120px;">${a.axis}</span>
              <div style="flex: 1; height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden;">
                <div style="height: 100%; width: ${pct}%; background: #f5c2e7; border-radius: 3px;"></div>
              </div>
              <span style="font-size: 10px; font-weight: 600; color: #f5c2e7; min-width: 30px;">${pct}%</span>
            </div>
          `;
        })}
      </div>
    ` : nothing}
    <div class="agents-grid">
      ${agents.map(a => renderAgentWithStatus(a, statuses))}
    </div>
  `;
}

registerRoutingRenderer('llm-selected', renderLlmSelected);
registerRoutingRenderer('cbr-agent', renderCbrAgent);
registerRoutingRenderer('disposition-aware', renderDispositionAware);

@customElement('agency-routing-strategy-view')
export class RoutingStrategyView extends LitElement {
  @property({ attribute: false }) routing!: RoutingSpec;
  @property({ attribute: false }) agents: AgentRefSpec[] = [];
  @property({ attribute: false }) governance?: GovernanceSpec;
  @property({ attribute: false }) agentStatuses?: Record<string, RoutingAgentStatus>;

  static override styles = [patternViewStyles, css`
    :host {
      margin-top: 16px;
    }
    .header {
      padding: 10px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    [data-strategy-badge] {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(250, 179, 135, 0.15);
      color: #fab387;
    }
    .body { padding: 16px; }
    .agents-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
      width: 100%;
    }
    .guard-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(148, 226, 213, 0.1);
      border: 1px solid rgba(148, 226, 213, 0.3);
      border-radius: 6px;
      margin-bottom: 12px;
    }
    .guard-icon { font-size: 14px; }
    .guard-code {
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
      color: #94e2d5;
    }
    .candidate-list { display: flex; flex-direction: column; gap: 8px; }
    .candidate-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .candidate-index {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(250, 179, 135, 0.15);
      color: #fab387;
      font-size: 11px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .candidate-arrow {
      color: #585b70;
      font-size: 12px;
      flex-shrink: 0;
    }
    .candidate-row > [data-agent-status] { flex: 1; min-width: 0; }
  `];

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this._updateAriaLabel();
  }

  override updated() {
    this._updateAriaLabel();
  }

  private _updateAriaLabel() {
    const type = this.routing?.type ?? 'unknown';
    this.setAttribute('aria-label', `routing strategy: ${type}`);
  }

  override render() {
    if (!this.routing) {
      return html`<div class="empty-state">No routing strategy configured</div>`;
    }

    const renderer = registry.get(this.routing.type) ?? renderGenericLayout;

    return html`
      <div class="header">
        <span data-strategy-badge>${this.routing.type}</span>
      </div>
      <div class="body">
        ${renderer(this.routing, this.agents, this.agentStatuses)}
        ${this._renderGovernancePolicy()}
      </div>
    `;
  }

  private _renderGovernancePolicy(): TemplateResult | typeof nothing {
    if (!this.governance?.trustRouting && !this.governance?.cbrRouting) return nothing;
    return html`
      <div class="policy-section" style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.06);">
        <div style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #7f849c; margin-bottom: 8px;">Routing Policy</div>
        ${this._renderTrustRouting()}
        ${this._renderCbrRouting()}
      </div>
    `;
  }

  private _renderTrustRouting(): TemplateResult | typeof nothing {
    const tr = this.governance?.trustRouting;
    if (!tr) return nothing;
    const threshPct = tr.threshold != null ? Math.round(tr.threshold * 100) : null;
    const marginPct = tr.borderlineMargin != null ? Math.round(tr.borderlineMargin * 100) : null;
    const blendPct = tr.blendFactor != null ? Math.round(tr.blendFactor * 100) : null;
    return html`
      <div class="trust-policy" style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 12px; color: #a6adc8; margin-bottom: 6px;">
        ${threshPct != null ? html`<span>Threshold: ${threshPct}%</span>` : nothing}
        ${marginPct != null ? html`<span>Margin: ±${marginPct}%</span>` : nothing}
        ${blendPct != null ? html`<span>Blend: ${blendPct}% trust + ${100 - blendPct}% workload</span>` : nothing}
        ${tr.minimumObservations != null ? html`<span>Min obs: ${tr.minimumObservations}</span>` : nothing}
      </div>
    `;
  }

  private _renderCbrRouting(): TemplateResult | typeof nothing {
    const cbr = this.governance?.cbrRouting;
    if (!cbr) return nothing;
    const weights = [
      { label: 'Success', value: cbr.successWeight },
      { label: 'Gate expired', value: cbr.gateExpiredWeight },
      { label: 'Gate rejected', value: cbr.gateRejectedWeight },
      { label: 'Failure', value: cbr.failureWeight },
    ].filter(w => w.value != null);
    if (weights.length === 0) return nothing;
    return html`
      <div class="cbr-policy" style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 12px; color: #a6adc8;">
        ${weights.map(w => html`<span>${w.label}: ${w.value!.toFixed(2)}</span>`)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-routing-strategy-view': RoutingStrategyView;
  }
}
