import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export interface AttestationGrant {
  source: string;
  target: string;
  scope?: string;
  dimensions: string[];
  signalTypes?: string[];
}

@customElement('org-attestation-panel')
export class OrgAttestationPanel extends LitElement {
  @property({ type: Array }) grants: AttestationGrant[] = [];
  @property() highlightAgent: string | undefined;

  override createRenderRoot() { return this; }

  private _onAgentClick(agentId: string) {
    this.dispatchEvent(new CustomEvent('agent-click', { detail: { agentId }, bubbles: true, composed: true }));
  }

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Attestation grants');
  }

  override render() {
    if (!this.grants.length) return nothing;
    return html`
      <div style="background:#faf5ff;border:1px solid #d6bcfa;border-radius:8px;padding:10px 14px;">
        <div style="font-size:10px;font-weight:700;color:#553c9a;margin-bottom:8px;">ATTESTATION GRANTS</div>
        ${this.grants.map(grant => html`
          <div style="margin-bottom:8px;font-size:9px;">
            <div style="color:#4a5568;">
              <span style="cursor:pointer;${this.highlightAgent === grant.source ? 'font-weight:700;' : ''}" @click=${() => this._onAgentClick(grant.source)}>${grant.source}</span>
              <span style="color:#718096;"> → </span>
              <span style="cursor:pointer;${this.highlightAgent === grant.target ? 'font-weight:700;' : ''}" @click=${() => this._onAgentClick(grant.target)}>${grant.target}</span>
            </div>
            ${grant.scope ? html`<div style="color:#4a5568;margin-top:2px;">Scoped to: <strong>${grant.scope}</strong></div>` : nothing}
            <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:4px;">
              ${grant.dimensions.map(d => html`<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:7.5px;background:#e9d8fd;color:#553c9a;">${d}</span>`)}
            </div>
            ${grant.signalTypes?.length ? html`
              <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:3px;">
                ${grant.signalTypes.map(s => html`
                  <span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:7.5px;background:${s === 'COMPLIANT' ? '#c6f6d5' : s === 'VIOLATED' ? '#fed7d7' : '#f3f4f6'};color:${s === 'COMPLIANT' ? '#276749' : s === 'VIOLATED' ? '#c53030' : '#374151'};">${s}</span>
                `)}
                <span style="font-size:8px;color:#718096;">→ BehavioralSignalStore</span>
              </div>
            ` : nothing}
          </div>
        `)}
      </div>
    `;
  }
}
