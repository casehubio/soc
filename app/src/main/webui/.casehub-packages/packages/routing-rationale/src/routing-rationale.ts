import { LitElement, html, css, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { DataSourceMixin } from '@casehubio/pages-component';
import { emitPagesEvent } from '@casehubio/pages-data';
import { createTypedFetchSource } from '@casehubio/pages-data';
import { LiveRegionMixin } from '@casehubio/pages-primitives/a11y';
import '@casehubio/pages-table';
import type { TableColumnConfig, ColumnRenderer } from '@casehubio/pages-table';
import type { SourceFactory } from '@casehubio/pages-data';
import { fromRows } from '@casehubio/pages-data';
import { columnId, ColumnType } from '@casehubio/pages-data';
import type { CellValue, ColumnId, TypedRow } from '@casehubio/pages-data';
import type { RoutingRationaleData, CandidateScore, RoutingCandidateSelectedDetail } from './types.js';

export const RoutingRationaleTopics = {
  CANDIDATE_SELECTED: 'routing.candidate-selected',
} as const;

const WORKER_COL = columnId('workerId');
const TRUST_COL = columnId('trustScore');
const WORKLOAD_COL = columnId('workloadScore');
const PHASE_COL = columnId('phase');
const OBS_COL = columnId('observations');
const FINAL_COL = columnId('finalScore');
const STATUS_COL = columnId('status');

const CANDIDATE_COLUMNS = (selectedId: string) => [
  { id: WORKER_COL, name: 'Worker', type: ColumnType.TEXT, getValue: (c: CandidateScore) => c.workerId },
  { id: TRUST_COL, name: 'Trust', type: ColumnType.NUMBER, getValue: (c: CandidateScore) => c.trustScore },
  { id: WORKLOAD_COL, name: 'Workload', type: ColumnType.NUMBER, getValue: (c: CandidateScore) => c.workloadScore },
  { id: PHASE_COL, name: 'Phase', type: ColumnType.TEXT, getValue: (c: CandidateScore) => c.phase },
  { id: OBS_COL, name: 'Observations', type: ColumnType.NUMBER, getValue: (c: CandidateScore) => c.observations },
  { id: FINAL_COL, name: 'Final Score', type: ColumnType.NUMBER, getValue: (c: CandidateScore) => c.finalScore },
  { id: STATUS_COL, name: 'Status', type: ColumnType.TEXT, getValue: (c: CandidateScore) => c.workerId === selectedId ? 'Selected' : c.exclusionReason ?? 'Eligible' },
];

const TABLE_CONFIG: readonly TableColumnConfig[] = [
  { id: WORKER_COL, sortable: true },
  { id: TRUST_COL, sortable: true },
  { id: WORKLOAD_COL, sortable: true },
  { id: PHASE_COL, sortable: true },
  { id: OBS_COL, sortable: true },
  { id: FINAL_COL, sortable: true },
  { id: STATUS_COL, sortable: false },
];

export const PHASE_STYLES: Record<string, string> = {
  BOOTSTRAP: 'background: var(--pages-neutral-3, #e9ecef); color: var(--pages-neutral-11, #495057);',
  QUALIFIED: 'background: var(--pages-success-3, #d4edda); color: var(--pages-success-11, #155724);',
  BORDERLINE: 'background: var(--pages-warning-3, #fff3cd); color: var(--pages-warning-11, #856404);',
  EXCLUDED_PHASE2B: 'background: var(--pages-danger-3, #f8d7da); color: var(--pages-danger-11, #721c24);',
  EXCLUDED_PHASE3: 'background: var(--pages-danger-3, #f8d7da); color: var(--pages-danger-11, #721c24);',
};

function renderScoreBar(value: number, label: string) {
  const pct = Math.round(value * 100);
  return html`
    <div style="display: flex; align-items: center; gap: 0.5rem;" role="img" aria-label="${label} ${pct}%">
      <div style="flex: 1; height: 8px; background: var(--pages-neutral-4, #e5e5e5); border-radius: 4px; overflow: hidden;">
        <div style="height: 100%; width: ${pct}%; background: var(--pages-accent-9, #3b82f6);"></div>
      </div>
      <span style="font-weight: 600; min-width: 35px; font-size: 13px;">${pct}%</span>
    </div>
  `;
}

function formatScoreLabel(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).replace(/Score$/, '').trim();
}

function buildColumnRenderers(policy: RoutingRationaleData['policy'], selectedId: string): ReadonlyMap<ColumnId, ColumnRenderer> {
  const threshPct = Math.round(policy.threshold * 100);
  const marginPct = Math.round(policy.borderlineMargin * 100);

  return new Map<ColumnId, ColumnRenderer>([
    [TRUST_COL, (cell: CellValue) => {
      if (cell.type === 'NULL') return html`<span style="color: var(--pages-neutral-9, #888);">—</span>`;
      const value = (cell as { value: number }).value;
      const pct = Math.round(value * 100);
      return html`
        <div style="display: flex; align-items: center; gap: 0.5rem; position: relative;" role="img" aria-label="Trust score ${pct}% of 100%, threshold ${threshPct}%">
          <div style="flex: 1; height: 8px; background: var(--pages-neutral-4, #e5e5e5); border-radius: 4px; overflow: hidden; position: relative;">
            <div style="position: absolute; left: ${threshPct - marginPct}%; width: ${marginPct * 2}%; height: 100%; background: var(--pages-warning-3, #fff3cd); opacity: 0.5;" aria-hidden="true"></div>
            <div style="height: 100%; width: ${pct}%; background: var(--pages-accent-9, #3b82f6); position: relative; z-index: 1;"></div>
            <div style="position: absolute; left: ${threshPct}%; top: -2px; width: 2px; height: 12px; background: var(--pages-neutral-11, #333);" aria-hidden="true"></div>
          </div>
          <span style="font-weight: 600; min-width: 35px; font-size: 13px;">${pct}%</span>
        </div>
      `;
    }],
    [WORKLOAD_COL, (cell: CellValue) => {
      if (cell.type === 'NULL') return html`<span style="color: var(--pages-neutral-9, #888);">—</span>`;
      return renderScoreBar((cell as { value: number }).value, 'Workload');
    }],
    [PHASE_COL, (cell: CellValue) => {
      const value = cell.type === 'NULL' ? '' : String((cell as { value: string }).value);
      const style = PHASE_STYLES[value] ?? '';
      const label = value.replace('EXCLUDED_PHASE2B', 'Excluded (below threshold)').replace('EXCLUDED_PHASE3', 'Excluded (quality floor)');
      return html`<span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; ${style}" aria-label="Phase: ${label}">${value}</span>`;
    }],
    [FINAL_COL, (cell: CellValue) => {
      if (cell.type === 'NULL') return html`<span style="color: var(--pages-neutral-9, #888);">—</span>`;
      return renderScoreBar((cell as { value: number }).value, 'Final score');
    }],
    [STATUS_COL, (cell: CellValue) => {
      const value = cell.type === 'NULL' ? '' : String((cell as { value: string }).value);
      if (value === 'Selected') return html`<span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background: var(--pages-success-3, #d4edda); color: var(--pages-success-11, #155724);">${value}</span>`;
      if (value === 'Eligible') return html`<span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background: var(--pages-neutral-3, #e9ecef); color: var(--pages-neutral-11, #495057);">${value}</span>`;
      return html`<span style="font-size: 12px; color: var(--pages-neutral-9, #888);">${value}</span>`;
    }],
  ]);
}

export interface RoutingRationaleProps {
  data: RoutingRationaleData | null;
  scoreLabel: string;
  capabilityLabel?: string;
}

@customElement('agency-routing-rationale')
export class RoutingRationale extends DataSourceMixin(LiveRegionMixin(LitElement)) {
  @property({ attribute: false }) data: RoutingRationaleData | null = null;
  @property({ type: String, attribute: 'score-label' }) scoreLabel = 'Trust Score';
  @property({ type: String, attribute: 'capability-label' }) capabilityLabel?: string;
  @property({ attribute: false }) renderCandidate?: (candidate: CandidateScore) => TemplateResult | undefined;

  @state() private _rawData: RoutingRationaleData | null = null;
  @state() private _renderers: ReadonlyMap<ColumnId, ColumnRenderer> = new Map();

  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); }
    .empty { color: var(--pages-neutral-9, #888); font-style: italic; padding: var(--pages-space-4, 1rem); }
  `;

  override resolveEndpoint(): string | undefined {
    if (this.data) return undefined;
    return this.endpoint;
  }

  override createSourceFactory(): SourceFactory {
    return (url) => createTypedFetchSource<RoutingRationaleData>(url, (data, sink) => {
      this._rawData = data;
      this._renderers = buildColumnRenderers(data.policy, data.selected.workerId);
      const allCandidates = [data.selected, ...data.alternatives];
      const dataset = fromRows(allCandidates, CANDIDATE_COLUMNS(data.selected.workerId));
      sink.apply({ type: 'snapshot', dataset });
    });
  }

  override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('data') && this.data) {
      this._rawData = this.data;
      const allCandidates = [this.data.selected, ...this.data.alternatives];
      this.dataSet = fromRows(allCandidates, CANDIDATE_COLUMNS(this.data.selected.workerId));
      this._renderers = buildColumnRenderers(this.data.policy, this.data.selected.workerId);
    }
  }

  private _handleRowActivate(e: CustomEvent) {
    const row = e.detail.row as TypedRow;
    const trustCell = row.cell(TRUST_COL);
    const detail: RoutingCandidateSelectedDetail = {
      workerId: row.text(WORKER_COL),
      trustScore: trustCell.type === 'NULL' ? null : (trustCell as { value: number }).value,
      finalScore: row.number(FINAL_COL),
      phase: row.text(PHASE_COL) as CandidateScore['phase'],
    };
    emitPagesEvent(this, RoutingRationaleTopics.CANDIDATE_SELECTED, detail);
  }

  private _renderTitle() {
    const name = this.capabilityLabel ?? this._rawData?.capabilityTag;
    if (!name) return '';
    return html`<div style="font-size: 14px; font-weight: 600; color: var(--pages-neutral-12, #171717); padding: var(--pages-space-3, 12px) 0;">Routing: ${name}</div>`;
  }

  private _renderScoreHeader() {
    if (!this._rawData) return '';
    const s = this._rawData.selected;
    const p = this._rawData.policy;
    const threshPct = Math.round(p.threshold * 100);
    const marginPct = Math.round(p.borderlineMargin * 100);
    const blendPct = Math.round(p.blendFactor * 100);
    const phaseStyle = PHASE_STYLES[s.phase] ?? '';
    const additionalEntries = s.additionalScores ? Object.entries(s.additionalScores) : [];

    return html`
      <div data-section="score-header" style="padding: var(--pages-space-3, 12px) 0; display: flex; flex-direction: column; gap: var(--pages-space-3, 12px);">
        <div style="display: flex; align-items: center; gap: var(--pages-space-3, 12px); flex-wrap: wrap;">
          <span style="font-weight: 600; font-size: 14px;">${s.workerId}</span>
          <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; ${phaseStyle}">${s.phase}</span>
          <span style="font-size: 12px; color: var(--pages-neutral-9, #888);">${s.observations} observations</span>
        </div>
        ${s.trustScore !== null ? html`
          <div>
            <div style="font-size: 12px; color: var(--pages-neutral-9, #888); margin-bottom: 4px;">${this.scoreLabel}</div>
            <div style="display: flex; align-items: center; gap: 0.5rem; position: relative;" role="img" aria-label="${this.scoreLabel} ${Math.round(s.trustScore * 100)}%, threshold ${threshPct}%">
              <div style="flex: 1; height: 10px; background: var(--pages-neutral-4, #e5e5e5); border-radius: 4px; overflow: hidden; position: relative;">
                <div style="position: absolute; left: ${threshPct - marginPct}%; width: ${marginPct * 2}%; height: 100%; background: var(--pages-warning-3, #fff3cd); opacity: 0.5;" aria-hidden="true"></div>
                <div style="height: 100%; width: ${Math.round(s.trustScore * 100)}%; background: var(--pages-accent-9, #3b82f6); position: relative; z-index: 1;"></div>
                <div style="position: absolute; left: ${threshPct}%; top: -2px; width: 2px; height: 14px; background: var(--pages-neutral-11, #333);" aria-hidden="true"></div>
              </div>
              <span style="font-weight: 600; min-width: 35px; font-size: 13px;">${Math.round(s.trustScore * 100)}%</span>
            </div>
          </div>
        ` : html`<div style="font-size: 13px; color: var(--pages-neutral-9, #888); font-style: italic;">No trust data — availability routing</div>`}
        <div>
          <div style="font-size: 12px; color: var(--pages-neutral-9, #888); margin-bottom: 4px;">Final Score (${blendPct}% trust + ${100 - blendPct}% workload)</div>
          ${renderScoreBar(s.finalScore, 'Final score')}
        </div>
        ${additionalEntries.length > 0 ? html`
          <div style="display: flex; gap: var(--pages-space-4, 16px); font-size: 13px;">
            ${additionalEntries.map(([key, val]) => html`
              <span><span style="color: var(--pages-neutral-9, #888);">${formatScoreLabel(key)}:</span> ${val.toFixed(2)}</span>
            `)}
          </div>
        ` : ''}
        ${s.rationale ? html`<div style="font-size: 12px; color: var(--pages-neutral-9, #888); font-style: italic;">${s.rationale}</div>` : ''}
      </div>
    `;
  }

  private _renderPolicySummary() {
    if (!this._rawData) return '';
    const p = this._rawData.policy;
    const floors = Object.entries(p.qualityFloors);
    return html`
      <div data-section="policy-summary" style="padding: var(--pages-space-3, 12px) 0; font-size: 12px; color: var(--pages-neutral-11, #404040); border-top: 1px solid var(--pages-neutral-4, #e5e5e5);">
        <div style="display: flex; flex-wrap: wrap; gap: var(--pages-space-3, 12px);">
          <span>Strategy: ${this._rawData.strategyId}</span>
          <span>Threshold: ${p.threshold.toFixed(2)}</span>
          <span>Margin: ±${p.borderlineMargin.toFixed(2)}</span>
          <span>Blend: ${Math.round(p.blendFactor * 100)}% trust</span>
          <span>Min observations: ${p.minimumObservations}</span>
          ${p.cbrWeight > 0 ? html`<span>CBR weight: ${Math.round(p.cbrWeight * 100)}%</span>` : ''}
        </div>
        ${floors.length > 0 ? html`
          <div style="margin-top: 4px;">Quality floors: ${floors.map(([dim, val], i) => html`${i > 0 ? ', ' : ''}${dim} ≥ ${val.toFixed(2)}`)}
          </div>
        ` : ''}
        ${p.bootstrapEscalationRequired ? html`<div style="margin-top: 4px;"><span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background: var(--pages-warning-3, #fff3cd); color: var(--pages-warning-11, #856404);">Bootstrap candidates require escalation</span></div>` : ''}
      </div>
    `;
  }

  override render() {
    if (this.loading) return html`<div class="empty">Loading routing data...</div>`;
    if (this.error) return html`<div class="empty">Routing data unavailable</div>`;
    if (!this._rawData || !this.dataSet) return html`<div class="empty">No routing data</div>`;

    return html`
      ${this._renderTitle()}
      ${this._renderScoreHeader()}
      <pages-table
        .dataSet=${this.dataSet}
        .columnConfig=${TABLE_CONFIG}
        .columnRenderers=${this._renderers}
        client-sort
        @row-activate=${this._handleRowActivate}
      ></pages-table>
      ${this._renderPolicySummary()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-routing-rationale': RoutingRationale;
  }
}
