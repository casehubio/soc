import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { AttckTechnique } from "../types/soc-types.js";

const TACTICS = [
  "reconnaissance", "resource-development", "initial-access", "execution",
  "persistence", "privilege-escalation", "defense-evasion", "credential-access",
  "discovery", "lateral-movement", "collection", "command-and-control",
  "exfiltration", "impact"
];

@customElement("soc-attck-matrix")
export class SocAttckMatrix extends LitElement {

  @property() endpoint = "";
  @state() private _techniques: AttckTechnique[] = [];
  @state() private _loading = false;

  static styles = css`
    :host { display: block; }
    .matrix { display: grid; grid-template-columns: repeat(14, 1fr); gap: 2px; font-size: 0.7rem; }
    .tactic-header { font-weight: 600; text-align: center; padding: 4px 2px;
                     background: var(--surface-2, #f0f0f0); border-radius: 4px;
                     text-transform: capitalize; }
    .technique { padding: 4px; border-radius: 3px; cursor: pointer; text-align: center;
                 min-height: 28px; display: flex; align-items: center; justify-content: center; }
    .empty { visibility: hidden; }
    .empty-state { padding: 1rem; color: var(--text-2, #888); text-align: center; }
  `;

  updated(changed: Map<string, unknown>) {
    if (changed.has("endpoint") && this.endpoint) this._fetch();
  }

  private async _fetch() {
    if (!this.endpoint) return;
    this._loading = true;
    try {
      const resp = await fetch(this.endpoint);
      if (!resp.ok) return;
      const data = await resp.json();
      this._techniques = data.techniques ?? [];
    } finally { this._loading = false; }
  }

  render() {
    if (this._techniques.length === 0) {
      return html`<div class="empty-state">No ATT&CK techniques mapped</div>`;
    }

    const byTactic = new Map<string, AttckTechnique[]>();
    TACTICS.forEach(t => byTactic.set(t, []));
    this._techniques.forEach(t => byTactic.get(t.tactic)?.push(t));

    const maxRows = Math.max(1, ...Array.from(byTactic.values()).map(v => v.length));
    const rows = [];
    for (let i = 0; i < maxRows; i++) {
      for (const tactic of TACTICS) {
        const techs = byTactic.get(tactic) ?? [];
        const tech = techs[i];
        if (tech) {
          const alpha = Math.max(0.2, tech.confidence);
          rows.push(html`<div class="technique"
            style="background: rgba(239, 68, 68, ${alpha})"
            title="${tech.id}: ${tech.evidence}"
            @click=${() => this._onSelect(tech)}>${tech.id}</div>`);
        } else {
          rows.push(html`<div class="technique empty">&nbsp;</div>`);
        }
      }
    }

    return html`
      <div class="matrix">
        ${TACTICS.map(t => html`<div class="tactic-header">${t.replace(/-/g, " ")}</div>`)}
        ${rows}
      </div>
    `;
  }

  private _onSelect(tech: AttckTechnique) {
    this.dispatchEvent(new CustomEvent("pages-event", {
      bubbles: true, composed: true,
      detail: { topic: "attck:technique:selected", payload: tech }
    }));
  }
}
