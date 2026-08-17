import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HeatmapData } from "../types/soc-types.js";

@customElement("soc-alert-heatmap")
export class SocAlertHeatmap extends LitElement {

  @property() endpoint = "";
  @property({ attribute: "time-unit" }) timeUnit = "day";
  @state() private _data: HeatmapData = { cells: [], sources: [], severities: [] };
  @state() private _loading = false;

  static styles = css`
    :host { display: block; }
    .heatmap { display: grid; gap: 1px; font-size: 0.75rem; }
    .header { font-weight: 600; padding: 4px; text-align: center; }
    .row-header { padding: 4px; text-align: right; }
    .cell { padding: 4px; text-align: center; cursor: pointer; border-radius: 2px;
            min-width: 32px; min-height: 24px; }
    .empty-state { padding: 1rem; color: var(--text-2, #888); text-align: center; }
  `;

  updated(changed: Map<string, unknown>) {
    if ((changed.has("endpoint") || changed.has("timeUnit")) && this.endpoint) this._fetch();
  }

  private async _fetch() {
    if (!this.endpoint) return;
    this._loading = true;
    try {
      const url = new URL(this.endpoint, location.origin);
      url.searchParams.set("timeUnit", this.timeUnit);
      const resp = await fetch(url.toString());
      if (!resp.ok) return;
      this._data = await resp.json();
    } finally { this._loading = false; }
  }

  render() {
    if (this._data.cells.length === 0) {
      return html`<div class="empty-state">No alert data available</div>`;
    }
    const times = [...new Set(this._data.cells.map(c => c.time))].sort();

    return html`
      <div class="heatmap" style="grid-template-columns: auto repeat(${times.length}, 1fr)">
        <div class="header"></div>
        ${times.map(t => html`<div class="header">${t}</div>`)}
        ${this._data.sources.map(source => html`
          <div class="row-header">${source}</div>
          ${times.map(time => {
            const cell = this._data.cells.find(c => c.source === source && c.time === time);
            const count = cell?.count ?? 0;
            const alpha = count > 0 ? Math.min(1, 0.2 + (count / 20) * 0.8) : 0;
            return html`<div class="cell"
              style="background: rgba(239, 68, 68, ${alpha})"
              title="${source} / ${time}: ${count} alerts"
              @click=${() => this._onCellClick(source, time)}>${count || ""}</div>`;
          })}
        `)}
      </div>
    `;
  }

  private _onCellClick(source: string, time: string) {
    this.dispatchEvent(new CustomEvent("pages-event", {
      bubbles: true, composed: true,
      detail: { topic: "heatmap:cell:selected", payload: { source, time } }
    }));
  }
}
