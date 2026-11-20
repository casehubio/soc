import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { emitPagesEvent, onPagesEvent } from '@casehubio/pages-data';
import { LiveRegionMixin } from '@casehubio/pages-primitives/a11y';
import './entity-command-bar.js';
import type { EntityTypeRegistration, EntitySelection, DetailRenderer } from './types.js';
import { DEFAULT_READER } from './readers.js';

export interface EntityDetailProps {
  selectionTopic: string;
}

@customElement('agency-entity-detail')
export class EntityDetail extends LiveRegionMixin(LitElement) {
  @property({ attribute: false }) registration: EntityTypeRegistration | undefined;
  @property({ type: String, attribute: 'selection-topic' }) selectionTopic = '';
  @property({ attribute: false }) fetchFn: typeof fetch = fetch;

  @state() private _entity: any | null = null;
  @state() _loading = false;
  @state() _error: string | null = null;
  @state() private _activeTab = 0;

  private _unsubs: Array<() => void> = [];

  private get _reader() { return this.registration?.reader ?? DEFAULT_READER; }

  static override styles = css`
    :host { display: block; height: 100%; overflow-y: auto; }

    .empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--pages-neutral-9, #999);
      font-size: 0.875rem;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px;
      color: var(--pages-neutral-9, #999);
    }

    .error {
      padding: 16px;
      color: var(--pages-error-9, #dc3545);
      text-align: center;
    }

    .error button {
      margin-left: 8px;
      padding: 4px 12px;
      border: 1px solid var(--pages-neutral-5, #ccc);
      border-radius: 4px;
      cursor: pointer;
    }

    .header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--pages-neutral-5, #ccc);
    }

    .header h2 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .header .status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
      background: var(--pages-neutral-3, #f0f0f0);
      margin-left: 8px;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid var(--pages-neutral-5, #ccc);
    }

    .tabs button {
      padding: 8px 16px;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 0.875rem;
      border-bottom: 2px solid transparent;
      color: var(--pages-neutral-9, #999);
    }

    .tabs button[aria-selected="true"] {
      color: var(--pages-neutral-12, #333);
      border-bottom-color: var(--pages-accent-9, #0066cc);
    }

    .tabs button:hover {
      color: var(--pages-neutral-12, #333);
    }

    .tab-content { padding: 16px; }

    .state-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .state-table td {
      padding: 6px 12px;
      border-bottom: 1px solid var(--pages-neutral-5, #eee);
    }

    .state-table td:first-child {
      font-weight: 500;
      color: var(--pages-neutral-9, #666);
      width: 30%;
    }

    .command-section {
      padding: 12px 16px;
      border-top: 1px solid var(--pages-neutral-5, #ccc);
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.selectionTopic) {
      this._unsubs.push(
        onPagesEvent(document, `${this.selectionTopic}:selected`, (payload: unknown) => {
          this.handleSelection(payload as EntitySelection);
        }),
      );
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubs.forEach(fn => fn());
    this._unsubs = [];
  }

  handleSelection(selection: EntitySelection): void {
    this._fetchEntity(selection.id);
  }

  override render(): TemplateResult {
    if (this._loading) {
      return html`<div class="loading" role="status">Loading...</div>`;
    }

    if (this._error) {
      return html`
        <div class="error" role="alert">
          ${this._error}
          <button @click=${() => { if (this._entity) this._fetchEntity(this._entity.id); }}>Retry</button>
        </div>
      `;
    }

    if (!this._entity) {
      return html`<div class="empty">Select an item to view details</div>`;
    }

    const tabs = this._buildTabs();

    return html`
      <div class="header">
        <h2>${this._reader.summary(this._entity)}<span class="status">${this._reader.status(this._entity)}</span></h2>
      </div>
      ${tabs.length > 1 ? html`
        <div class="tabs" role="tablist">
          ${tabs.map((tab, i) => html`
            <button
              role="tab"
              aria-selected=${i === this._activeTab ? 'true' : 'false'}
              @click=${() => { this._activeTab = i; }}
              @keydown=${(e: KeyboardEvent) => this._handleTabKeydown(e, i, tabs.length)}
            >${tab.label}</button>
          `)}
        </div>
      ` : nothing}
      <div class="tab-content" role="tabpanel">
        ${tabs[this._activeTab]?.render() ?? nothing}
      </div>
      ${(this._reader.commands?.(this._entity) ?? []).length > 0 ? html`
        <div class="command-section">
          <agency-entity-command-bar
            .commands=${this._reader.commands?.(this._entity) ?? []}
            entity-id=${this._reader.id(this._entity)}
            entity-type=${this._reader.type?.(this._entity) ?? this.registration?.type ?? ''}
            .fetchFn=${this.fetchFn}
          ></agency-entity-command-bar>
        </div>
      ` : nothing}
    `;
  }

  private _buildTabs(): Array<{ label: string; render: () => TemplateResult }> {
    const entity = this._entity!;
    const reg = this.registration;
    const tabs: Array<{ label: string; render: () => TemplateResult }> = [];

    tabs.push({
      label: 'Overview',
      render: () => this._renderOverview(entity),
    });

    if (reg?.relationships) {
      for (const rel of reg.relationships) {
        tabs.push({
          label: rel.label,
          render: () => this._renderRelationship(rel, entity.id),
        });
      }
    }

    return tabs;
  }

  private _renderOverview(entity: any): TemplateResult {
    const renderer = this._resolveRenderer(entity);
    if (renderer) {
      return renderer(entity);
    }
    return this._renderDefaultState(entity);
  }

  private _resolveRenderer(entity: any): DetailRenderer | undefined {
    const reg = this.registration;
    if (!reg) return undefined;

    if (reg.detailRendererMap) {
      const subTypeRenderer = reg.detailRendererMap[entity.type];
      if (typeof subTypeRenderer === 'function') {
        return subTypeRenderer as DetailRenderer;
      }
    }

    if (reg.detailRenderer) {
      return reg.detailRenderer;
    }

    return undefined;
  }

  private _renderDefaultState(entity: any): TemplateResult {
    const entries = Object.entries(this._reader.state?.(entity) ?? entity);
    if (entries.length === 0) {
      return html`<p>No state data available.</p>`;
    }
    return html`
      <table class="state-table">
        <tbody>
          ${entries.map(([key, value]) => html`
            <tr>
              <td>${key}</td>
              <td>${typeof value === 'object' ? JSON.stringify(value) : String(value)}</td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  private _renderRelationship(rel: { childType: string; label: string; endpointTemplate: string }, parentId: string): TemplateResult {
    const endpoint = rel.endpointTemplate.replace('{parentId}', parentId);
    return html`<agency-entity-list .endpoint=${endpoint} .registration=${this._getChildRegistration(rel.childType)} .fetchFn=${this.fetchFn}></agency-entity-list>`;
  }

  private _getChildRegistration(childType: string): EntityTypeRegistration | undefined {
    return undefined;
  }

  private _handleTabKeydown(e: KeyboardEvent, index: number, total: number): void {
    let target = index;
    if (e.key === 'ArrowRight') target = (index + 1) % total;
    else if (e.key === 'ArrowLeft') target = (index - 1 + total) % total;
    else return;

    e.preventDefault();
    this._activeTab = target;
    const tabs = this.shadowRoot!.querySelectorAll('[role="tab"]');
    (tabs[target] as HTMLElement)?.focus();
  }

  private async _fetchEntity(id: string): Promise<void> {
    const reg = this.registration;
    if (!reg) return;

    this._loading = true;
    this._error = null;
    this._activeTab = 0;

    try {
      const url = reg.detailEndpoint(id);
      const fullUrl = url.startsWith('http') ? url : new URL(url, window.location.origin).toString();
      const response = await this.fetchFn(fullUrl, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        this._error = `Failed to load: ${response.statusText}`;
        this.announce(`Error loading detail: ${response.statusText}`);
        return;
      }

      this._entity = await response.json();
      this.announce(`Loaded ${this._reader.summary(this._entity!)}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this._error = `Failed to load: ${message}`;
      this.announce(`Error loading detail: ${message}`);
    } finally {
      this._loading = false;
    }
  }
}
