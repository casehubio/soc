import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { DataSourceMixin, TrendSourceMixin } from '@casehubio/pages-component';
import { emitPagesEvent } from '@casehubio/pages-data';
import { renderSparkline } from '@casehubio/pages-ui-components';
import { LiveRegionMixin } from '@casehubio/pages-primitives/a11y';
import type { TrustScoreResponse, TrustLevel } from './types.js';
import { trustLevelFromScore } from './types.js';
import '@casehubio/pages-table';
import type { TableColumnConfig, ColumnRenderer } from '@casehubio/pages-table';
import type { SourceFactory } from '@casehubio/pages-data';
import { fromRows } from '@casehubio/pages-data';
import { columnId, ColumnType } from '@casehubio/pages-data';
import type { CellValue, ColumnId, TypedRow } from '@casehubio/pages-data';

const TAG_COL = columnId('tag');
const SCORE_COL = columnId('score');

const TRUST_LEVEL_COLORS: Record<string, string> = {
  high: 'var(--color-success, #28a745)',
  adequate: 'var(--color-warning, #ffc107)',
  low: 'var(--color-error, #dc3545)',
  none: 'var(--color-neutral, #ccc)',
};

export interface TrustScorePanelProps {
  actorId?: string;
  mode: 'full' | 'compact';
  score?: number;
  trustLevel?: TrustLevel;
}

@customElement('agency-trust-score-panel')
export class TrustScorePanel extends TrendSourceMixin(DataSourceMixin(LiveRegionMixin(LitElement))) {
  @property({ type: String, attribute: 'actor-id' }) actorId?: string;
  @property({ type: String }) mode: 'full' | 'compact' = 'full';
  @property({ type: Number }) score?: number;
  @property({ type: String }) trustLevel?: TrustLevel;

  @state() private _rawTrustData: TrustScoreResponse | null = null;

  static override styles = css`
    :host {
      display: block;
      font-family: var(--font-family-base, system-ui, sans-serif);
    }

    .trust-score-panel {
      padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
    }

    .error-message {
      color: var(--color-error, #c41e3a);
      padding: var(--spacing-md, 16px);
      background: var(--color-error-bg, #fee);
      border-radius: var(--border-radius-sm, 4px);
    }

    .loading-spinner {
      text-align: center;
      padding: var(--spacing-lg, 24px);
      color: var(--color-text-secondary, #666);
    }

    /* Full mode layout */
    .full-mode {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs, 4px);
    }

    .capability-section h3 {
      margin: 0 0 var(--spacing-xs, 4px) 0;
      font-size: var(--font-size-sm, 13px);
      font-weight: var(--font-weight-semibold, 600);
      color: var(--color-text-secondary, #666);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .trend-section h3 {
      margin: 0 0 var(--spacing-xs, 4px) 0;
      font-size: var(--font-size-sm, 13px);
      font-weight: var(--font-weight-semibold, 600);
      color: var(--color-text-secondary, #666);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Compact mode badge */
    .compact-with-trend {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .compact-with-trend svg {
      display: block;
    }

    .trust-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
      border-radius: var(--border-radius-sm, 4px);
      font-size: var(--font-size-sm, 14px);
      font-weight: var(--font-weight-semibold, 600);
      min-width: 48px;
    }

    .trust-badge.high {
      background: var(--color-success-bg, #d4edda);
      color: var(--color-success-text, #155724);
    }

    .trust-badge.adequate {
      background: var(--color-warning-bg, #fff3cd);
      color: var(--color-warning-text, #856404);
    }

    .trust-badge.low {
      background: var(--color-error-bg, #f8d7da);
      color: var(--color-error-text, #721c24);
    }

    .trust-badge.none {
      background: var(--color-neutral-bg, #e9ecef);
      color: var(--color-text-secondary, #666);
    }

    .score-bar {
      width: 100px;
      height: 8px;
      background: var(--color-neutral-bg, #e9ecef);
      border-radius: var(--border-radius-sm, 4px);
      overflow: hidden;
    }

    .score-bar-fill {
      height: 100%;
      transition: width 0.3s ease;
    }

    .score-bar-fill.high {
      background: var(--color-success, #28a745);
    }

    .score-bar-fill.adequate {
      background: var(--color-warning, #ffc107);
    }

    .score-bar-fill.low {
      background: var(--color-error, #dc3545);
    }
  `;

  override createSourceFactory(): SourceFactory {
    return (url) => {
      let abort: AbortController | undefined;
      return {
        connect: (sink) => {
          abort = new AbortController();
          const signal = abort.signal;
          globalThis.fetch(url, { signal })
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then((data: TrustScoreResponse) => {
              if (signal.aborted) return;
              this._rawTrustData = data;
              const capabilities = Object.entries(data.capabilityScores ?? {}).map(([tag, score]) => ({ tag, score }));
              const dataset = fromRows(capabilities, [
                { id: TAG_COL, name: 'Capability', type: ColumnType.TEXT, getValue: (c: { tag: string; score: number }) => c.tag },
                { id: SCORE_COL, name: 'Score', type: ColumnType.NUMBER, getValue: (c: { tag: string; score: number }) => c.score },
              ]);
              sink.apply({ type: 'snapshot', dataset });
            })
            .catch(err => {
              if (signal.aborted || err.name === 'AbortError') return;
              sink.error({ message: err instanceof Error ? err.message : String(err), permanent: true });
            });
        },
        disconnect: () => { abort?.abort(); abort = undefined; },
      };
    };
  }

  override resolveEndpoint(): string | undefined {
    if (this._hasPreFetchedData()) return undefined;
    if (!this.endpoint || !this.actorId) return undefined;
    return `${this.endpoint}/trust/${this.actorId}`;
  }

  override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('actorId')) this.syncEndpoint();
  }

  private _hasPreFetchedData(): boolean {
    return this.mode === 'compact' && this.score !== undefined && this.trustLevel !== undefined;
  }

  private get _trustData(): TrustScoreResponse | null {
    return this._rawTrustData;
  }

  private _getDisplayScore(): number | undefined {
    if (this.score !== undefined) return this.score;
    return this._trustData?.globalScore;
  }

  private _getDisplayTrustLevel(): TrustLevel {
    if (this.trustLevel) return this.trustLevel;
    return trustLevelFromScore(this._trustData?.globalScore);
  }

  private _renderCompactMode() {
    const score = this._getDisplayScore();
    const level = this._getDisplayTrustLevel();
    const points = this.trendPoints;
    const hasTrend = points.length >= 2;
    const label = score !== undefined
      ? `Trust score ${score.toFixed(2)}, ${level} trust${hasTrend ? `, ${points.length} trend points` : ''}`
      : 'No trust data';

    const color = TRUST_LEVEL_COLORS[level];

    return html`
      <div class="compact-with-trend" role="img" aria-label=${label}>
        <div class="trust-badge ${level}">
          ${score !== undefined ? score.toFixed(2) : '—'}
        </div>
        ${hasTrend
          ? renderSparkline(points.map(p => p.score), { width: 80, height: 24, ...(color != null ? { color } : {}), domain: [0, 1] })
          : nothing}
      </div>
    `;
  }

  private _renderScoreHeader() {
    const score = this._getDisplayScore();
    const level = this._getDisplayTrustLevel();
    const label = score !== undefined
      ? `Trust score ${score.toFixed(2)}, ${level} trust`
      : 'No trust data available';

    if (score === undefined) {
      return html`<div class="score-header" role="img" aria-label="No trust data available">
        <span class="score-value" style="color: var(--color-text-secondary, #666);">—</span>
        <span class="score-level none">No data</span>
      </div>`;
    }

    const colors: Record<string, string> = {
      high: 'var(--color-success, #28a745)',
      adequate: 'var(--color-warning, #ffc107)',
      low: 'var(--color-error, #dc3545)',
      none: 'var(--color-neutral, #ccc)',
    };

    const bgColors: Record<string, string> = {
      high: 'var(--color-success-bg, #d4edda)',
      adequate: 'var(--color-warning-bg, #fff3cd)',
      low: 'var(--color-error-bg, #f8d7da)',
      none: 'var(--color-neutral-bg, #e9ecef)',
    };

    const textColors: Record<string, string> = {
      high: 'var(--color-success-text, #155724)',
      adequate: 'var(--color-warning-text, #856404)',
      low: 'var(--color-error-text, #721c24)',
      none: 'var(--color-text-secondary, #666)',
    };

    return html`
      <div class="score-header" role="img" aria-label=${label}>
        <span class="score-value">${score.toFixed(2)}</span>
        <span class="score-level" style="background: ${bgColors[level]}; color: ${textColors[level]};">${level}</span>
        <div class="score-bar-track">
          <div class="fill" style="width: ${Math.round(score * 100)}%; background: ${colors[level]};"></div>
        </div>
      </div>
    `;
  }

  private _capabilityRenderers: ReadonlyMap<ColumnId, ColumnRenderer> = new Map([
    [SCORE_COL, (cell: CellValue) => {
      const numValue = cell.type === 'NULL' ? 0 : (cell as { value: number }).value;
      const level = trustLevelFromScore(numValue);
      return html`
        <div class="score-bar">
          <div
            class="score-bar-fill ${level}"
            style="width: ${numValue * 100}%"
          ></div>
        </div>
        <span style="margin-left: 8px">${numValue.toFixed(2)}</span>
      `;
    }],
  ]);

  private _capabilityConfig: readonly TableColumnConfig[] = [
    { id: TAG_COL, sortable: true },
    { id: SCORE_COL, sortable: true },
  ];

  private _renderCapabilityTable() {
    if (!this.dataSet || this.dataSet.rows.length === 0) {
      return html`<p>No capability scores available</p>`;
    }

    return html`
      <pages-table
        .dataSet=${this.dataSet}
        .columnConfig=${this._capabilityConfig}
        .columnRenderers=${this._capabilityRenderers}
        client-sort
        @row-activate=${this._handleCapabilityClick}
      ></pages-table>
    `;
  }

  private _handleCapabilityClick(e: CustomEvent) {
    const row = e.detail.row as TypedRow;
    const tag = row.text(TAG_COL);
    const score = row.number(SCORE_COL);
    emitPagesEvent(this, 'trust:capability-selected', { tag, score, actorId: this.actorId });
  }

  private _renderTrendSection() {
    if (this.trendLoading) {
      return html`<div class="loading-spinner">Loading trend data...</div>`;
    }
    if (this.trendError) {
      return html`<div class="error-message" role="alert">
        Failed to load trend data: ${this.trendError}
      </div>`;
    }
    const points = this.trendPoints;
    if (points.length < 2) {
      return nothing;
    }
    const scores = points.map(p => p.score);
    const level = this._getDisplayTrustLevel();
    const color = TRUST_LEVEL_COLORS[level];
    const currentScore = this._getDisplayScore();
    const label = `Trust score trend: ${points.length} data points${
      currentScore !== undefined ? `, current ${currentScore.toFixed(2)}` : ''
    }`;
    return html`
      <div role="img" aria-label=${label}>
        ${renderSparkline(scores, { width: 200, height: 48, ...(color != null ? { color } : {}), domain: [0, 1] })}
      </div>
    `;
  }

  private _renderFullMode() {
    if (this.loading) {
      return html`<div class="loading-spinner">Loading trust scores...</div>`;
    }

    if (this.error) {
      return html`
        <div class="error-message" role="alert">
          Failed to load trust scores: ${this.error}
        </div>
      `;
    }

    return html`
      <div class="full-mode">
        ${this._renderScoreHeader()}

        <section class="capability-section">
          <h3>Per-Capability Breakdown</h3>
          ${this._renderCapabilityTable()}
        </section>

        ${this.trendPoints.length >= 2 ? html`
          <section class="trend-section">
            <h3>Trend</h3>
            ${this._renderTrendSection()}
          </section>
        ` : nothing}
      </div>
    `;
  }

  override render() {
    return html`
      <div class="trust-score-panel">
        ${this.mode === 'compact' ? this._renderCompactMode() : this._renderFullMode()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-trust-score-panel': TrustScorePanel;
  }
}
