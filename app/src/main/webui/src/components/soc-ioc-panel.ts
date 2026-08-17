import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { IocEntry } from "../types/soc-types.js";

const TYPE_ICONS: Record<string, string> = {
  IP_ADDRESS: "\u{1F310}", FILE_HASH_MD5: "#", FILE_HASH_SHA1: "#",
  FILE_HASH_SHA256: "#", DOMAIN: "\u{1F517}", URL: "\u{1F517}",
  EMAIL: "✉", CVE: "⚠", USER_AGENT: "\u{1F5A5}",
  REGISTRY_KEY: "\u{1F4CB}", MUTEX: "\u{1F512}", CERTIFICATE_HASH: "\u{1F4DC}"
};

@customElement("soc-ioc-panel")
export class SocIocPanel extends LitElement {

  @property() endpoint = "";
  @state() private _iocs: IocEntry[] = [];
  @state() private _loading = false;

  static styles = css`
    :host { display: block; }
    .group-header { font-weight: 600; padding: 8px 0 4px;
                    border-bottom: 1px solid var(--border, #e0e0e0); }
    .ioc-row { display: flex; align-items: center; gap: 8px; padding: 4px 0;
               font-size: 0.85rem; }
    .icon { width: 20px; text-align: center; }
    .value { flex: 1; font-family: monospace; word-break: break-all; }
    .confidence-bar { width: 60px; height: 6px;
                      background: var(--surface-2, #e0e0e0); border-radius: 3px; }
    .confidence-fill { height: 100%; border-radius: 3px;
                       background: var(--accent, #3b82f6); }
    .source { color: var(--text-2, #888); font-size: 0.75rem; }
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
      this._iocs = data.iocs ?? [];
    } finally { this._loading = false; }
  }

  render() {
    if (this._iocs.length === 0) {
      return html`<div class="empty-state">No IOCs extracted</div>`;
    }

    const grouped = new Map<string, IocEntry[]>();
    this._iocs.forEach(ioc => {
      const list = grouped.get(ioc.type) ?? [];
      list.push(ioc);
      grouped.set(ioc.type, list);
    });

    return html`${Array.from(grouped.entries()).map(([type, iocs]) => html`
      <div class="group-header">${TYPE_ICONS[type] ?? "?"} ${type.replace(/_/g, " ")}</div>
      ${iocs.map(ioc => html`
        <div class="ioc-row">
          <span class="value">${ioc.value}</span>
          <div class="confidence-bar">
            <div class="confidence-fill" style="width: ${ioc.confidence * 100}%"></div>
          </div>
          <span class="source">${ioc.source}</span>
        </div>
      `)}
    `)}`;
  }
}
