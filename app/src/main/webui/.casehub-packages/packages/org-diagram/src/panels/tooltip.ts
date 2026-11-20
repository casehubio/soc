import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { OrgAgentNodeData, AgentCapability, AgentGoal, AgentConstraint } from '@casehubio/mosaic-graph-stencil-org';
import { DISPOSITION_SHORT_NAMES } from '@casehubio/mosaic-graph-stencil-org';

const DISPOSITION_COLORS: Record<string, { bg: string; color: string }> = {
  autonomy: { bg: '#fed7d7', color: '#c53030' },
  ruleFollowing: { bg: '#fefcbf', color: '#975a16' },
  socialOrient: { bg: '#c6f6d5', color: '#276749' },
  riskAppetite: { bg: '#c6f6d5', color: '#276749' },
  conflictMode: { bg: '#ebf8ff', color: '#2b6cb0' },
};

@customElement('org-tooltip')
export class OrgTooltip extends LitElement {
  @property({ type: Object }) agentData: OrgAgentNodeData | null = null;
  @property({ type: Number }) x = 0;
  @property({ type: Number }) y = 0;
  @property({ type: Boolean }) visible = false;

  @state() private _dismissTimeout: ReturnType<typeof setTimeout> | null = null;

  override createRenderRoot() { return this; }

  show(data: OrgAgentNodeData, x: number, y: number) {
    if (this._dismissTimeout) { clearTimeout(this._dismissTimeout); this._dismissTimeout = null; }
    this.agentData = data;
    this.x = x;
    this.y = y;
    this.visible = true;
  }

  scheduleDismiss() {
    if (this._dismissTimeout) clearTimeout(this._dismissTimeout);
    this._dismissTimeout = setTimeout(() => { this.visible = false; this._dismissTimeout = null; }, 150);
  }

  cancelDismiss() {
    if (this._dismissTimeout) { clearTimeout(this._dismissTimeout); this._dismissTimeout = null; }
  }

  override render() {
    if (!this.visible || !this.agentData) return nothing;
    const d = this.agentData;
    const colorStart = d.unitColorStart ?? '#6366f1';

    return html`
      <div
        role="tooltip"
        style="position:absolute;left:${this.x}px;top:${this.y}px;z-index:100;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:10px 12px;max-width:320px;font-size:9px;pointer-events:auto;"
        @mouseenter=${() => this.cancelDismiss()}
        @mouseleave=${() => this.scheduleDismiss()}
      >
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="${colorStart}"/></svg>
          <span style="font-weight:700;font-size:11px;color:${colorStart};">${d.agentId}</span>
          ${d.role ? html`<span style="font-size:7px;font-weight:600;color:${colorStart};text-transform:uppercase;margin-left:auto;">${d.role}</span>` : nothing}
        </div>

        ${d.slot ? html`<div style="color:#718096;margin-bottom:3px;"><strong>SLOT:</strong> ${d.slot}</div>` : nothing}

        ${(d.capabilities as AgentCapability[] | undefined)?.length ? html`
          <div style="color:#718096;margin-bottom:3px;"><strong>CAPS:</strong> ${d.capabilities!.map(c => c.name).join(', ')}</div>
        ` : nothing}

        ${d.disposition && Object.keys(d.disposition).length > 0 ? html`
          <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:3px;">
            ${Object.entries(d.disposition).filter(([, v]) => v !== undefined).map(([axis, value]) => {
              const colors = DISPOSITION_COLORS[axis] ?? { bg: '#f3f4f6', color: '#374151' };
              const shortName = (DISPOSITION_SHORT_NAMES as Record<string, string>)[axis] ?? axis;
              return html`<span style="padding:1px 5px;border-radius:3px;font-size:7.5px;background:${colors.bg};color:${colors.color};">${shortName}: ${value}</span>`;
            })}
          </div>
        ` : nothing}

        ${(d as unknown as { goals?: AgentGoal[] }).goals?.length ? html`
          <div style="margin-bottom:3px;">
            <strong style="color:#718096;">GOALS:</strong>
            ${(d as unknown as { goals: AgentGoal[] }).goals.map(g => html`
              <span style="display:inline-block;margin-left:4px;">${g.name}${g.priority ? html` <span style="color:#a0aec0;">(${g.priority})</span>` : nothing}</span>
            `)}
          </div>
        ` : nothing}

        ${(d as unknown as { constraints?: AgentConstraint[] }).constraints?.length ? html`
          <div style="margin-bottom:3px;">
            <strong style="color:#718096;">CONSTRAINTS:</strong>
            ${(d as unknown as { constraints: AgentConstraint[] }).constraints.map(c => html`
              <span style="display:inline-block;margin-left:4px;">${c.name}${c.severity ? html` <span style="color:#a0aec0;">(${c.severity})</span>` : nothing}</span>
            `)}
          </div>
        ` : nothing}

        ${(d as unknown as { briefing?: string }).briefing ? html`
          <div style="color:#718096;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
            ${(d as unknown as { briefing: string }).briefing}
          </div>
        ` : nothing}
      </div>
    `;
  }
}
