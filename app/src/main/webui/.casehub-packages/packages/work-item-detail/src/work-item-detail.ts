import { LitElement, html, css, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type {
  WorkItemResponse,
  WorkIdentity,
  UserSearchProvider,
  WorkItemLifecycleEvent,
  CompleteRequest,
  EscalateRequest,
  DelegateRequest,
} from '@casehubio/mosaic-core';
import { isTerminalStatus, WorkItemEventTopics } from '@casehubio/mosaic-core';
import { onPagesEvent } from '@casehubio/pages-data';
interface SchemaFormElement extends HTMLElement { submit(): Record<string, unknown> | null; }
import { FocusTrapMixin, LiveRegionMixin } from '@casehubio/pages-primitives/a11y';
import './detail-action-bar.js';
import './detail-activity-tab.js';
import './detail-relations-tab.js';

type TabName = 'overview' | 'activity' | 'relations';

interface RelationApiResponse {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: string;
  createdBy: string;
  createdAt: string;
}

interface WorkItemRelation {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly relationType: string;
  readonly direction: 'outgoing' | 'incoming';
  readonly createdBy: string;
  readonly createdAt: string;
  readonly title?: string;
  readonly status?: string;
}

const RELATION_INVERSES: Record<string, string> = {
  'BLOCKS': 'BLOCKED_BY',
  'BLOCKED_BY': 'BLOCKS',
  'PART_OF': 'HAS_PART',
  'HAS_PART': 'PART_OF',
  'RELATES_TO': 'RELATES_TO',
};

export interface WorkItemDetailProps {
  endpoint: string | null;
  workItemId: string | null;
  identity: WorkIdentity | null;
  userSearchProvider: UserSearchProvider | null;
  data: WorkItemResponse | null;
}

@customElement('agency-work-item-detail')
export class WorkItemDetail extends LiveRegionMixin(FocusTrapMixin(LitElement)) {
  @property({ type: String }) endpoint: string | null = null;
  @property({ type: String }) workItemId: string | null = null;
  @property({ type: Object }) identity: WorkIdentity | null = null;
  @property({ type: Object }) userSearchProvider: UserSearchProvider | null = null;
  @property({ type: Object }) data: WorkItemResponse | null = null;

  @state() private _activeTab: TabName = 'overview';
  @state() private _events: readonly WorkItemLifecycleEvent[] = [];
  @state() private _relations: readonly WorkItemRelation[] = [];
  @state() private _loading = false;
  @state() private _error: string | null = null;

  // Dialog states
  @state() private _showEscalateDialog = false;
  @state() private _showDelegateDialog = false;
  @state() private _showCompleteDialog = false;

  private _unsubscribeSelection?: () => void;
  private _relatedItemCache = new Map<string, { title: string; status: string }>();

  static override styles = css`
    :host {
      display: block;
      height: 100%;
      overflow-y: auto;
      font-family: var(--pages-font-family, system-ui);
      background: var(--pages-neutral-1, #fff);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--pages-space-10, 40px);
      text-align: center;
      color: var(--pages-neutral-9, #888);
      min-height: 400px;
    }

    .empty-icon {
      width: 48px;
      height: 48px;
      margin-bottom: var(--pages-space-3, 12px);
      color: var(--pages-neutral-6, #ccc);
    }

    .empty-text {
      font-size: var(--pages-font-size-base, 14px);
      margin-bottom: var(--pages-space-1, 4px);
    }

    .empty-hint {
      font-size: var(--pages-font-size-sm, 12px);
      color: var(--pages-neutral-8, #999);
    }

    .sticky-header {
      position: sticky;
      top: 0;
      background: var(--pages-neutral-1, #fff);
      border-bottom: 1px solid var(--pages-neutral-5, #e0e0e0);
      padding: var(--pages-space-3, 12px) var(--pages-space-4, 16px);
      z-index: 20;
    }

    .header-row {
      display: flex;
      align-items: center;
      gap: var(--pages-space-2, 8px);
      margin-bottom: var(--pages-space-2, 8px);
    }

    .title {
      font-size: var(--pages-font-size-lg, 16px);
      font-weight: var(--pages-font-weight-semibold, 600);
      color: var(--pages-neutral-12, #111);
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .status-pill {
      padding: 4px 8px;
      border-radius: var(--pages-radius-sm, 4px);
      font-size: var(--pages-font-size-xs, 11px);
      font-weight: var(--pages-font-weight-medium, 500);
      text-transform: uppercase;
      background: var(--pages-neutral-3, #f3f3f3);
      color: var(--pages-neutral-11, #444);
    }

    .status-pill.active {
      background: var(--pages-accent-3, #dbeafe);
      color: var(--pages-accent-11, #1e40af);
    }

    .status-pill.terminal {
      background: var(--pages-neutral-3, #f3f3f3);
      color: var(--pages-neutral-9, #888);
    }

    .priority-badge {
      padding: 4px 8px;
      border-radius: var(--pages-radius-sm, 4px);
      font-size: var(--pages-font-size-xs, 11px);
      font-weight: var(--pages-font-weight-medium, 500);
      text-transform: uppercase;
    }

    .priority-badge.urgent {
      background: var(--pages-danger-9, #dc2626);
      color: #fff;
    }

    .priority-badge.high {
      background: var(--pages-warning-9, #f59e0b);
      color: #fff;
    }

    .priority-badge.medium {
      background: var(--pages-accent-9, #2563eb);
      color: #fff;
    }

    .priority-badge.low {
      background: var(--pages-neutral-7, #aaa);
      color: #fff;
    }

    .terminal-banner {
      background: var(--pages-neutral-2, #fafafa);
      border-left: 4px solid var(--pages-neutral-7, #aaa);
      padding: var(--pages-space-3, 12px) var(--pages-space-4, 16px);
      margin: var(--pages-space-4, 16px);
      border-radius: var(--pages-radius-sm, 4px);
    }

    .terminal-banner.faulted {
      background: var(--pages-danger-2, #fee);
      border-left-color: var(--pages-danger-9, #dc2626);
    }

    .terminal-banner-title {
      font-weight: var(--pages-font-weight-medium, 500);
      font-size: var(--pages-font-size-base, 14px);
      color: var(--pages-neutral-12, #111);
      margin-bottom: var(--pages-space-1, 4px);
    }

    .terminal-banner-meta {
      font-size: var(--pages-font-size-sm, 12px);
      color: var(--pages-neutral-10, #666);
    }

    .tabs {
      display: flex;
      gap: var(--pages-space-1, 4px);
      padding: 0 var(--pages-space-4, 16px);
      border-bottom: 1px solid var(--pages-neutral-5, #e0e0e0);
    }

    .tab {
      padding: var(--pages-space-2, 8px) var(--pages-space-3, 12px);
      font-size: var(--pages-font-size-sm, 12px);
      font-weight: var(--pages-font-weight-medium, 500);
      color: var(--pages-neutral-10, #666);
      cursor: pointer;
      border: none;
      background: none;
      border-bottom: 2px solid transparent;
      transition: color 120ms ease-out, border-color 120ms ease-out;
    }

    .tab:hover {
      color: var(--pages-neutral-12, #111);
    }

    .tab[aria-selected="true"] {
      color: var(--pages-accent-11, #1e40af);
      border-bottom-color: var(--pages-accent-9, #2563eb);
    }

    .tab:focus-visible {
      outline: 2px solid var(--pages-accent-9, #2563eb);
      outline-offset: -2px;
    }

    .tab-panels {
      padding: var(--pages-space-4, 16px);
    }

    .tab-panel {
      display: none;
    }

    .tab-panel[aria-hidden="false"] {
      display: block;
    }

    .overview-content {
      display: flex;
      flex-direction: column;
      gap: var(--pages-space-4, 16px);
    }

    .metadata-section {
      display: flex;
      flex-direction: column;
      gap: var(--pages-space-2, 8px);
    }

    .metadata-item {
      display: flex;
      gap: var(--pages-space-2, 8px);
      font-size: var(--pages-font-size-sm, 12px);
    }

    .metadata-label {
      color: var(--pages-neutral-9, #888);
      font-weight: var(--pages-font-weight-medium, 500);
      min-width: 120px;
    }

    .metadata-value {
      color: var(--pages-neutral-12, #111);
    }

    .loading {
      text-align: center;
      padding: var(--pages-space-10, 40px);
      color: var(--pages-neutral-9, #888);
    }

    .error {
      background: var(--pages-danger-2, #fee);
      color: var(--pages-danger-11, #991b1b);
      padding: var(--pages-space-3, 12px);
      border-radius: var(--pages-radius-sm, 4px);
      margin: var(--pages-space-4, 16px);
    }

    /* Dialog styles */
    .dialog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .dialog {
      background: var(--pages-neutral-1, #fff);
      border-radius: var(--pages-radius-md, 6px);
      padding: var(--pages-space-4, 16px);
      max-width: 500px;
      width: 90%;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }

    .dialog-title {
      font-size: var(--pages-font-size-lg, 16px);
      font-weight: var(--pages-font-weight-semibold, 600);
      margin: 0 0 var(--pages-space-3, 12px) 0;
      color: var(--pages-neutral-12, #111);
    }

    .dialog-content {
      margin-bottom: var(--pages-space-4, 16px);
    }

    .dialog-actions {
      display: flex;
      gap: var(--pages-space-2, 8px);
      justify-content: flex-end;
    }

    .form-field {
      margin-bottom: var(--pages-space-3, 12px);
    }

    label {
      display: block;
      font-size: var(--pages-font-size-sm, 12px);
      font-weight: var(--pages-font-weight-medium, 500);
      margin-bottom: var(--pages-space-1, 4px);
      color: var(--pages-neutral-11, #444);
    }

    input,
    select,
    textarea {
      width: 100%;
      padding: var(--pages-space-2, 8px);
      border: 1px solid var(--pages-neutral-6, #ccc);
      border-radius: var(--pages-radius-sm, 4px);
      font-family: inherit;
      font-size: var(--pages-font-size-sm, 12px);
    }

    input:focus,
    select:focus,
    textarea:focus {
      outline: 2px solid var(--pages-accent-9, #2563eb);
      outline-offset: -1px;
      border-color: var(--pages-accent-9, #2563eb);
    }

    button {
      padding: var(--pages-space-1-5, 6px) var(--pages-space-3, 12px);
      border-radius: var(--pages-radius-sm, 4px);
      font-family: inherit;
      font-size: var(--pages-font-size-sm, 12px);
      font-weight: var(--pages-font-weight-medium, 500);
      cursor: pointer;
      border: none;
    }

    .btn-primary {
      background: var(--pages-accent-9, #2563eb);
      color: #fff;
    }

    .btn-secondary {
      background: var(--pages-neutral-3, #f3f3f3);
      color: var(--pages-neutral-12, #111);
    }

    .btn-danger {
      background: var(--pages-danger-9, #dc2626);
      color: #fff;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    // Listen for work item selection events
    this._unsubscribeSelection = onPagesEvent<{ workItemId: string }>(
      document,
      WorkItemEventTopics.SELECTED,
      (payload) => {
        this.workItemId = payload.workItemId;
        this._loadWorkItem();
      },
    );

    if (this.workItemId) {
      this._loadWorkItem();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribeSelection?.();
    this._relatedItemCache.clear();
  }

  override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('workItemId') && this.workItemId && this.endpoint != null) {
      this._loadWorkItem();
    }
  }

  override updated(changed: Map<string, unknown>): void {
    super.updated(changed);

    // Trap focus when a dialog opens
    if (changed.has('_showEscalateDialog') && this._showEscalateDialog) {
      const dialog = this.shadowRoot?.querySelector('.dialog-overlay .dialog') as HTMLElement;
      if (dialog) this.trapFocus(dialog);
    }
    if (changed.has('_showDelegateDialog') && this._showDelegateDialog) {
      const dialog = this.shadowRoot?.querySelector('.dialog-overlay .dialog') as HTMLElement;
      if (dialog) this.trapFocus(dialog);
    }
    if (changed.has('_showCompleteDialog') && this._showCompleteDialog) {
      const dialog = this.shadowRoot?.querySelector('.dialog-overlay .dialog') as HTMLElement;
      if (dialog) this.trapFocus(dialog);
    }

    // Release focus when all dialogs close
    if ((changed.has('_showEscalateDialog') || changed.has('_showDelegateDialog') || changed.has('_showCompleteDialog'))
        && !this._showEscalateDialog && !this._showDelegateDialog && !this._showCompleteDialog) {
      this.releaseFocus();
    }
  }

  configure(props: Partial<WorkItemDetailProps>): void {
    if (props.endpoint !== undefined) this.endpoint = props.endpoint;
    if (props.workItemId) this.workItemId = props.workItemId;
    if (props.identity) this.identity = props.identity as WorkIdentity;
    if (props.userSearchProvider) this.userSearchProvider = props.userSearchProvider as UserSearchProvider;
    if (props.data) this.data = props.data as WorkItemResponse;
  }

  override render(): TemplateResult {
    if (this._error) {
      return html`<div class="error">Error: ${this._error}</div>`;
    }

    if (this._loading) {
      return html`<div class="loading">Loading...</div>`;
    }

    const workItem = this.data;

    if (!workItem) {
      return this._renderEmptyState();
    }

    const isTerminal = isTerminalStatus(workItem.status);

    return html`
      ${this._renderHeader(workItem)}
      ${isTerminal ? this._renderTerminalBanner(workItem) : html`<agency-detail-action-bar .workItem="${workItem}" .identity="${this.identity}" @action-click="${this._handleAction}"></agency-detail-action-bar>`}
      ${this._renderTabs()}
      ${this._renderTabPanels(workItem)}
      ${this._showEscalateDialog ? this._renderEscalateDialog() : ''}
      ${this._showDelegateDialog ? this._renderDelegateDialog() : ''}
      ${this._showCompleteDialog ? this._renderCompleteDialog() : ''}
    `;
  }

  private _renderEmptyState(): TemplateResult {
    return html`
      <div class="empty-state">
        <svg class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <div class="empty-text">Select a work item to view details</div>
        <div class="empty-hint">Use arrow keys to navigate the inbox, Enter to select</div>
      </div>
    `;
  }

  private _renderHeader(workItem: WorkItemResponse): TemplateResult {
    const isTerminal = isTerminalStatus(workItem.status);
    const priorityClass = workItem.priority.toLowerCase();

    return html`
      <div class="sticky-header">
        <div class="header-row">
          <h1 class="title">${workItem.title}</h1>
          <div class="status-pill ${isTerminal ? 'terminal' : 'active'}">${workItem.status}</div>
          <div class="priority-badge ${priorityClass}">${workItem.priority}</div>
        </div>
      </div>
    `;
  }

  private _renderTerminalBanner(workItem: WorkItemResponse): TemplateResult {
    const isFaulted = workItem.status === 'FAULTED';
    const timestamp = workItem.completedAt || workItem.updatedAt;

    return html`
      <div class="terminal-banner ${isFaulted ? 'faulted' : ''}">
        <div class="terminal-banner-title">${workItem.status}</div>
        <div class="terminal-banner-meta">
          ${timestamp ? `Completed at ${new Date(timestamp).toLocaleString()}` : ''}
          ${workItem.outcome ? ` — Outcome: ${workItem.outcome}` : ''}
        </div>
      </div>
    `;
  }

  private _renderTabs(): TemplateResult {
    const tabs: Array<{ id: TabName; label: string }> = [
      { id: 'overview', label: 'Overview' },
      { id: 'activity', label: 'Activity' },
      { id: 'relations', label: 'Relations' },
    ];

    return html`
      <div class="tabs" role="tablist">
        ${tabs.map(
          tab => html`
            <button
              id="tab-${tab.id}"
              class="tab"
              role="tab"
              aria-selected="${this._activeTab === tab.id}"
              aria-controls="tabpanel-${tab.id}"
              @click="${() => this._setActiveTab(tab.id)}"
            >
              ${tab.label}
            </button>
          `,
        )}
      </div>
    `;
  }

  private _renderTabPanels(workItem: WorkItemResponse): TemplateResult {
    return html`
      <div class="tab-panels">
        <div
          id="tabpanel-overview"
          class="tab-panel"
          role="tabpanel"
          data-tab="overview"
          aria-labelledby="tab-overview"
          aria-hidden="${this._activeTab !== 'overview'}"
        >
          ${this._renderOverviewTab(workItem)}
        </div>
        <div
          id="tabpanel-activity"
          class="tab-panel"
          role="tabpanel"
          data-tab="activity"
          aria-labelledby="tab-activity"
          aria-hidden="${this._activeTab !== 'activity'}"
        >
          <agency-detail-activity-tab
            .workItem="${workItem}"
            .events="${this._events}"
            @add-note="${this._handleAddNote}"
          ></agency-detail-activity-tab>
        </div>
        <div
          id="tabpanel-relations"
          class="tab-panel"
          role="tabpanel"
          data-tab="relations"
          aria-labelledby="tab-relations"
          aria-hidden="${this._activeTab !== 'relations'}"
        >
          <agency-detail-relations-tab .workItem="${workItem}" .relations="${this._relations}"></agency-detail-relations-tab>
        </div>
      </div>
    `;
  }

  private _renderOverviewTab(workItem: WorkItemResponse): TemplateResult {
    return html`
      <div class="overview-content">
        ${workItem.description
          ? html`
              <div class="metadata-section">
                <div class="metadata-item">
                  <span class="metadata-label">Description</span>
                  <span class="metadata-value">${workItem.description}</span>
                </div>
              </div>
            `
          : ''}
        <div class="metadata-section">
          ${workItem.assigneeId
            ? html`
                <div class="metadata-item">
                  <span class="metadata-label">Assignee</span>
                  <span class="metadata-value">${workItem.assigneeId}</span>
                </div>
              `
            : ''}
          ${workItem.category
            ? html`
                <div class="metadata-item">
                  <span class="metadata-label">Category</span>
                  <span class="metadata-value">${workItem.category}</span>
                </div>
              `
            : ''}
          ${workItem.candidateGroups
            ? html`
                <div class="metadata-item">
                  <span class="metadata-label">Candidate Groups</span>
                  <span class="metadata-value">${workItem.candidateGroups}</span>
                </div>
              `
            : ''}
          <div class="metadata-item">
            <span class="metadata-label">Created</span>
            <span class="metadata-value">${new Date(workItem.createdAt).toLocaleString()}</span>
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Updated</span>
            <span class="metadata-value">${new Date(workItem.updatedAt).toLocaleString()}</span>
          </div>
        </div>
        ${workItem.inputDataSchema && workItem.payload
          ? html`<pages-schema-form
              mode="display"
              .schema="${JSON.parse(workItem.inputDataSchema)}"
              .data="${JSON.parse(workItem.payload)}"
            ></pages-schema-form>`
          : ''}
        <slot name="payload-renderer"></slot>
      </div>
    `;
  }

  private _renderEscalateDialog(): TemplateResult {
    return html`
      <div class="dialog-overlay" @click="${this._handleDialogOverlayClick}">
        <div class="dialog" @click="${(e: Event) => e.stopPropagation()}">
          <h2 class="dialog-title">Escalate Work Item</h2>
          <div class="dialog-content">
            <div class="form-field">
              <label for="escalate-target">Target Group</label>
              <input type="text" id="escalate-target" placeholder="Enter target group" />
            </div>
            <div class="form-field">
              <label for="escalate-reason">Reason</label>
              <textarea id="escalate-reason" rows="3" placeholder="Reason for escalation"></textarea>
            </div>
          </div>
          <div class="dialog-actions">
            <button class="btn-secondary" @click="${() => (this._showEscalateDialog = false)}">
              Cancel
            </button>
            <button class="btn-primary" @click="${this._handleEscalateSubmit}">Escalate</button>
          </div>
        </div>
      </div>
    `;
  }

  private _renderDelegateDialog(): TemplateResult {
    return html`
      <div class="dialog-overlay" @click="${this._handleDialogOverlayClick}">
        <div class="dialog" @click="${(e: Event) => e.stopPropagation()}">
          <h2 class="dialog-title">Delegate Work Item</h2>
          <div class="dialog-content">
            <div class="form-field">
              <label for="delegate-target">Delegate To</label>
              <input type="text" id="delegate-target" placeholder="User ID or group" />
            </div>
          </div>
          <div class="dialog-actions">
            <button class="btn-secondary" @click="${() => (this._showDelegateDialog = false)}">
              Cancel
            </button>
            <button class="btn-primary" @click="${this._handleDelegateSubmit}">Delegate</button>
          </div>
        </div>
      </div>
    `;
  }

  private _renderCompleteDialog(): TemplateResult {
    const outcomes = this.data?.permittedOutcomes || [];

    return html`
      <div class="dialog-overlay" @click="${this._handleDialogOverlayClick}">
        <div class="dialog" @click="${(e: Event) => e.stopPropagation()}">
          <h2 class="dialog-title">Complete Work Item</h2>
          <div class="dialog-content">
            ${outcomes.length > 0
              ? html`
                  <div class="form-field">
                    <label for="complete-outcome">Outcome</label>
                    <select id="complete-outcome">
                      ${outcomes.map(
                        outcome => html`<option value="${outcome.value}">${outcome.label}</option>`,
                      )}
                    </select>
                  </div>
                `
              : ''}
            ${this.data?.outputDataSchema
              ? html`<pages-schema-form
                  mode="edit"
                  .schema="${JSON.parse(this.data.outputDataSchema)}"
                  .data="${{}}"
                ></pages-schema-form>`
              : ''}
          </div>
          <div class="dialog-actions">
            <button class="btn-secondary" @click="${() => (this._showCompleteDialog = false)}">
              Cancel
            </button>
            <button class="btn-primary" @click="${this._handleCompleteSubmit}">Complete</button>
          </div>
        </div>
      </div>
    `;
  }

  private _setActiveTab(tab: TabName): void {
    this._activeTab = tab;
  }

  private async _loadWorkItem(): Promise<void> {
    if (this.endpoint == null || !this.workItemId) return;

    this._loading = true;
    this._error = null;

    try {
      const response = await fetch(`${this.endpoint}/workitems/${this.workItemId}`);
      if (!response.ok) throw new Error(`Failed to load work item: ${response.statusText}`);

      const raw = await response.json() as Record<string, unknown>;
      // Handle both wrapped {item: WorkItemResponse} and unwrapped WorkItemResponse
      this.data = (raw.item && typeof (raw.item as Record<string, unknown>).id === 'string')
        ? raw.item as WorkItemResponse
        : raw as unknown as WorkItemResponse;

      // Load activity events and relations in parallel
      const [eventsResponse, outgoingResponse, incomingResponse] = await Promise.all([
        fetch(`${this.endpoint}/workitems/${this.workItemId}/events`),
        fetch(`${this.endpoint}/workitems/${this.workItemId}/relations`),
        fetch(`${this.endpoint}/workitems/${this.workItemId}/relations/incoming`),
      ]);

      if (eventsResponse.ok) {
        this._events = await eventsResponse.json();
      }

      // Combine outgoing and incoming relations
      const outgoing = outgoingResponse.ok ? await outgoingResponse.json() : [];
      const incoming = incomingResponse.ok ? await incomingResponse.json() : [];

      const relations: WorkItemRelation[] = [
        ...outgoing.map((r: RelationApiResponse) => ({ ...r, direction: 'outgoing' as const })),
        ...incoming.map((r: RelationApiResponse) => ({
          ...r,
          direction: 'incoming' as const,
          relationType: RELATION_INVERSES[r.relationType] ?? `${r.relationType} (incoming)`,
        })),
      ];

      this._relations = await this._fetchRelatedItemDetails(relations);
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      this._loading = false;
    }
  }

  private async _fetchRelatedItemDetails(relations: WorkItemRelation[]): Promise<WorkItemRelation[]> {
    if (!this.endpoint) return relations;

    const itemIds = new Set<string>();
    for (const rel of relations) {
      const relatedId = rel.direction === 'outgoing' ? rel.targetId : rel.sourceId;
      itemIds.add(relatedId);
    }

    const fetchPromises = Array.from(itemIds).map(async (id) => {
      if (this._relatedItemCache.has(id)) {
        return;
      }

      try {
        const response = await fetch(`${this.endpoint}/workitems/${id}`);
        if (response.ok) {
          const raw = await response.json() as Record<string, unknown>;
          const item = (raw.item && typeof (raw.item as Record<string, unknown>).id === 'string')
            ? raw.item as WorkItemResponse
            : raw as unknown as WorkItemResponse;

          this._relatedItemCache.set(id, {
            title: item.title ?? id,
            status: item.status ?? 'Unknown',
          });
        }
      } catch {
        // Silently fail - item will show ID instead of title
      }
    });

    await Promise.all(fetchPromises);

    return relations.map(rel => {
      const relatedId = rel.direction === 'outgoing' ? rel.targetId : rel.sourceId;
      const cached = this._relatedItemCache.get(relatedId);
      if (cached) {
        return { ...rel, title: cached.title, status: cached.status };
      }
      return rel;
    });
  }

  private _handleAction(e: CustomEvent): void {
    const { action } = e.detail;

    switch (action) {
      case 'claim':
        this._handleClaim();
        break;
      case 'start':
        this._handleStart();
        break;
      case 'complete':
        this._showCompleteDialog = true;
        break;
      case 'reject':
        this._handleReject();
        break;
      case 'suspend':
        this._handleSuspend();
        break;
      case 'resume':
        this._handleResume();
        break;
      case 'cancel':
        this._handleCancel();
        break;
      case 'release':
        this._handleRelease();
        break;
      case 'delegate':
        this._showDelegateDialog = true;
        break;
      case 'escalate':
        this._showEscalateDialog = true;
        break;
      case 'accept-delegation':
        this._handleAcceptDelegation();
        break;
      case 'decline-delegation':
        this._handleDeclineDelegation();
        break;
    }
  }

  private async _handleClaim(): Promise<void> {
    if (this.endpoint == null || !this.workItemId || !this.identity) return;

    try {
      const response = await fetch(
        `${this.endpoint}/workitems/${this.workItemId}/claim?claimant=${this.identity.userId}`,
        { method: 'PUT' },
      );
      if (!response.ok) throw new Error('Failed to claim work item');

      await this._loadWorkItem();
      this.announce('Item claimed');
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Unknown error';
      this.announce('Action failed: ' + this._error, 'assertive');
    }
  }

  private async _handleStart(): Promise<void> {
    if (this.endpoint == null || !this.workItemId || !this.identity) return;

    try {
      const response = await fetch(
        `${this.endpoint}/workitems/${this.workItemId}/start?actor=${this.identity.userId}`,
        { method: 'PUT' },
      );
      if (!response.ok) throw new Error('Failed to start work item');

      await this._loadWorkItem();
      this.announce('Item started');
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Unknown error';
      this.announce('Action failed: ' + this._error, 'assertive');
    }
  }

  private async _handleReject(): Promise<void> {
    if (this.endpoint == null || !this.workItemId || !this.identity) return;

    try {
      const response = await fetch(
        `${this.endpoint}/workitems/${this.workItemId}/reject?actor=${this.identity.userId}`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) },
      );
      if (!response.ok) throw new Error('Failed to reject work item');

      await this._loadWorkItem();
      this.announce('Item rejected');
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Unknown error';
      this.announce('Action failed: ' + this._error, 'assertive');
    }
  }

  private async _handleSuspend(): Promise<void> {
    if (this.endpoint == null || !this.workItemId || !this.identity) return;

    try {
      const response = await fetch(
        `${this.endpoint}/workitems/${this.workItemId}/suspend?actor=${this.identity.userId}`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) },
      );
      if (!response.ok) throw new Error('Failed to suspend work item');

      await this._loadWorkItem();
      this.announce('Item suspended');
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Unknown error';
      this.announce('Action failed: ' + this._error, 'assertive');
    }
  }

  private async _handleResume(): Promise<void> {
    if (this.endpoint == null || !this.workItemId || !this.identity) return;

    try {
      const response = await fetch(
        `${this.endpoint}/workitems/${this.workItemId}/resume?actor=${this.identity.userId}`,
        { method: 'PUT' },
      );
      if (!response.ok) throw new Error('Failed to resume work item');

      await this._loadWorkItem();
      this.announce('Item resumed');
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Unknown error';
      this.announce('Action failed: ' + this._error, 'assertive');
    }
  }

  private async _handleCancel(): Promise<void> {
    if (this.endpoint == null || !this.workItemId || !this.identity) return;

    try {
      const response = await fetch(
        `${this.endpoint}/workitems/${this.workItemId}/cancel?actor=${this.identity.userId}`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) },
      );
      if (!response.ok) throw new Error('Failed to cancel work item');

      await this._loadWorkItem();
      this.announce('Item cancelled');
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Unknown error';
      this.announce('Action failed: ' + this._error, 'assertive');
    }
  }

  private async _handleRelease(): Promise<void> {
    if (this.endpoint == null || !this.workItemId || !this.identity) return;

    try {
      const response = await fetch(
        `${this.endpoint}/workitems/${this.workItemId}/release?actor=${this.identity.userId}`,
        { method: 'PUT' },
      );
      if (!response.ok) throw new Error('Failed to release work item');

      await this._loadWorkItem();
      this.announce('Item released');
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Unknown error';
      this.announce('Action failed: ' + this._error, 'assertive');
    }
  }

  private async _handleAcceptDelegation(): Promise<void> {
    if (this.endpoint == null || !this.workItemId || !this.identity) return;

    try {
      const response = await fetch(
        `${this.endpoint}/workitems/${this.workItemId}/accept-delegation?claimant=${this.identity.userId}`,
        { method: 'PUT' },
      );
      if (!response.ok) throw new Error('Failed to accept delegation');

      await this._loadWorkItem();
      this.announce('Delegation accepted');
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Unknown error';
      this.announce('Action failed: ' + this._error, 'assertive');
    }
  }

  private async _handleDeclineDelegation(): Promise<void> {
    if (this.endpoint == null || !this.workItemId || !this.identity) return;

    try {
      const response = await fetch(
        `${this.endpoint}/workitems/${this.workItemId}/decline-delegation?actor=${this.identity.userId}`,
        { method: 'PUT' },
      );
      if (!response.ok) throw new Error('Failed to decline delegation');

      await this._loadWorkItem();
      this.announce('Delegation declined');
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Unknown error';
      this.announce('Action failed: ' + this._error, 'assertive');
    }
  }

  private async _handleEscalateSubmit(): Promise<void> {
    const target = this.shadowRoot?.querySelector('#escalate-target') as HTMLInputElement;
    const reason = this.shadowRoot?.querySelector('#escalate-reason') as HTMLTextAreaElement;

    if (!target?.value || !reason?.value) return;
    if (this.endpoint == null || !this.workItemId) return;

    try {
      const request: EscalateRequest = {
        targetGroup: target.value,
        reason: reason.value,
      };

      const response = await fetch(`${this.endpoint}/workitems/${this.workItemId}/escalate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) throw new Error('Failed to escalate work item');

      this._showEscalateDialog = false;
      await this._loadWorkItem();
      this.announce('Item escalated');
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Unknown error';
      this.announce('Action failed: ' + this._error, 'assertive');
    }
  }

  private async _handleDelegateSubmit(): Promise<void> {
    const target = this.shadowRoot?.querySelector('#delegate-target') as HTMLInputElement;

    if (!target?.value) return;
    if (this.endpoint == null || !this.workItemId) return;

    try {
      const request: DelegateRequest = {
        to: target.value,
      };

      const response = await fetch(`${this.endpoint}/workitems/${this.workItemId}/delegate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) throw new Error('Failed to delegate work item');

      this._showDelegateDialog = false;
      await this._loadWorkItem();
      this.announce('Item delegated');
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Unknown error';
      this.announce('Action failed: ' + this._error, 'assertive');
    }
  }

  private async _handleCompleteSubmit(): Promise<void> {
    const outcomeSelect = this.shadowRoot?.querySelector('#complete-outcome') as HTMLSelectElement;
    const schemaForm = this.shadowRoot?.querySelector('pages-schema-form') as SchemaFormElement | null;

    if (this.endpoint == null || !this.workItemId) return;

    try {
      const formData = schemaForm?.submit?.();

      const outcome = outcomeSelect?.value;
      const resolution = formData ? JSON.stringify(formData) : undefined;

      const request: CompleteRequest = {
        ...(outcome ? { outcome } : {}),
        ...(resolution ? { resolution } : {}),
      };

      const response = await fetch(`${this.endpoint}/workitems/${this.workItemId}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) throw new Error('Failed to complete work item');

      this._showCompleteDialog = false;
      await this._loadWorkItem();
      this.announce('Item completed');
    } catch (error) {
      this._error = error instanceof Error ? error.message : 'Unknown error';
      this.announce('Action failed: ' + this._error, 'assertive');
    }
  }

  private _handleAddNote(e: CustomEvent): void {
    // Emit pages-event so the host application can handle note persistence
    const noteEvent = new CustomEvent('pages-event', {
      bubbles: true,
      composed: true,
      detail: {
        topic: 'work-item.note-added',
        payload: {
          workItemId: this.workItemId,
          note: e.detail.note,
        },
      },
    });
    this.dispatchEvent(noteEvent);
    this.announce('Note added');
  }

  private _handleDialogOverlayClick(): void {
    this._showEscalateDialog = false;
    this._showDelegateDialog = false;
    this._showCompleteDialog = false;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-work-item-detail': WorkItemDetail;
  }
}
