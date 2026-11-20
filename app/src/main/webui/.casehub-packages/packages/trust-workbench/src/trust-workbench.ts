import { LitElement, html, css, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LiveRegionMixin } from '@casehubio/pages-primitives/a11y';
import { onPagesEvent } from '@casehubio/pages-data';
import type { TableColumnConfig, ColumnRenderer } from '@casehubio/pages-table';
import type { ColumnId, TypedRow, TypedDataSet } from '@casehubio/pages-data';
import type { CandidateScore } from '@casehubio/mosaic-routing-rationale';
import type { GateDecision } from '@casehubio/mosaic-trust-feedback-display';
import type { RoutingRationaleData } from '@casehubio/mosaic-routing-rationale';
import { fromRows } from '@casehubio/pages-data';
import { ID_COL, ROUTING_HISTORY_COLUMNS, ROUTING_HISTORY_TABLE_CONFIG, DEFAULT_ROUTING_RENDERERS } from './columns.js';
import type { RoutingDecisionSummary, RoutingDecisionDetail } from './types.js';
import '@casehubio/pages-ui-components/split-workbench';
import '@casehubio/mosaic-trust-score-panel';
import '@casehubio/mosaic-list-pane';
import '@casehubio/mosaic-routing-rationale';
import '@casehubio/mosaic-trust-feedback-display';

export interface TrustWorkbenchProps {
  endpoint: string;
  actorId: string;
}

@customElement('agency-trust-workbench')
export class TrustWorkbench extends LiveRegionMixin(LitElement) {
  @property({ type: String }) endpoint = '';
  @property({ type: String, attribute: 'actor-id' }) actorId = '';

  @property({ attribute: false }) routingColumns?: readonly TableColumnConfig[];
  @property({ attribute: false }) routingColumnRenderers?: ReadonlyMap<ColumnId, ColumnRenderer>;
  @property({ attribute: false }) renderCandidate?: (candidate: CandidateScore) => TemplateResult | undefined;

  @property({ attribute: false }) routingHistory?: readonly RoutingDecisionSummary[];
  @property({ attribute: false }) routingDetailResolver?: (id: string) => Promise<RoutingDecisionDetail>;

  @state() _selectedCapability: string | null = null;
  @state() private _listDataSet: TypedDataSet | undefined;
  @state() _selectedDecisionId: string | null = null;
  @state() _routingDetail: RoutingRationaleData | null = null;
  @state() _feedbackEntries: readonly GateDecision[] = [];
  @state() _detailLoading = false;
  @state() _detailError: string | null = null;

  private _unsubs: Array<() => void> = [];
  private _abortController: AbortController | null = null;

  static override styles = css`
    :host { display: block; height: 100%; font-family: var(--pages-font-family, system-ui); }
    split-workbench { height: 100%; }
    .left-panel { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
    .left-panel trust-score-panel { flex-shrink: 0; border-bottom: 1px solid var(--pages-neutral-4, #d4d4d4); }
    .left-panel list-pane { flex: 1; overflow: hidden; }
    .detail-panel { display: flex; flex-direction: column; height: 100%; overflow-y: auto; padding-left: var(--pages-space-3, 12px); }
    .feedback-section { border-top: 1px solid var(--pages-neutral-4, #d4d4d4); padding: var(--pages-space-3, 12px); }
    .feedback-section h3 {
      margin: 0 0 var(--pages-space-2, 8px) 0;
      font-size: var(--pages-font-size-sm, 12px);
      font-weight: 600;
      color: var(--pages-neutral-9, #525252);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .feedback-list { display: flex; flex-direction: column; gap: var(--pages-space-2, 8px); }
    .detail-empty {
      display: flex; align-items: center; justify-content: center;
      height: 100%; color: var(--pages-neutral-7, #525252);
      font-size: var(--pages-font-size-sm, 12px);
    }
    .detail-loading {
      display: flex; align-items: center; justify-content: center;
      height: 100%; color: var(--pages-neutral-7, #525252);
    }
    .detail-error {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      height: 100%; color: var(--pages-danger-9, #dc2626); gap: var(--pages-space-2, 8px);
    }
    .detail-error button {
      padding: 4px 12px; border: 1px solid var(--pages-neutral-4, #d4d4d4);
      background: var(--pages-neutral-1, #fafafa); border-radius: 4px; cursor: pointer;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this._unsubs.push(
      onPagesEvent<{ tag: string }>(document, 'trust:capability-selected', (payload) => {
        this._handleCapabilitySelected(payload);
      }),
      onPagesEvent(document, 'trust-routing:selected', (payload: TypedRow) => {
        this._handleDecisionSelected(payload);
      }),
      onPagesEvent(document, 'trust-routing:deselected', () => {
        this._clearDetail();
      }),
    );
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubs.forEach(u => u());
    this._unsubs = [];
    this._abortController?.abort();
  }

  override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('actorId') && changed.get('actorId') !== undefined) {
      this._resetAllState();
    }
    if (changed.has('routingHistory') || changed.has('_selectedCapability')) {
      this._listDataSet = this._computeListDataSet();
    }
  }

  private _resetAllState(): void {
    this._selectedCapability = null;
    this._selectedDecisionId = null;
    this._routingDetail = null;
    this._feedbackEntries = [];
    this._detailLoading = false;
    this._detailError = null;
    this._abortController?.abort();
    this.announce('Trust data reset');
  }

  private _clearDetail(): void {
    this._selectedDecisionId = null;
    this._routingDetail = null;
    this._feedbackEntries = [];
    this._detailLoading = false;
    this._detailError = null;
  }

  private _handleCapabilitySelected(data: { tag: string }): void {
    if (data.tag === this._selectedCapability) {
      this._selectedCapability = null;
      this.announce('Showing all routing decisions');
    } else {
      this._selectedCapability = data.tag;
      this.announce(`Filtered to ${data.tag}`);
    }
    this._clearDetail();
  }

  private _handleDecisionSelected(row: TypedRow | { text: (col: unknown) => string }): void {
    const id = (row as TypedRow).text(ID_COL);
    if (!id) return;
    this._selectedDecisionId = id;
    this.announce('Loading routing detail');
    this._fetchDetail(id);
  }

  private async _fetchDetail(decisionId: string): Promise<void> {
    this._abortController?.abort();
    this._abortController = new AbortController();
    this._detailLoading = true;
    this._detailError = null;

    try {
      let detail: RoutingDecisionDetail;
      if (this.routingDetailResolver) {
        detail = await this.routingDetailResolver(decisionId);
      } else {
        const url = `${this.endpoint}/trust/${this.actorId}/routing-history/${decisionId}`;
        const response = await fetch(url, { signal: this._abortController.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        detail = await response.json();
      }
      if (this._abortController.signal.aborted) return;
      this._routingDetail = detail.rationale;
      this._feedbackEntries = detail.feedback;
      this._detailLoading = false;
      this.announce(`Routing detail loaded for ${detail.rationale.selected.workerId}`);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      this._detailLoading = false;
      this._detailError = err instanceof Error ? err.message : String(err);
      this.announce(`Failed to load routing detail: ${this._detailError}`);
    }
  }

  private _computeListDataSet(): TypedDataSet | undefined {
    if (!this.routingHistory) return undefined;
    const source = this._selectedCapability
      ? this.routingHistory.filter(s => s.capabilityTag === this._selectedCapability)
      : this.routingHistory;
    return fromRows([...source], ROUTING_HISTORY_COLUMNS);
  }

  private get _listEndpoint(): string | undefined {
    if (this.routingHistory) return undefined;
    return this._routingEndpoint;
  }

  private _retryDetail(): void {
    if (this._selectedDecisionId) {
      this._fetchDetail(this._selectedDecisionId);
    }
  }

  private get _routingEndpoint(): string | undefined {
    if (this.routingHistory) return undefined;
    if (this.endpoint == null || !this.actorId) return undefined;
    const base = `${this.endpoint}/trust/${this.actorId}/routing-history`;
    return this._selectedCapability ? `${base}?capability=${this._selectedCapability}` : base;
  }

  override render(): TemplateResult {
    return html`
      <pages-split-workbench selection-topic="trust-routing">
        <div slot="list" class="left-panel">
          <agency-trust-score-panel
            mode="full"
            .endpoint=${this.endpoint}
            actor-id=${this.actorId}
          ></agency-trust-score-panel>
          <agency-list-pane
            selection-topic="trust-routing"
            .endpoint=${this._listEndpoint}
            .dataSet=${this._listDataSet}
            .columnConfig=${this.routingColumns ?? ROUTING_HISTORY_TABLE_CONFIG}
            .columnRenderers=${this.routingColumnRenderers ?? DEFAULT_ROUTING_RENDERERS}
            .getRowKey=${(row: TypedRow) => row.text(ID_COL)}
            empty-message="No routing decisions"
          ></agency-list-pane>
        </div>
        <div slot="detail" class="detail-panel">
          ${this._renderDetail()}
        </div>
      </pages-split-workbench>
    `;
  }

  private _renderDetail(): TemplateResult | typeof nothing {
    if (this._detailLoading) {
      return html`<div class="detail-loading" role="status">Loading routing detail...</div>`;
    }
    if (this._detailError) {
      return html`
        <div class="detail-error" role="alert">
          <span>Failed to load routing detail: ${this._detailError}</span>
          <button @click=${() => this._retryDetail()}>Retry</button>
        </div>
      `;
    }
    if (!this._routingDetail) {
      return html`<div class="detail-empty">Select a routing decision to view details</div>`;
    }
    return html`
      <agency-routing-rationale
        .data=${this._routingDetail}
        .renderCandidate=${this.renderCandidate}
      ></agency-routing-rationale>
      ${this._feedbackEntries.length > 0 ? html`
        <section class="feedback-section">
          <h3>Feedback</h3>
          <div class="feedback-list">
            ${this._feedbackEntries.map(fb => html`
              <agency-trust-feedback-display compact .gateDecision=${fb}></agency-trust-feedback-display>
            `)}
          </div>
        </section>
      ` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-trust-workbench': TrustWorkbench;
  }
}
