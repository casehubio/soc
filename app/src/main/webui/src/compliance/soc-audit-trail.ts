import { LitElement, html, css, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { renderPropertyTree, propertyTreeStyles } from "@casehubio/pages-ui-components";
import "@casehubio/pages-table";
import { fromRows } from "@casehubio/pages-data/dist/dataset/conversion.js";
import { columnId, ColumnType } from "@casehubio/pages-data/dist/dataset/types.js";
import type {
  CellValue,
  TypedRow,
  TypedDataSet,
} from "@casehubio/pages-data/dist/dataset/types.js";
import type { TableColumnConfig, ColumnRenderer } from "@casehubio/pages-table";

interface AuditEntry {
  id: string;
  incidentId: string;
  stepType: string;
  sequenceNumber: number;
  actorId: string | null;
  actorType: string | null;
  actorRole: string | null;
  occurredAt: string;
  metadata: string | null;
  causedByEntryId: string | null;
}

interface PagedResponse {
  content: AuditEntry[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

const ID_COL = columnId("id");
const OCCURRED_AT_COL = columnId("occurredAt");
const ACTOR_COL = columnId("actorId");
const STEP_TYPE_COL = columnId("stepType");
const INCIDENT_COL = columnId("incidentId");
const SEQ_COL = columnId("seq");

const COLUMNS = [
  { id: ID_COL, type: ColumnType.TEXT, getValue: (e: AuditEntry) => e.id },
  { id: OCCURRED_AT_COL, name: "Timestamp", type: ColumnType.TEXT, getValue: (e: AuditEntry) => e.occurredAt },
  { id: ACTOR_COL, name: "Actor", type: ColumnType.TEXT, getValue: (e: AuditEntry) => e.actorId ?? "" },
  { id: STEP_TYPE_COL, name: "Step Type", type: ColumnType.TEXT, getValue: (e: AuditEntry) => e.stepType },
  { id: INCIDENT_COL, name: "Incident", type: ColumnType.TEXT, getValue: (e: AuditEntry) => e.incidentId },
  { id: SEQ_COL, name: "Seq", type: ColumnType.TEXT, getValue: (e: AuditEntry) => String(e.sequenceNumber) },
] as const;

const TABLE_CONFIG: readonly TableColumnConfig[] = [
  { id: ID_COL, visible: false },
  { id: OCCURRED_AT_COL, sortable: true },
  { id: ACTOR_COL, sortable: true },
  { id: STEP_TYPE_COL, sortable: true },
  { id: INCIDENT_COL, sortable: true },
  { id: SEQ_COL, sortable: false },
];

const STEP_TYPE_COLORS: Record<string, string> = {
  ALERT_TRIAGE: "background:#dbeafe;color:#1e40af;",
  INCIDENT_PROMOTED: "background:#e0e7ff;color:#3730a3;",
  INVESTIGATION_STEP: "background:#f3e8ff;color:#6b21a8;",
  CONTAINMENT_DECISION: "background:#fef3c7;color:#92400e;",
  CONTAINMENT_EXECUTED: "background:#fed7aa;color:#9a3412;",
  INCIDENT_RESOLVED: "background:#d1fae5;color:#065f46;",
};

const RENDERERS: ReadonlyMap<typeof ID_COL, ColumnRenderer> = new Map([
  [OCCURRED_AT_COL, (cell: CellValue) => {
    if (cell.type === "NULL") return "";
    return html`<span>${new Date((cell as { value: string }).value).toLocaleString()}</span>`;
  }],
  [ACTOR_COL, (cell: CellValue) => {
    if (cell.type === "NULL" || !(cell as { value: string }).value)
      return html`<span style="font-style:italic;color:#9ca3af;">Redacted</span>`;
    return html`<span>${(cell as { value: string }).value}</span>`;
  }],
  [STEP_TYPE_COL, (cell: CellValue) => {
    if (cell.type === "NULL") return "";
    const val = (cell as { value: string }).value;
    const style = STEP_TYPE_COLORS[val] ?? "";
    return html`<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;${style}">${val}</span>`;
  }],
  [INCIDENT_COL, (cell: CellValue) => {
    if (cell.type === "NULL") return "";
    const id = (cell as { value: string }).value;
    const short = id.substring(0, 8);
    return html`<a href="#incidents/${id}" style="color:#3b82f6;text-decoration:none;font-family:monospace;font-size:13px;">${short}...</a>`;
  }],
]);

@customElement("soc-audit-trail")
export class SocAuditTrail extends LitElement {
  @property({ type: String }) endpoint = "/api/soc/compliance";

  @state() private _entries: AuditEntry[] = [];
  @state() private _dataSet: TypedDataSet | null = null;
  @state() private _loading = false;
  @state() private _error = "";
  @state() private _page = 0;
  @state() private _totalPages = 0;
  @state() private _totalElements = 0;
  @state() private _size = 50;

  @state() private _dateFrom = "";
  @state() private _dateTo = "";
  @state() private _stepTypeFilter = "";
  @state() private _actorFilter = "";
  @state() private _actors: string[] = [];

  @state() private _expandedId: string | null = null;
  @state() private _proofResults = new Map<string, { verified: boolean; treeRoot: string } | null>();

  override connectedCallback(): void {
    super.connectedCallback();
    this._fetchEntries();
    this._fetchActors();
  }

  private async _fetchEntries(): Promise<void> {
    this._loading = true;
    this._error = "";
    try {
      const params = new URLSearchParams();
      if (this._dateFrom) params.set("from", new Date(this._dateFrom).toISOString());
      if (this._dateTo) params.set("to", new Date(this._dateTo).toISOString());
      if (this._stepTypeFilter) params.set("stepType", this._stepTypeFilter);
      if (this._actorFilter) params.set("actorId", this._actorFilter);
      params.set("page", String(this._page));
      params.set("size", String(this._size));

      const resp = await fetch(`${this.endpoint}/entries?${params}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: PagedResponse = await resp.json();
      this._entries = data.content;
      this._totalPages = data.totalPages;
      this._totalElements = data.totalElements;
      this._dataSet = fromRows(data.content, COLUMNS);
    } catch (e) {
      this._error = e instanceof Error ? e.message : "Failed to load";
    } finally {
      this._loading = false;
    }
  }

  private async _fetchActors(): Promise<void> {
    try {
      const params = new URLSearchParams();
      if (this._dateFrom) params.set("from", new Date(this._dateFrom).toISOString());
      if (this._dateTo) params.set("to", new Date(this._dateTo).toISOString());
      const resp = await fetch(`${this.endpoint}/entries/actors?${params}`);
      if (resp.ok) this._actors = await resp.json();
    } catch { /* non-critical */ }
  }

  private _onFilterChange(): void {
    this._page = 0;
    this._fetchEntries();
    this._fetchActors();
  }

  private _onPageChange(delta: number): void {
    this._page = Math.max(0, Math.min(this._page + delta, this._totalPages - 1));
    this._fetchEntries();
  }

  private async _verifyProof(entryId: string): Promise<void> {
    try {
      const resp = await fetch(`${this.endpoint}/proof/${entryId}`);
      if (!resp.ok) {
        this._proofResults = new Map(this._proofResults).set(entryId, null);
        return;
      }
      const data = await resp.json();
      this._proofResults = new Map(this._proofResults).set(entryId, {
        verified: true,
        treeRoot: data.root ?? data.treeRoot ?? "",
      });
    } catch {
      this._proofResults = new Map(this._proofResults).set(entryId, null);
    }
  }

  private _handleDetailChange(e: CustomEvent): void {
    const { key, expanded } = e.detail as { key: string; expanded: boolean };
    this._expandedId = expanded ? key : null;
  }

  private _getRowDetail = (row: TypedRow): TemplateResult | undefined => {
    const entryId = row.text(ID_COL);
    const entry = this._entries.find((e) => e.id === entryId);
    if (!entry) return undefined;

    const proof = this._proofResults.get(entryId);
    let parsed: unknown = null;
    if (entry.metadata != null) {
      try { parsed = JSON.parse(entry.metadata); } catch { parsed = entry.metadata; }
    }

    return html`
      <div style="padding:16px;background:#fafbfc;border-left:3px solid #3b82f6;">
        ${parsed != null
          ? html`<div style="margin-bottom:12px;"><strong style="font-size:13px;">Metadata</strong>${renderPropertyTree(parsed)}</div>`
          : html`<div style="font-style:italic;color:#9ca3af;">Content redacted</div>`}
        ${entry.causedByEntryId
          ? html`<div style="margin-bottom:12px;"><strong style="font-size:13px;">Caused By</strong> <code>${entry.causedByEntryId}</code></div>`
          : nothing}
        <div>
          ${proof === undefined
            ? html`<button @click=${() => this._verifyProof(entryId)}
                style="padding:6px 12px;border:1px solid #d1d5db;border-radius:4px;background:#fff;cursor:pointer;font-size:13px;">
                Verify Merkle Proof</button>`
            : proof === null
              ? html`<div style="padding:8px;background:#fdeeed;color:#b91c1c;border-radius:4px;">Verification failed</div>`
              : html`<div style="padding:8px;background:#e6f7ed;color:#0d5a2e;border-radius:4px;">
                  Chain verified <code style="margin-left:8px;font-size:12px;opacity:0.7;">${proof.treeRoot}</code></div>`}
        </div>
      </div>
    `;
  };

  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); padding: 1rem; }
    .filters { display: flex; gap: 16px; padding: 12px; background: var(--pages-neutral-2, #f8f9fa); border-radius: 4px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
    .filter-group { display: flex; align-items: center; gap: 8px; }
    .filter-group label { font-weight: 500; font-size: 14px; }
    select, input[type="date"] { padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; }
    .pagination { display: flex; align-items: center; gap: 12px; margin-top: 12px; font-size: 14px; }
    .pagination button { padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 4px; background: #fff; cursor: pointer; }
    .pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
    ${propertyTreeStyles}
  `;

  override render() {
    if (this._loading && this._entries.length === 0) {
      return html`<div style="padding:24px;text-align:center;">Loading audit trail...</div>`;
    }
    if (this._error) {
      return html`<div style="padding:24px;text-align:center;color:#b91c1c;">
        Failed to load: ${this._error}
        <button @click=${() => this._fetchEntries()} style="margin-left:12px;padding:6px 12px;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;">Retry</button>
      </div>`;
    }

    return html`
      <div class="filters">
        <div class="filter-group">
          <label>From:</label>
          <input type="date" .value=${this._dateFrom} @change=${(e: Event) => { this._dateFrom = (e.target as HTMLInputElement).value; this._onFilterChange(); }} />
        </div>
        <div class="filter-group">
          <label>To:</label>
          <input type="date" .value=${this._dateTo} @change=${(e: Event) => { this._dateTo = (e.target as HTMLInputElement).value; this._onFilterChange(); }} />
        </div>
        <div class="filter-group">
          <label>Step Type:</label>
          <select @change=${(e: Event) => { this._stepTypeFilter = (e.target as HTMLSelectElement).value; this._onFilterChange(); }}>
            <option value="">All</option>
            ${["ALERT_TRIAGE", "INCIDENT_PROMOTED", "INVESTIGATION_STEP", "CONTAINMENT_DECISION", "CONTAINMENT_EXECUTED", "INCIDENT_RESOLVED"]
              .map((t) => html`<option value=${t} ?selected=${this._stepTypeFilter === t}>${t}</option>`)}
          </select>
        </div>
        <div class="filter-group">
          <label>Actor:</label>
          <select @change=${(e: Event) => { this._actorFilter = (e.target as HTMLSelectElement).value; this._onFilterChange(); }}>
            <option value="">All actors</option>
            ${this._actors.map((a) => html`<option value=${a} ?selected=${this._actorFilter === a}>${a}</option>`)}
          </select>
        </div>
      </div>

      ${this._dataSet
        ? html`
            <pages-table
              .dataSet=${this._dataSet}
              .columnConfig=${TABLE_CONFIG}
              .columnRenderers=${RENDERERS}
              .getRowKey=${(row: TypedRow) => row.text(ID_COL)}
              .getRowDetail=${this._getRowDetail}
              detailMode="single"
              .expandedDetailKeys=${this._expandedId ? [this._expandedId] : []}
              client-sort
              @detail-change=${this._handleDetailChange}
            ></pages-table>`
        : nothing}

      <div class="pagination">
        <button ?disabled=${this._page === 0} @click=${() => this._onPageChange(-1)}>Prev</button>
        <span>Page ${this._page + 1} of ${this._totalPages} (${this._totalElements} entries)</span>
        <button ?disabled=${this._page >= this._totalPages - 1} @click=${() => this._onPageChange(1)}>Next</button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "soc-audit-trail": SocAuditTrail;
  }
}
