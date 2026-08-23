import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import "@casehubio/blocks-ui-similarity-panel";

interface CbrSummary {
  totalSimilar: number;
  outcomes: Record<string, number>;
  avgResolutionMinutes: number;
  dominantOutcome: string;
  dominantOutcomePercent: number;
}

@customElement("soc-cbr-summary")
export class SocCbrSummary extends LitElement {
  @property({ attribute: false }) summaryData: CbrSummary | null = null;
  @property({ attribute: false }) incidents: unknown[] = [];

  static override styles = css`
    :host { display: block; padding: 0.5rem; }
    .banner {
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 0.75rem;
      font-size: 0.85rem;
    }
    .banner-resolved { background: #dcfce7; color: #166534; }
    .banner-escalated { background: #fef3c7; color: #92400e; }
    .banner-false-positive { background: #fee2e2; color: #991b1b; }
    .banner-none { background: #f3f4f6; color: #6b7280; }
    .stat { font-weight: 600; }
    .empty { color: #666; padding: 1rem; }
  `;

  override render() {
    if (!this.summaryData || this.summaryData.totalSimilar === 0) {
      if (this.incidents.length === 0 && !this.summaryData) {
        return html`<p class="empty">Select a case to view similar incidents</p>`;
      }
      return html`<p class="empty">No similar incidents found</p>`;
    }

    const s = this.summaryData;
    const cls = s.dominantOutcome === "resolved" ? "banner-resolved"
      : s.dominantOutcome === "escalated" ? "banner-escalated"
      : s.dominantOutcome.includes("false") ? "banner-false-positive"
      : "banner-none";

    return html`
      <div class="banner ${cls}">
        <span class="stat">${s.dominantOutcomePercent}%</span> of
        <span class="stat">${s.totalSimilar}</span> similar incidents were
        <span class="stat">${s.dominantOutcome}</span>
        ${s.avgResolutionMinutes > 0 ? html`
          <br/>Avg resolution: <span class="stat">${s.avgResolutionMinutes} min</span>
        ` : nothing}
      </div>
      <blocks-similarity-panel .data=${this.incidents}></blocks-similarity-panel>
    `;
  }
}
