import { LitElement, html, css, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LiveRegionMixin } from '@casehubio/pages-primitives/a11y';
import type { ContributorDetail } from './types.js';
import type { TypedDataSet, TypedRow } from '@casehubio/pages-data';
import { fromRows } from '@casehubio/pages-data';
import { OUTCOME_COLUMNS, OUTCOME_TABLE_CONFIG, ID_COL } from './columns.js';
import '@casehubio/pages-ui-components/split-workbench';
import '@casehubio/mosaic-trust-score-panel';
import '@casehubio/mosaic-list-pane';

const LANE_COLORS: Record<string, string> = {
  FAST_TRACK: 'var(--pages-success-9, #16a34a)',
  STANDARD: 'var(--pages-info-9, #2563eb)',
  TRIAGE: 'var(--pages-warning-9, #d97706)',
};

export interface ContributorWorkbenchProps {
  endpoint: string;
  actorId: string;
}

@customElement('agency-contributor-workbench')
export class ContributorWorkbench extends LiveRegionMixin(LitElement) {
  @property({ type: String }) endpoint = '';
  @property({ type: String, attribute: 'actor-id' }) actorId = '';

  @state() _detail: ContributorDetail | null = null;
  @state() _loading = false;
  @state() _error: string | null = null;
  @state() private _outcomeDataSet: TypedDataSet | undefined;

  private _abortController: AbortController | null = null;

  static override styles = css`
    :host { display: block; height: 100%; font-family: var(--pages-font-family, system-ui); }
    .left-panel { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
    .intake-section {
      padding: var(--pages-space-3, 12px);
      border-bottom: 1px solid var(--pages-neutral-4, #d4d4d4);
    }
    .intake-lane-badge {
      display: inline-block; padding: 2px 8px; border-radius: 4px;
      font-size: var(--pages-font-size-sm, 12px); font-weight: 600; color: white;
    }
    .intake-reason {
      font-size: var(--pages-font-size-xs, 11px);
      color: var(--pages-neutral-7, #525252); margin-top: 4px;
    }
    .dimension-section {
      padding: var(--pages-space-3, 12px);
      border-bottom: 1px solid var(--pages-neutral-4, #d4d4d4);
    }
    .dimension-row {
      display: flex; justify-content: space-between;
      align-items: center; margin-bottom: 4px;
    }
    .dimension-label {
      font-size: var(--pages-font-size-sm, 12px);
      color: var(--pages-neutral-9, #525252);
    }
    .dimension-score {
      font-size: var(--pages-font-size-sm, 12px); font-weight: 600;
    }
    .score-bar {
      height: 4px; background: var(--pages-neutral-3, #e5e5e5);
      border-radius: 2px; margin-top: 2px;
    }
    .score-fill {
      height: 100%; border-radius: 2px;
      background: var(--pages-info-9, #2563eb);
    }
    .detail-panel {
      display: flex; flex-direction: column; height: 100%;
      overflow-y: auto; padding-left: var(--pages-space-3, 12px);
    }
    .detail-empty {
      display: flex; align-items: center; justify-content: center;
      height: 100%; color: var(--pages-neutral-7, #525252);
      font-size: var(--pages-font-size-sm, 12px);
    }
    .detail-error {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; height: 100%;
      color: var(--pages-danger-9, #dc2626); gap: var(--pages-space-2, 8px);
    }
    .detail-error button {
      padding: 4px 12px; border: 1px solid var(--pages-neutral-4, #d4d4d4);
      background: var(--pages-neutral-1, #fafafa);
      border-radius: 4px; cursor: pointer;
    }
    .loading {
      display: flex; align-items: center; justify-content: center;
      height: 100%; color: var(--pages-neutral-7, #525252);
    }
  `;

  override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('actorId')) {
      if (changed.get('actorId') !== undefined) {
        this._resetState();
      }
      if (this.actorId) {
        this._fetchDetail();
      }
    }
    if (changed.has('_detail')) {
      this._outcomeDataSet = this._computeOutcomeDataSet();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._abortController?.abort();
  }

  private _resetState(): void {
    this._detail = null;
    this._loading = false;
    this._error = null;
    this._abortController?.abort();
  }

  private async _fetchDetail(): Promise<void> {
    this._abortController?.abort();
    this._abortController = new AbortController();
    this._loading = true;
    this._error = null;

    try {
      const url = `${this.endpoint}/contributors/${this.actorId}`;
      const response = await fetch(url, { signal: this._abortController.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this._detail = await response.json();
      this._loading = false;
      this.announce(`Contributor data loaded for ${this.actorId}`);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      this._loading = false;
      this._error = err instanceof Error ? err.message : String(err);
      this.announce(`Failed to load contributor data: ${this._error}`);
    }
  }

  private _computeOutcomeDataSet(): TypedDataSet | undefined {
    if (!this._detail?.recentOutcomes?.length) return undefined;
    return fromRows([...this._detail.recentOutcomes], OUTCOME_COLUMNS);
  }

  override render(): TemplateResult | typeof nothing {
    if (!this.actorId) return nothing;
    if (this._loading) {
      return html`<div class="loading" role="status">Loading contributor data...</div>`;
    }
    if (this._error) {
      return html`
        <div class="detail-error" role="alert">
          <span>Failed to load contributor data: ${this._error}</span>
          <button @click=${() => this._fetchDetail()}>Retry</button>
        </div>`;
    }

    return html`
      <pages-split-workbench selection-topic="contributor-outcome">
        <div slot="list" class="left-panel">
          ${this._renderSummary()}
        </div>
        <div slot="detail" class="detail-panel">
          ${this._renderOutcomeList()}
        </div>
      </pages-split-workbench>
    `;
  }

  private _renderSummary(): TemplateResult | typeof nothing {
    if (!this._detail) return nothing;
    const cls = this._detail.intakeClassification;
    const laneColor = LANE_COLORS[cls.lane] ?? LANE_COLORS.TRIAGE;

    return html`
      <div class="intake-section">
        <span class="intake-lane-badge"
              style="background:${laneColor}"
              title=${cls.classificationReason}>
          ${cls.lane.replace('_', ' ')}
        </span>
        <div class="intake-reason">${cls.classificationReason}</div>
      </div>
      <agency-trust-score-panel
        mode="compact"
        .endpoint=${this.endpoint}
        actor-id=${this.actorId}
      ></agency-trust-score-panel>
      ${this._renderDimensions()}
    `;
  }

  private _renderDimensions(): TemplateResult | typeof nothing {
    if (!this._detail) return nothing;
    const dims = this._detail.dimensionScores;
    const entries = Object.entries(dims);
    if (!entries.length) return nothing;

    return html`
      <div class="dimension-section">
        ${entries.map(([key, score]) => html`
          <div class="dimension-row">
            <span class="dimension-label">${key.replace(/-/g, ' ')}</span>
            <span class="dimension-score">${score.toFixed(2)}</span>
          </div>
          <div class="score-bar">
            <div class="score-fill" style="width:${(score * 100).toFixed(0)}%"></div>
          </div>
        `)}
      </div>
    `;
  }

  private _renderOutcomeList(): TemplateResult {
    if (!this._outcomeDataSet) {
      return html`<div class="detail-empty">No outcome history</div>`;
    }
    return html`
      <agency-list-pane
        selection-topic="contributor-outcome"
        .dataSet=${this._outcomeDataSet}
        .columnConfig=${OUTCOME_TABLE_CONFIG}
        .getRowKey=${(row: TypedRow) => row.text(ID_COL)}
        empty-message="No outcome history"
      ></agency-list-pane>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-contributor-workbench': ContributorWorkbench;
  }
}
