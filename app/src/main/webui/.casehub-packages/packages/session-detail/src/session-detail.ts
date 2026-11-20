import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { onPagesEvent } from '@casehubio/pages-data';
import { PushMixin } from '@casehubio/pages-component';
import '@casehubio/pages-table';
import { fromRows } from '@casehubio/pages-data';
import { columnId, ColumnType } from '@casehubio/pages-data';
import type { TypedDataSet } from '@casehubio/pages-data';
import type { GitStatusResponse, PortStatus } from '@casehubio/mosaic-session-list';
import { SessionEventTopics } from '@casehubio/mosaic-session-list';

type TabId = 'terminal' | 'git' | 'health' | 'events';

const HEALTH_COL_DEFS = [
  { id: columnId('port'), name: 'Port', type: ColumnType.NUMBER, getValue: (r: PortStatus) => r.port },
  { id: columnId('status'), name: 'Status', type: ColumnType.TEXT, getValue: (r: PortStatus) => r.up ? '●' : '○' },
  { id: columnId('responseMs'), name: 'Response (ms)', type: ColumnType.NUMBER, getValue: (r: PortStatus) => r.responseMs },
] as const;

export interface SessionDetailProps {
  endpoint: string;
  sessionId?: string;
  eventsPushUrl: string;
}

@customElement('agency-session-detail')
export class SessionDetail extends PushMixin(LitElement) {
  @property({ type: String }) endpoint = '';
  @property({ type: String }) sessionId: string | undefined;

  @state() _activeTab: TabId = 'terminal';
  @state() _terminalOutput = '';
  @state() private _gitStatus: GitStatusResponse | null = null;
  @state() private _healthData: TypedDataSet | undefined;
  @state() _events: Array<{ timestamp: string; type: string; data: string }> = [];
  @state() private _loading = false;
  @state() private _error: string | null = null;

  @property({ attribute: 'events-push-url' }) eventsPushUrl = '';

  private _terminalTimer: ReturnType<typeof setInterval> | null = null;
  private _healthTimer: ReturnType<typeof setInterval> | null = null;
  private _unsubs: Array<() => void> = [];

  override connectedCallback(): void {
    super.connectedCallback();
    this._unsubs.push(
      onPagesEvent<{ id: string }>(document, SessionEventTopics.SELECTED, (p: { id: string }) => {
        this.sessionId = p.id;
      }),
      onPagesEvent(document, SessionEventTopics.DESELECTED, () => {
        this.sessionId = undefined;
      }),
    );
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._teardownAll();
    this._unsubs.forEach(u => u());
    this._unsubs = [];
  }

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('sessionId')) {
      this._teardownAll();
      this._events = [];
      this._gitStatus = null;
      this._terminalOutput = '';
      this._healthData = undefined;
      if (this.sessionId) {
        this._activateTab(this._activeTab);
      }
    }
  }

  private _teardownAll(): void {
    if (this._terminalTimer) { clearInterval(this._terminalTimer); this._terminalTimer = null; }
    if (this._healthTimer) { clearInterval(this._healthTimer); this._healthTimer = null; }
    this.pushUrl = '';
    this.pushTopics = [];
  }

  override onPushEvent(event: unknown): void {
    const payload = event as Record<string, unknown>;
    this._events = [...this._events, {
      timestamp: new Date().toISOString(),
      type: String(payload['type'] ?? 'event'),
      data: JSON.stringify(payload),
    }];
  }

  private _activateTab(tab: TabId): void {
    this._teardownAll();
    this._activeTab = tab;
    if (!this.sessionId) return;

    switch (tab) {
      case 'terminal':
        this._fetchTerminal();
        this._terminalTimer = setInterval(() => { this._fetchTerminal(); }, 2000);
        break;
      case 'git':
        this._fetchGitStatus();
        break;
      case 'health':
        this._fetchHealth();
        this._healthTimer = setInterval(() => { this._fetchHealth(); }, 10000);
        break;
      case 'events':
        if (this.eventsPushUrl && this.sessionId) {
          this.pushUrl = this.eventsPushUrl;
          this.pushTopics = [`session:${this.sessionId}:events:*`];
        }
        break;
    }
  }

  private async _fetchTerminal(): Promise<void> {
    if (!this.sessionId) return;
    try {
      const res = await fetch(`${this.endpoint}/${this.sessionId}/output?lines=200`);
      if (!res.ok) throw new Error(`${res.status}`);
      this._terminalOutput = await res.text();
    } catch (e) {
      this._error = (e as Error).message;
    }
  }

  private async _fetchGitStatus(): Promise<void> {
    if (!this.sessionId) return;
    this._loading = true;
    try {
      const res = await fetch(`${this.endpoint}/${this.sessionId}/git-status`);
      if (!res.ok) throw new Error(`${res.status}`);
      this._gitStatus = await res.json() as GitStatusResponse;
    } catch (e) {
      this._error = (e as Error).message;
    } finally {
      this._loading = false;
    }
  }

  private async _fetchHealth(): Promise<void> {
    if (!this.sessionId) return;
    try {
      const res = await fetch(`${this.endpoint}/${this.sessionId}/service-health`);
      if (!res.ok) throw new Error(`${res.status}`);
      const ports = await res.json() as PortStatus[];
      this._healthData = fromRows(ports, HEALTH_COL_DEFS);
    } catch (e) {
      this._error = (e as Error).message;
    }
  }

  override render() {
    if (!this.sessionId) {
      return html`<div class="placeholder">Select a session</div>`;
    }
    const tabs: Array<{ id: TabId; label: string }> = [
      { id: 'terminal', label: 'Terminal' },
      { id: 'git', label: 'Git' },
      { id: 'health', label: 'Health' },
      { id: 'events', label: 'Events' },
    ];
    return html`
      <div class="detail">
        <div class="tab-bar" role="tablist">
          ${tabs.map(t => html`
            <button role="tab" aria-selected=${this._activeTab === t.id}
              class="tab ${this._activeTab === t.id ? 'active' : ''}"
              @click=${() => this._activateTab(t.id)}>${t.label}</button>
          `)}
        </div>
        <div class="tab-content" role="tabpanel">
          ${this._error ? html`<div class="error" role="alert">${this._error}</div>` : nothing}
          ${this._renderActiveTab()}
        </div>
      </div>
    `;
  }

  private _renderActiveTab() {
    switch (this._activeTab) {
      case 'terminal': return html`<pre class="terminal-output">${this._terminalOutput}</pre>`;
      case 'git': return this._renderGit();
      case 'health': return html`<pages-table .dataSet=${this._healthData}></pages-table>`;
      case 'events': return this._renderEvents();
    }
  }

  private _renderGit() {
    if (this._loading) return html`<div class="loading">Loading...</div>`;
    if (!this._gitStatus) return nothing;
    if (!this._gitStatus.gitRepo) return html`<div class="info">Not a git repository</div>`;
    const g = this._gitStatus;
    return html`
      <div class="git-info">
        <div class="git-row"><strong>Branch:</strong> ${g.branch ?? '—'}</div>
        <div class="git-row"><strong>Repo:</strong> ${g.githubRepo ?? '—'}</div>
        ${g.pr ? html`
          <div class="git-row"><strong>PR #${g.pr.number}:</strong> ${g.pr.title} (${g.pr.state})</div>
          <div class="git-row">
            <span class="check pass">✓ ${g.pr.checksPassed}</span>
            <span class="check fail">✗ ${g.pr.checksFailed}</span>
            <span class="check pending">◷ ${g.pr.checksPending}</span>
          </div>
        ` : html`<div class="info">No open PR for this branch</div>`}
      </div>
    `;
  }

  private _renderEvents() {
    if (this._events.length === 0) {
      return html`<div class="info">Waiting for events...</div>`;
    }
    return html`
      <div class="event-feed">
        ${this._events.map(e => html`
          <div class="event-row">
            <span class="event-time">${e.timestamp.substring(11, 19)}</span>
            <span class="event-type">${e.type}</span>
            <span class="event-data">${e.data}</span>
          </div>
        `)}
      </div>
    `;
  }

  static override styles = css`
    :host { display: block; height: 100%; font-family: var(--pages-font-family, system-ui); overflow: hidden; }
    .detail { display: flex; flex-direction: column; height: 100%; }
    .placeholder { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--pages-neutral-7, #525252); font-size: var(--pages-font-size-base, 14px); }
    .tab-bar { display: flex; gap: 0; border-bottom: 1px solid var(--pages-neutral-4, #d4d4d4); background: var(--pages-neutral-2, #f5f5f5); }
    .tab { padding: 8px 16px; border: none; background: none; cursor: pointer; font-size: var(--pages-font-size-sm, 12px); color: var(--pages-neutral-9, #404040); border-bottom: 2px solid transparent; }
    .tab.active { color: var(--pages-accent-11, #1e40af); border-bottom-color: var(--pages-accent-9, #2563eb); font-weight: 500; }
    .tab-content { flex: 1; overflow: auto; padding: var(--pages-space-3, 12px); }
    .terminal-output { margin: 0; font-family: 'SF Mono', 'Menlo', monospace; font-size: 12px; line-height: 1.5; white-space: pre-wrap; word-break: break-all; color: var(--pages-neutral-12, #0a0a0a); background: var(--pages-neutral-1, #fafafa); padding: var(--pages-space-3, 12px); border-radius: 4px; }
    .error { padding: var(--pages-space-2, 8px); background: var(--pages-danger-3, #fef2f2); color: var(--pages-danger-11, #991b1b); font-size: 12px; border-radius: 4px; margin-bottom: var(--pages-space-2, 8px); }
    .info { color: var(--pages-neutral-7, #525252); font-size: var(--pages-font-size-sm, 12px); }
    .loading { color: var(--pages-neutral-7, #525252); }
    .git-info { display: flex; flex-direction: column; gap: var(--pages-space-2, 8px); }
    .git-row { font-size: var(--pages-font-size-sm, 12px); color: var(--pages-neutral-11, #0a0a0a); }
    .check { font-size: 12px; margin-right: 12px; }
    .check.pass { color: var(--pages-success-11, #065f46); }
    .check.fail { color: var(--pages-danger-11, #991b1b); }
    .check.pending { color: var(--pages-warning-11, #92400e); }
    .event-feed { display: flex; flex-direction: column; gap: 4px; }
    .event-row { display: flex; gap: var(--pages-space-2, 8px); font-size: 12px; font-family: monospace; padding: 4px 0; border-bottom: 1px solid var(--pages-neutral-3, #e5e5e5); }
    .event-time { color: var(--pages-neutral-7, #525252); min-width: 60px; }
    .event-type { color: var(--pages-accent-11, #1e40af); min-width: 100px; font-weight: 500; }
    .event-data { color: var(--pages-neutral-9, #404040); overflow: hidden; text-overflow: ellipsis; }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-session-detail': SessionDetail;
  }
}
