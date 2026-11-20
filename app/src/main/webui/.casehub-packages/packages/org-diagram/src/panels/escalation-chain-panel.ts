import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export interface EscalationChain {
  path: string[];
  terminal: string;
}

@customElement('org-escalation-chain-panel')
export class OrgEscalationChainPanel extends LitElement {
  @property({ type: Array }) chains: EscalationChain[] = [];
  @property() highlightAgent: string | undefined;

  override createRenderRoot() { return this; }

  private _onAgentClick(agentId: string) {
    this.dispatchEvent(new CustomEvent('agent-click', { detail: { agentId }, bubbles: true, composed: true }));
  }

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Escalation chains');
  }

  override render() {
    if (!this.chains.length) return nothing;
    return html`
      <div style="background:#fff5f5;border:1px solid #feb2b2;border-radius:8px;padding:10px 14px;">
        <div style="font-size:10px;font-weight:700;color:#c53030;margin-bottom:8px;">ESCALATION CHAIN</div>
        <div role="list">
          ${this.chains.map(chain => html`
            <div role="listitem" style="font-size:9px;margin-bottom:4px;display:flex;align-items:center;flex-wrap:wrap;gap:2px;">
              ${chain.path.map((agent, i) => html`
                ${i > 0 ? html`<span style="color:#c53030;margin:0 2px;">→</span>` : nothing}
                <span
                  style="color:#742a2a;cursor:pointer;${this.highlightAgent === agent ? 'font-weight:700;text-decoration:underline;' : ''}"
                  @click=${() => this._onAgentClick(agent)}
                >${agent}</span>
              `)}
              ${chain.terminal === chain.path[chain.path.length - 1] ? html`<span style="color:#a0aec0;margin-left:4px;font-size:8px;">(terminal)</span>` : nothing}
            </div>
          `)}
        </div>
      </div>
    `;
  }
}
