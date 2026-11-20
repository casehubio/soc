import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type {
  AgentDescriptor,
  Capability,
  CapabilityStatus,
  Constraint,
  Disposition,
  DispositionValue,
  Goal,
} from './agent-types.js';

function healthColor(status: CapabilityStatus): string {
  switch (status.type) {
    case 'ready': return '#a6e3a1';
    case 'degraded':
    case 'overloaded':
    case 'epistemically-weak': return '#f9e2af';
    case 'unavailable':
    case 'excluded':
    case 'behavioral-violation': return '#f38ba8';
  }
}

function healthTooltip(status: CapabilityStatus): string {
  switch (status.type) {
    case 'ready': return 'Ready';
    case 'degraded': return `Degraded: ${status.reason}${status.detail ? ` — ${status.detail}` : ''}`;
    case 'overloaded': return `Overloaded: ${(status.pressure * 100).toFixed(0)}% (threshold ${(status.threshold * 100).toFixed(0)}%)`;
    case 'unavailable': return `Unavailable${status.reason ? `: ${status.reason}` : ''}`;
    case 'epistemically-weak': return `Weak in ${status.domain} (${(status.confidence * 100).toFixed(0)}%)`;
    case 'excluded': return `Excluded from ${status.domain} (${status.source})`;
    case 'behavioral-violation': return `Violation (${status.kind})`;
  }
}

interface AxisEntry {
  key: string;
  displayName: string;
  color: string;
  value: string | DispositionValue[] | undefined;
}

const AXIS_DEFS: Array<{ key: keyof Disposition; displayName: string; color: string }> = [
  { key: 'socialOrient', displayName: 'Social orientation', color: '#89b4fa' },
  { key: 'ruleFollowing', displayName: 'Rule following', color: '#a6e3a1' },
  { key: 'riskAppetite', displayName: 'Risk appetite', color: '#94e2d5' },
  { key: 'autonomy', displayName: 'Autonomy', color: '#f9e2af' },
  { key: 'conflictMode', displayName: 'Conflict mode', color: '#cba6f7' },
];

@customElement('eidos-view')
export class EidosView extends LitElement {
  @property({ attribute: false }) agent!: AgentDescriptor;

  static override styles = css`
    :host {
      display: block;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      color: #cdd6f4;
      font-size: 13px;
    }

    /* --- Identity header --- */
    .identity {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .agent-icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: rgba(250, 179, 135, 0.15);
      color: #fab387;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }
    .agent-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .agent-name {
      font-size: 15px;
      font-weight: 600;
      color: #cdd6f4;
    }
    .agent-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 1px 7px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
    }
    .badge-slot {
      background: rgba(137, 180, 250, 0.15);
      color: #89b4fa;
    }
    .badge-archetype {
      background: rgba(203, 166, 247, 0.15);
      color: #cba6f7;
    }
    .badge-model {
      background: rgba(127, 132, 156, 0.15);
      color: #bac2de;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 10px;
    }
    .badge-vocab {
      background: rgba(127, 132, 156, 0.12);
      color: #585b70;
      font-size: 10px;
    }

    /* --- Section --- */
    .section {
      margin-bottom: 16px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #7f849c;
      margin-bottom: 8px;
    }

    /* --- Disposition bars --- */
    .disposition-grid {
      display: grid;
      grid-template-columns: 100px 1fr 80px;
      gap: 6px 10px;
      align-items: center;
    }
    .disp-label {
      text-align: right;
      font-size: 12px;
      color: #7f849c;
    }
    .disp-bar-track {
      height: 6px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 3px;
      overflow: hidden;
    }
    .disp-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s ease-out;
    }
    .disp-value {
      font-size: 12px;
      font-weight: 500;
    }

    /* --- Capabilities --- */
    .capability-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .capability {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
    }
    .cap-name {
      width: 140px;
      font-size: 12px;
      color: #cdd6f4;
      flex-shrink: 0;
    }
    .cap-bar-track {
      flex: 1;
      height: 4px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 2px;
      overflow: hidden;
      min-width: 60px;
    }
    .cap-bar-fill {
      height: 100%;
      background: #89b4fa;
      border-radius: 2px;
    }
    .cap-score {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 11px;
      color: #7f849c;
      width: 32px;
      text-align: right;
      flex-shrink: 0;
    }
    .cap-health {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .cap-domains {
      display: flex;
      gap: 4px;
      flex-shrink: 0;
    }
    .domain-tag {
      font-size: 10px;
      padding: 1px 5px;
      border-radius: 3px;
      background: rgba(127, 132, 156, 0.12);
      color: #7f849c;
    }

    /* --- Goals & Constraints --- */
    .goals-constraints {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .gc-panel {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .gc-item {
      display: flex;
      align-items: baseline;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 12px;
    }
    .priority-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .priority-PRIMARY {
      background: rgba(137, 180, 250, 0.15);
      color: #89b4fa;
    }
    .priority-SECONDARY {
      background: rgba(127, 132, 156, 0.12);
      color: #7f849c;
    }
    .severity-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .severity-HARD {
      background: rgba(243, 139, 168, 0.15);
      color: #f38ba8;
    }
    .severity-SOFT {
      background: rgba(249, 226, 175, 0.15);
      color: #f9e2af;
    }

    /* --- Briefing --- */
    .briefing {
      padding: 10px 14px;
      border-left: 3px solid rgba(127, 132, 156, 0.3);
      background: rgba(255, 255, 255, 0.02);
      border-radius: 0 6px 6px 0;
      font-size: 12px;
      color: #7f849c;
      line-height: 1.6;
      white-space: pre-wrap;
    }
  `;

  override render() {
    if (!this.agent) return nothing;
    return html`
      ${this.renderIdentity()}
      ${this.renderDisposition()}
      ${this.renderCapabilities()}
      ${this.renderGoalsConstraints()}
      ${this.renderBriefing()}
    `;
  }

  private renderIdentity(): TemplateResult {
    const a = this.agent;
    return html`
      <div class="identity">
        <div class="agent-icon">${a.avatar ?? '⬡'}</div>
        <div class="agent-info">
          <span class="agent-name">${a.name}</span>
          ${a.description ? html`<span style="font-size:11px;color:#7f849c">${a.description}</span>` : nothing}
          <div class="agent-meta">
            ${a.slot ? html`<span class="badge badge-slot">${a.slot}</span>` : nothing}
            ${a.archetype ? html`<span class="badge badge-archetype">${a.archetype}</span>` : nothing}
            ${a.modelFamily ? html`<span class="badge badge-model">${a.modelFamily}${a.modelVersion ? `-${a.modelVersion}` : ''}</span>` : nothing}
          </div>
        </div>
      </div>
    `;
  }

  private getAxes(): AxisEntry[] {
    const d = this.agent.disposition;
    if (!d) return [];
    return AXIS_DEFS
      .map(def => ({ ...def, value: d[def.key] }))
      .filter(a => a.value != null) as AxisEntry[];
  }

  private renderDisposition(): TemplateResult | typeof nothing {
    const axes = this.getAxes();
    if (axes.length === 0) return nothing;
    return html`
      <div class="section">
        <div class="section-title">Disposition</div>
        <div class="disposition-grid">
          ${axes.map(a => this.renderDispositionRow(a))}
        </div>
      </div>
    `;
  }

  private renderDispositionRow(axis: AxisEntry): TemplateResult | typeof nothing {
    const val = axis.value;
    if (typeof val === 'string') {
      return html`
        <span class="disp-label">${axis.displayName}</span>
        <div class="disp-bar-track">
          <div class="disp-bar-fill" style="width:100%;background:${axis.color}"></div>
        </div>
        <span class="disp-value" style="color:${axis.color}">${val}</span>
      `;
    }
    const weighted = val as DispositionValue[];
    const primary = weighted[0];
    if (!primary) return nothing;
    const pct = Math.max(0, Math.min(100, primary.weight * 100));
    return html`
      <span class="disp-label">${axis.displayName}</span>
      <div class="disp-bar-track">
        <div class="disp-bar-fill" style="width:${pct}%;background:${axis.color}"></div>
      </div>
      <span class="disp-value" style="color:${axis.color}">${primary.term}</span>
    `;
  }

  private renderCapabilities(): TemplateResult | typeof nothing {
    if (!this.agent.capabilities?.length) return nothing;
    return html`
      <div class="section">
        <div class="section-title">Capabilities</div>
        <div class="capability-list">
          ${this.agent.capabilities.map(c => this.renderCapability(c))}
        </div>
      </div>
    `;
  }

  private renderCapability(c: Capability): TemplateResult {
    const tags = c.tags ?? [];
    const hasQuality = c.qualityHint != null;
    const pct = hasQuality ? Math.max(0, Math.min(100, c.qualityHint! * 100)) : 0;
    const hColor = c.health ? healthColor(c.health) : undefined;
    const hTip = c.health ? healthTooltip(c.health) : undefined;
    return html`
      <div class="capability">
        <span class="cap-name">${c.name}</span>
        ${hasQuality ? html`
          <div class="cap-bar-track">
            <div class="cap-bar-fill" style="width:${pct}%"></div>
          </div>
          <span class="cap-score">${c.qualityHint!.toFixed(1)}</span>
        ` : html`<div class="cap-bar-track"></div>`}
        ${hColor ? html`<div class="cap-health" style="background:${hColor}" title="${hTip}"></div>` : nothing}
        ${tags.length > 0
          ? html`<div class="cap-domains">${tags.map(d => html`<span class="domain-tag">${d}</span>`)}</div>`
          : nothing}
      </div>
    `;
  }

  private renderGoalsConstraints(): TemplateResult | typeof nothing {
    if (!this.agent.goals?.length && !this.agent.constraints?.length) return nothing;
    return html`
      <div class="section">
        <div class="goals-constraints">
          ${this.agent.goals?.length
            ? html`
              <div class="gc-panel">
                <div class="section-title">Goals</div>
                ${this.agent.goals.map((g: Goal) => html`
                  <div class="gc-item">
                    <span class="priority-badge priority-${g.priority}">${g.priority}</span>
                    ${g.visibility === 'PRIVATE' ? html`<span class="badge" style="background:rgba(127,132,156,0.12);color:#585b70;font-size:9px">PRIVATE</span>` : nothing}
                    <span>${g.name ? html`<strong>${g.name}</strong> — ` : nothing}${g.description}</span>
                  </div>
                `)}
              </div>`
            : nothing}
          ${this.agent.constraints?.length
            ? html`
              <div class="gc-panel">
                <div class="section-title">Constraints</div>
                ${this.agent.constraints.map((c: Constraint) => html`
                  <div class="gc-item">
                    <span class="severity-badge severity-${c.severity}">${c.severity}</span>
                    <span>${c.name ? html`<strong>${c.name}</strong> — ` : nothing}${c.description}</span>
                  </div>
                `)}
              </div>`
            : nothing}
        </div>
      </div>
    `;
  }

  private renderBriefing(): TemplateResult | typeof nothing {
    if (!this.agent.briefing) return nothing;
    return html`
      <div class="section">
        <div class="section-title">Briefing</div>
        <div class="briefing">${this.agent.briefing}</div>
      </div>
    `;
  }
}
