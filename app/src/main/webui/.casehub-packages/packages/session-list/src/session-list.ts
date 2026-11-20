import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { emitPagesEvent, onPagesEvent } from '@casehubio/pages-data';
import { KeyboardShortcutMixin, LiveRegionMixin } from '@casehubio/pages-primitives/a11y';
import '@casehubio/pages-table';
import '@casehubio/pages-ui-components/status-badge';
import type { TableColumnConfig, ColumnRenderer, RowActivateDetail } from '@casehubio/pages-table';
import { fromRows } from '@casehubio/pages-data';
import { columnId, ColumnType } from '@casehubio/pages-data';
import type { CellValue, TypedDataSet, TypedRow } from '@casehubio/pages-data';
import type { SessionResponse, CreateSessionRequest } from './types.js';
import { SessionEventTopics } from './types.js';

const NAME_COL = columnId('name');
const STATUS_COL = columnId('status');
const WORKDIR_COL = columnId('workingDir');
const CREATED_COL = columnId('created');
const ID_COL = columnId('id');

const SESSION_COL_DEFS = [
  { id: ID_COL, type: ColumnType.TEXT, getValue: (row: SessionResponse) => row.id },
  { id: NAME_COL, name: 'Name', type: ColumnType.TEXT, getValue: (row: SessionResponse) => row.name },
  { id: STATUS_COL, name: 'Status', type: ColumnType.TEXT, getValue: (row: SessionResponse) => row.status },
  { id: WORKDIR_COL, name: 'Working Dir', type: ColumnType.TEXT, getValue: (row: SessionResponse) => row.workingDir },
  { id: CREATED_COL, name: 'Created', type: ColumnType.DATE, getValue: (row: SessionResponse) => row.createdAt },
] as const;

const SESSION_COL_CONFIG: readonly TableColumnConfig[] = [
  { id: ID_COL, visible: false },
  { id: NAME_COL, sortable: true, width: '2fr' },
  { id: STATUS_COL, sortable: true, width: '1fr' },
  { id: WORKDIR_COL, sortable: true, width: '2fr' },
  { id: CREATED_COL, sortable: true, width: '1fr' },
];

const SessionListBase = LiveRegionMixin(KeyboardShortcutMixin(LitElement));

export interface SessionListProps {
  endpoint: string;
}

@customElement('agency-session-list')
export class SessionList extends SessionListBase {
  @property({ type: String }) endpoint = '';

  @state() _sessions: SessionResponse[] = [];
  @state() private _tableData: TypedDataSet | undefined;
  @state() private _selectedKeys: readonly string[] = [];
  @state() private _loading = false;
  @state() private _error: string | null = null;
  @state() private _showSpawnForm = false;
  @state() private _spawnName = '';
  @state() private _spawnWorkDir = '';
  @state() _restartError: { name: string; workingDir: string; command: string } | null = null;

  private _columnRenderers = new Map([
    [STATUS_COL, (cell: CellValue) => {
      const status = cell.type === 'NULL' ? '' : (cell as { value: string }).value;
      return html`<pages-status-badge domain="session" state=${status} size="sm" showIcon></pages-status-badge>`;
    }],
  ]) as ReadonlyMap<typeof NAME_COL | typeof STATUS_COL, ColumnRenderer>;

  private _unsubs: Array<() => void> = [];

  override connectedCallback(): void {
    super.connectedCallback();
    this._fetchSessions();
    this._unsubs.push(
      onPagesEvent(document, SessionEventTopics.REFRESH, () => { this._fetchSessions(); }),
      onPagesEvent(document, SessionEventTopics.DESELECTED, () => { this._selectedKeys = []; }),
    );
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubs.forEach(u => u());
    this._unsubs = [];
  }

  private async _fetchSessions(): Promise<void> {
    this._loading = true;
    this._error = null;
    try {
      const res = await fetch(this.endpoint);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      this._sessions = await res.json() as SessionResponse[];
      this._tableData = fromRows(this._sessions, SESSION_COL_DEFS);
    } catch (e) {
      this._error = (e as Error).message;
    } finally {
      this._loading = false;
    }
  }

  private async _handleCreate(): Promise<void> {
    if (!this._spawnName.trim()) return;
    const req: CreateSessionRequest = {
      name: this._spawnName.trim(),
      ...(this._spawnWorkDir.trim() ? { workingDir: this._spawnWorkDir.trim() } : {}),
    };
    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const created = await res.json() as SessionResponse;
      this._sessions = [created, ...this._sessions];
      this._tableData = fromRows(this._sessions, SESSION_COL_DEFS);
      this._spawnName = '';
      this._spawnWorkDir = '';
      this._showSpawnForm = false;
      emitPagesEvent(this, SessionEventTopics.CHANGED, { action: 'created' });
    } catch (e) {
      this._error = (e as Error).message;
    }
  }

  async _handleDelete(id: string): Promise<void> {
    try {
      const res = await fetch(`${this.endpoint}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      this._sessions = this._sessions.filter(s => s.id !== id);
      this._tableData = fromRows(this._sessions, SESSION_COL_DEFS);
      emitPagesEvent(this, SessionEventTopics.DESELECTED, {});
      emitPagesEvent(this, SessionEventTopics.CHANGED, { action: 'deleted' });
    } catch (e) {
      this._error = (e as Error).message;
    }
  }

  async _handleRestart(id: string): Promise<void> {
    const session = this._sessions.find(s => s.id === id);
    if (!session) return;
    const captured = { name: session.name, workingDir: session.workingDir, command: session.command };
    try {
      const delRes = await fetch(`${this.endpoint}/${id}`, { method: 'DELETE' });
      if (!delRes.ok) throw new Error(`Delete failed: ${delRes.status}`);
      this._sessions = this._sessions.filter(s => s.id !== id);
      this._tableData = fromRows(this._sessions, SESSION_COL_DEFS);
    } catch (e) {
      this._error = (e as Error).message;
      return;
    }
    try {
      const req: CreateSessionRequest = { name: captured.name, workingDir: captured.workingDir, command: captured.command };
      const createRes = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (!createRes.ok) throw new Error(`Create failed: ${createRes.status}`);
      const created = await createRes.json() as SessionResponse;
      this._sessions = [created, ...this._sessions];
      this._tableData = fromRows(this._sessions, SESSION_COL_DEFS);
      this._restartError = null;
      emitPagesEvent(this, SessionEventTopics.CHANGED, { action: 'restarted' });
    } catch {
      this._restartError = captured;
    }
  }

  private async _retryCreate(): Promise<void> {
    if (!this._restartError) return;
    const req: CreateSessionRequest = {
      name: this._restartError.name,
      workingDir: this._restartError.workingDir,
      command: this._restartError.command,
    };
    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const created = await res.json() as SessionResponse;
      this._sessions = [created, ...this._sessions];
      this._tableData = fromRows(this._sessions, SESSION_COL_DEFS);
      this._restartError = null;
      emitPagesEvent(this, SessionEventTopics.CHANGED, { action: 'restarted' });
    } catch {
      // Keep the error banner visible
    }
  }

  private _handleRowActivate(e: CustomEvent<RowActivateDetail>): void {
    const { key, row } = e.detail;
    const id = key ?? row?.text(ID_COL);
    if (id) {
      this._selectedKeys = [id];
      emitPagesEvent(this, SessionEventTopics.SELECTED, { id });
    }
  }

  override render() {
    return html`
      <div class="session-list">
        <div class="header">
          <span class="title">Sessions</span>
          <div class="header-actions">
            <button class="icon-btn" @click=${() => this._fetchSessions()} aria-label="Refresh">↻</button>
            <button class="icon-btn" @click=${() => { this._showSpawnForm = !this._showSpawnForm; }} aria-label="New session">+</button>
          </div>
        </div>

        ${this._showSpawnForm ? this._renderSpawnForm() : nothing}
        ${this._restartError ? this._renderRestartError() : nothing}
        ${this._error ? html`<div class="error" role="alert">${this._error}</div>` : nothing}

        <pages-table
          .dataSet=${this._tableData}
          .columnConfig=${SESSION_COL_CONFIG}
          .columnRenderers=${this._columnRenderers}
          .getRowKey=${(row: TypedRow) => row.text(ID_COL)}
          selection="single"
          .selectedKeys=${this._selectedKeys}
          @row-activate=${this._handleRowActivate}
        ></pages-table>
      </div>
    `;
  }

  private _renderSpawnForm() {
    return html`
      <div class="spawn-form">
        <input type="text" placeholder="Session name" .value=${this._spawnName}
          @input=${(e: InputEvent) => { this._spawnName = (e.target as HTMLInputElement).value; }}
          @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter') this._handleCreate(); }}
          aria-label="Session name" />
        <input type="text" placeholder="Working directory (optional)" .value=${this._spawnWorkDir}
          @input=${(e: InputEvent) => { this._spawnWorkDir = (e.target as HTMLInputElement).value; }}
          @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter') this._handleCreate(); }}
          aria-label="Working directory" />
        <button @click=${() => this._handleCreate()}>Create</button>
      </div>
    `;
  }

  private _renderRestartError() {
    return html`
      <div class="restart-error" role="alert">
        <span>Restart failed for "${this._restartError!.name}". Session was deleted but re-creation failed.</span>
        <button @click=${() => this._retryCreate()}>Retry Create</button>
        <button @click=${() => { this._restartError = null; }}>Dismiss</button>
      </div>
    `;
  }

  static override styles = css`
    :host { display: block; height: 100%; font-family: var(--pages-font-family, system-ui); }
    .session-list { display: flex; flex-direction: column; height: 100%; }
    .header { display: flex; justify-content: space-between; align-items: center; padding: var(--pages-space-3, 12px) var(--pages-space-4, 16px); border-bottom: 1px solid var(--pages-neutral-4, #d4d4d4); }
    .title { font-size: var(--pages-font-size-base, 14px); font-weight: 600; color: var(--pages-neutral-11, #0a0a0a); }
    .header-actions { display: flex; gap: var(--pages-space-2, 8px); }
    .icon-btn { background: none; border: 1px solid var(--pages-neutral-5, #a3a3a3); border-radius: 4px; padding: 4px 8px; cursor: pointer; color: var(--pages-neutral-9, #404040); font-size: 14px; }
    .icon-btn:hover { background: var(--pages-neutral-3, #e5e5e5); }
    .spawn-form { display: flex; gap: var(--pages-space-2, 8px); padding: var(--pages-space-3, 12px) var(--pages-space-4, 16px); border-bottom: 1px solid var(--pages-neutral-4, #d4d4d4); background: var(--pages-neutral-2, #f5f5f5); }
    .spawn-form input { flex: 1; padding: 6px 10px; border: 1px solid var(--pages-neutral-5, #a3a3a3); border-radius: 4px; font-size: var(--pages-font-size-sm, 12px); background: var(--pages-neutral-1, #fafafa); color: var(--pages-neutral-12, #0a0a0a); }
    .spawn-form button { padding: 6px 14px; background: var(--pages-accent-9, #2563eb); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: var(--pages-font-size-sm, 12px); }
    .error { padding: var(--pages-space-2, 8px) var(--pages-space-4, 16px); background: var(--pages-danger-3, #fef2f2); color: var(--pages-danger-11, #991b1b); font-size: var(--pages-font-size-sm, 12px); }
    .restart-error { display: flex; gap: var(--pages-space-2, 8px); align-items: center; padding: var(--pages-space-2, 8px) var(--pages-space-4, 16px); background: var(--pages-warning-3, #fffbeb); color: var(--pages-warning-11, #92400e); font-size: var(--pages-font-size-sm, 12px); }
    .restart-error button { padding: 4px 10px; border: 1px solid var(--pages-warning-6, #d97706); border-radius: 4px; background: transparent; cursor: pointer; font-size: 12px; color: var(--pages-warning-11, #92400e); }
    pages-table { flex: 1; overflow: auto; }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-session-list': SessionList;
  }
}
