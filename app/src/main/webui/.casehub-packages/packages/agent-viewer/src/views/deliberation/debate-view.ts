import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { DeliberationPatternCategory } from '@casehubio/mosaic-core';
import { PatternViewMixin, patternViewStyles } from '../../shared-styles.js';
import '../../agent-card.js';

@customElement('agency-deliberation-debate-view')
export class DebateView extends PatternViewMixin(LitElement) {

  static override styles = [patternViewStyles, css`
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
    .header-desc {
      margin-left: auto;
      font-size: 11px;
      color: #7f849c;
      max-width: 400px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .body { padding: 16px; }
    .section-label {
      font-size: 10px;
      font-weight: 600;
      color: #7f849c;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .debaters {
      display: flex;
      justify-content: center;
      gap: 32px;
      margin-bottom: 16px;
      align-items: center;
    }
    .debater-slot { text-align: center; }
    .debater-card {
      border-radius: 8px;
      padding: 10px 16px;
      margin-bottom: 4px;
      text-align: center;
    }
    .debater-icon {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      background: rgba(250, 179, 135, 0.15);
      color: #fab387;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      margin: 0 auto 4px;
    }
    .debater-name {
      font-size: 12px;
      font-weight: 500;
      color: #cdd6f4;
    }
    .debater-role { font-size: 10px; }
    .versus {
      font-size: 20px;
      color: #7f849c;
    }
    .rounds {
      display: grid;
      gap: 6px;
      max-width: 500px;
      margin: 0 auto 12px;
    }
    .round-entry {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 6px;
      border-left: 3px solid;
    }
    .round-label {
      font-size: 10px;
      font-weight: 600;
      color: #7f849c;
      min-width: 50px;
    }
    .round-speaker {
      font-size: 12px;
      font-weight: 500;
    }
    .round-capability {
      font-size: 10px;
      color: #7f849c;
      font-style: italic;
    }
    .rounds-ellipsis {
      text-align: center;
      font-size: 11px;
      color: #7f849c;
      padding: 4px;
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
    .judge-section {
      display: flex;
      justify-content: center;
      margin: 12px 0;
    }
    .judge-card {
      background: rgba(249, 226, 175, 0.08);
      border: 2px solid #f9e2af;
      border-radius: 8px;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .judge-icon { font-size: 18px; }
    .judge-label {
      font-size: 12px;
      font-weight: 600;
      color: #f9e2af;
    }
    .judge-detail {
      font-size: 11px;
      color: #7f849c;
    }
    .judge-model {
      font-size: 9px;
      padding: 1px 6px;
      border-radius: 3px;
      background: rgba(137, 180, 250, 0.15);
      color: #89b4fa;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
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
  `];

  override render() {
    const p = this.spec as DeliberationPatternCategory;
    if (!p) return nothing;
    return html`
      <div class="header">
        <span class="header-label">PATTERN</span>
        ${p.name ? html`<span class="header-name">${p.name}</span>` : nothing}
        <span class="type-badge">${p.type}</span>
        ${p.description ? html`<span class="header-desc">${p.description}</span>` : nothing}
      </div>
      <div class="body">
        ${this.renderDebaters()}
        ${this.renderRounds()}
        ${this.renderFlowIndicator()}
        ${this.renderJudge()}
        ${this.renderMetadata()}
      </div>
    `;
  }

  private static readonly DEBATER_COLORS = ['#89b4fa', '#a6e3a1'] as const;
  private static readonly DEBATER_BGS = [
    'rgba(137,180,250,0.08)', 'rgba(166,227,161,0.08)'
  ] as const;
  private static readonly DEBATER_BORDERS = [
    'rgba(137,180,250,0.3)', 'rgba(166,227,161,0.3)'
  ] as const;

  private renderDebaters(): TemplateResult | typeof nothing {
    const agents = (this.spec as DeliberationPatternCategory).agents ?? [];
    if (agents.length === 0) return nothing;
    if (agents.length === 2) {
      return html`
        <div class="debaters">
          ${this.renderDebaterSlot(agents[0]!, 0)}
          <div class="versus">⇌</div>
          ${this.renderDebaterSlot(agents[1]!, 1)}
        </div>
      `;
    }
    return html`
      <div class="section-label">Agents</div>
      <div style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;margin-bottom:16px">
        ${agents.map(a => html`<agent-card .agent=${a}></agent-card>`)}
      </div>
    `;
  }

  private renderDebaterSlot(agent: import('@casehubio/mosaic-core').AgentRef, index: number): TemplateResult {
    const color = DebateView.DEBATER_COLORS[index] ?? '#7f849c';
    const bg = DebateView.DEBATER_BGS[index] ?? 'transparent';
    const border = DebateView.DEBATER_BORDERS[index] ?? 'transparent';
    return html`
      <div class="debater-slot">
        <div class="debater-card" style="background:${bg};border:1px solid ${border}">
          <div class="debater-icon">⬡</div>
          <div class="debater-name">${agent.name}</div>
        </div>
        ${agent.description
          ? html`<div class="debater-role" style="color:${color}">${agent.description}</div>`
          : nothing}
      </div>
    `;
  }

  private static readonly ROUND_ACTIONS: string[][] = [
    ['presents initial position', 'presents counter-position'],
    ['rebuts with evidence', 'concedes partial point'],
    ['refines argument', 'synthesises common ground'],
  ];

  private renderRounds(): TemplateResult | typeof nothing {
    const agents = (this.spec as DeliberationPatternCategory).agents ?? [];
    const maxRounds = (this.spec as DeliberationPatternCategory).maxRounds;
    if (agents.length < 2 || !maxRounds) return nothing;
    const previewRounds = Math.min(maxRounds, 3);
    const entries: TemplateResult[] = [];
    for (let r = 1; r <= previewRounds; r++) {
      for (let a = 0; a < agents.length; a++) {
        const agent = agents[a]!;
        const color = DebateView.DEBATER_COLORS[a] ?? '#7f849c';
        const action = DebateView.ROUND_ACTIONS[r - 1]?.[a] ?? '';
        entries.push(html`
          <div class="round-entry" style="border-left-color:${color}">
            <span class="round-label">Round ${r}</span>
            <span class="round-speaker" style="color:${color}">${agent.name}</span>
            ${action ? html`<span class="round-capability">${action}</span>` : nothing}
          </div>
        `);
      }
    }
    const termDesc = (this.spec as DeliberationPatternCategory).termination?.find(t => t.type === 'all-agreed')
      ? 'convergence' : 'completion';
    return html`
      <div class="rounds">${entries}</div>
      ${maxRounds > previewRounds
        ? html`<div class="rounds-ellipsis">⋮ until ${termDesc} or max ${maxRounds} rounds</div>`
        : nothing}
    `;
  }

  private renderFlowIndicator(): TemplateResult | typeof nothing {
    if (!(this.spec as DeliberationPatternCategory).judge) return nothing;
    return html`
      <div class="flow-indicator">
        <div class="flow-line"></div>
        <span class="flow-arrow">▼</span>
      </div>
    `;
  }

  private renderJudge(): TemplateResult | typeof nothing {
    const j = (this.spec as DeliberationPatternCategory).judge;
    if (!j) return nothing;
    return html`
      <div class="judge-section">
        <div class="judge-card">
          <span class="judge-icon">⚖</span>
          <div>
            <div class="judge-label">${j.name}</div>
            ${j.description ? html`<div class="judge-detail">${j.description}</div>` : nothing}
          </div>
          ${j.model ? html`<span class="judge-model">${j.model}</span>` : nothing}
        </div>
      </div>
    `;
  }

  private renderMetadata(): TemplateResult | typeof nothing {
    const p = (this.spec as DeliberationPatternCategory);
    const cards: TemplateResult[] = [];
    if (p.maxRounds) {
      cards.push(html`
        <div class="meta-card">
          <div class="section-label">Max Rounds</div>
          <div class="meta-type">${p.maxRounds}</div>
        </div>
      `);
    }
    if (p.termination?.length) {
      cards.push(html`
        <div class="meta-card">
          <div class="section-label">Termination</div>
          ${p.termination.map(t => html`
            <div class="meta-type">${t.type}</div>
          `)}
        </div>
      `);
    }
    if (p.failurePolicy) {
      const fp = p.failurePolicy;
      cards.push(html`
        <div class="meta-card">
          <div class="section-label">Failure Policy</div>
          ${fp.onRoutingFailure ? html`<div class="meta-detail">routing: ${fp.onRoutingFailure}</div>` : nothing}
          ${fp.onDeadlock ? html`<div class="meta-detail">deadlock: ${fp.onDeadlock}</div>` : nothing}
        </div>
      `);
    }
    return cards.length > 0 ? html`<div class="metadata">${cards}</div>` : nothing;
  }
}
