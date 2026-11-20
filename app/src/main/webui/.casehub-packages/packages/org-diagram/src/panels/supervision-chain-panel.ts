import { LitElement, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export interface SupervisionEntry {
  supervisor: string;
  targets: readonly string[];
}

@customElement('org-supervision-chain-panel')
export class OrgSupervisionChainPanel extends LitElement {
  @property({ type: Array }) entries: SupervisionEntry[] = [];
  @property() highlightAgent: string | undefined;

  override createRenderRoot() { return this; }

  private _onAgentClick(agentId: string) {
    this.dispatchEvent(new CustomEvent('agent-click', { detail: { agentId }, bubbles: true, composed: true }));
  }

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Supervision hierarchy');
  }

  override render() {
    if (!this.entries.length) return nothing;
    return html`
      <div style="background:#ebf8ff;border:1px solid #90cdf4;border-radius:8px;padding:10px 14px;">
        <div style="font-size:10px;font-weight:700;color:#2b6cb0;margin-bottom:8px;">SUPERVISION HIERARCHY</div>
        <div role="list">
          ${this.entries.map(entry => html`
            <div role="listitem" style="font-size:9px;margin-bottom:4px;display:flex;align-items:center;flex-wrap:wrap;gap:2px;">
              <span
                style="color:#2a4365;cursor:pointer;font-weight:600;${this.highlightAgent === entry.supervisor ? 'text-decoration:underline;' : ''}"
                @click=${() => this._onAgentClick(entry.supervisor)}
              >${entry.supervisor}</span>
              <span style="color:#2b6cb0;margin:0 2px;">→</span>
              ${entry.targets.map((target, i) => html`
                ${i > 0 ? html`<span style="color:#a0aec0;">,</span>` : nothing}
                <span
                  style="color:#2a4365;cursor:pointer;${this.highlightAgent === target ? 'font-weight:700;text-decoration:underline;' : ''}"
                  @click=${() => this._onAgentClick(target)}
                >${target}</span>
              `)}
            </div>
          `)}
        </div>
      </div>
    `;
  }
}
