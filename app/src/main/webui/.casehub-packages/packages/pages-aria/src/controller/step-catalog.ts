import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { CatalogDataSource } from './catalog-data-source.js';
import { isCompatible } from '@casehubio/yaml-core/step';

export interface CatalogActionSummary {
  name: string;
  description: string;
  invokeKind: string | null;
  source: string;
  portability: string;
  inputCount: number;
  outputCount: number;
}

export interface CatalogActionDetail {
  name: string;
  description: string;
  invokeKind: string | null;
  source: string;
  portability: string;
  inputs: Record<string, ParameterInfo>;
  outputs: Record<string, ParameterInfo>;
  invoke: { kind: string; metadata: Record<string, string> } | null;
}

export interface ParameterInfo {
  type: string;
  required: boolean;
  defaultValue: string | null;
  allowedValues: string[] | null;
  format: string | null;
  description: string | null;
}

export class PagesActionCatalog extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: var(--pages-font-family, system-ui, sans-serif);
      color: var(--pages-neutral-12, #1a1a1a);
    }
    .search {
      padding: var(--pages-space-2, 8px);
      border-bottom: 1px solid var(--pages-neutral-4, #e5e5e5);
    }
    .search input {
      width: 100%; box-sizing: border-box;
      padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px);
      border: 1px solid var(--pages-neutral-5, #ddd);
      border-radius: var(--pages-radius-sm, 4px);
      font-size: var(--pages-font-size-sm, 12px);
      background: var(--pages-neutral-1, #fff);
      color: var(--pages-neutral-12, #1a1a1a);
    }
    .search input::placeholder { color: var(--pages-neutral-8, #999); }
    .filters {
      display: flex; flex-wrap: wrap; gap: 4px;
      padding: 4px var(--pages-space-2, 8px);
    }
    .filter-chip {
      font-size: 10px; padding: 2px 6px;
      border-radius: var(--pages-radius-sm, 4px);
      background: var(--pages-accent-3, #e8eaf6);
      color: var(--pages-accent-11, #1e3a5f);
      cursor: pointer; border: none;
    }
    .filter-chip[aria-checked="true"] {
      background: var(--pages-accent-9, #2563eb); color: white;
    }
    .action-list { padding: 0; margin: 0; list-style: none; }
    .action-item {
      padding: var(--pages-space-2, 8px);
      border-bottom: 1px solid var(--pages-neutral-4, #e5e5e5);
      cursor: pointer;
    }
    .action-item:hover { background: var(--pages-neutral-3, #f5f5f5); }
    .action-name {
      font-weight: var(--pages-font-weight-medium, 500);
      font-size: var(--pages-font-size-base, 14px);
      color: var(--pages-neutral-12, #1a1a1a);
    }
    .action-desc {
      font-size: var(--pages-font-size-sm, 12px);
      color: var(--pages-neutral-9, #777);
      margin-top: 2px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .action-meta {
      display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;
      align-items: center;
    }
    .source-badge, .kind-badge {
      font-size: 10px; padding: 1px 4px;
      border-radius: 2px;
    }
    .source-badge {
      background: var(--pages-accent-3, #e8eaf6);
      color: var(--pages-accent-11, #1e3a5f);
    }
    .kind-badge {
      background: var(--pages-neutral-3, #f5f5f5);
      color: var(--pages-neutral-10, #555);
    }
    .io-count {
      font-size: 10px;
      color: var(--pages-neutral-8, #999);
    }
    .empty {
      padding: var(--pages-space-4, 16px);
      color: var(--pages-neutral-8, #999);
      text-align: center; font-style: italic;
    }

    .detail-header {
      display: flex; align-items: center; gap: var(--pages-space-2, 8px);
      padding: var(--pages-space-2, 8px);
      border-bottom: 1px solid var(--pages-neutral-4, #e5e5e5);
    }
    .back-btn {
      background: none; border: none; cursor: pointer;
      color: var(--pages-accent-9, #2563eb); font-size: 14px; padding: 2px 4px;
    }
    .back-btn:hover { color: var(--pages-accent-10, #1d4ed8); }
    .detail-body { padding: var(--pages-space-2, 8px); }
    .detail-name {
      font-weight: var(--pages-font-weight-medium, 500);
      font-size: var(--pages-font-size-base, 14px);
    }
    .detail-desc {
      font-size: var(--pages-font-size-sm, 12px);
      color: var(--pages-neutral-9, #777);
      margin-top: 4px;
    }
    .section-title {
      font-size: var(--pages-font-size-sm, 12px);
      font-weight: 600;
      margin-top: var(--pages-space-2, 8px);
      margin-bottom: 4px;
      color: var(--pages-neutral-10, #555);
    }
    .schema-table {
      width: 100%; border-collapse: collapse;
      font-size: var(--pages-font-size-sm, 12px);
    }
    .schema-table th {
      text-align: left; padding: 2px 4px;
      border-bottom: 1px solid var(--pages-neutral-5, #ddd);
      color: var(--pages-neutral-9, #777);
      font-weight: 500;
    }
    .schema-table td {
      padding: 2px 4px;
      border-bottom: 1px solid var(--pages-neutral-4, #e5e5e5);
    }
    .invoke-summary {
      font-size: var(--pages-font-size-sm, 12px);
      background: var(--pages-neutral-2, #fafafa);
      padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px);
      border-radius: var(--pages-radius-sm, 4px);
      margin-top: 4px;
    }
    .invoke-meta { color: var(--pages-neutral-9, #777); }

    .try-panel {
      margin-top: var(--pages-space-2, 8px);
      padding: var(--pages-space-2, 8px);
      border: 1px solid var(--pages-neutral-4, #e5e5e5);
      border-radius: var(--pages-radius-sm, 4px);
    }
    .try-form { display: flex; flex-direction: column; gap: 4px; }
    .try-field label {
      display: block; font-size: 10px; color: var(--pages-neutral-9, #777);
    }
    .try-field input, .try-field select {
      width: 100%; box-sizing: border-box;
      padding: 2px var(--pages-space-1, 4px);
      border: 1px solid var(--pages-neutral-5, #ddd);
      border-radius: 2px;
      font-size: var(--pages-font-size-sm, 12px);
      background: var(--pages-neutral-1, #fff);
      color: var(--pages-neutral-12, #1a1a1a);
    }
    .try-actions {
      display: flex; gap: var(--pages-space-2, 8px); margin-top: var(--pages-space-1, 4px);
      align-items: center;
    }
    .exec-btn {
      padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px);
      background: var(--pages-accent-9, #2563eb); color: white;
      border: none; border-radius: var(--pages-radius-sm, 4px);
      cursor: pointer; font-size: var(--pages-font-size-sm, 12px);
    }
    .exec-btn:hover { background: var(--pages-accent-10, #1d4ed8); }
    .exec-btn:disabled { opacity: 0.5; cursor: default; }
    .template-btn {
      padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px);
      background: var(--pages-neutral-3, #f5f5f5);
      color: var(--pages-neutral-11, #333);
      border: 1px solid var(--pages-neutral-5, #ddd);
      border-radius: var(--pages-radius-sm, 4px);
      cursor: pointer; font-size: var(--pages-font-size-sm, 12px);
    }
    .template-btn:hover { background: var(--pages-neutral-4, #e5e5e5); }
    .try-result {
      margin-top: var(--pages-space-1, 4px);
      padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px);
      border-radius: var(--pages-radius-sm, 4px);
      font-size: var(--pages-font-size-sm, 12px);
      font-family: monospace;
      white-space: pre-wrap;
      max-height: 200px;
      overflow-y: auto;
    }
    .try-result.success {
      background: var(--pages-success-3, #dcfce7);
      color: var(--pages-success-11, #166534);
    }
    .try-result.failure {
      background: var(--pages-danger-3, #fee2e2);
      color: var(--pages-danger-11, #991b1b);
    }
    .portability-badge {
      font-size: 9px; padding: 1px 5px;
      border-radius: var(--pages-radius-sm, 4px);
      font-weight: 500; text-transform: uppercase;
    }
    .portability-universal { background: var(--pages-success-3, #dcfce7); color: var(--pages-success-11, #166534); }
    .portability-java { background: var(--pages-warning-3, #fef3c7); color: var(--pages-warning-11, #92400e); }
    .portability-ts { background: var(--pages-accent-3, #e8eaf6); color: var(--pages-accent-11, #283593); }
    .portability-both { background: var(--pages-info-3, #e0e7ff); color: var(--pages-info-11, #3730a3); }
    .portability-violation {
      padding: var(--pages-space-1, 4px) var(--pages-space-2, 8px);
      background: var(--pages-warning-3, #fef3c7);
      color: var(--pages-warning-11, #92400e);
      border-radius: var(--pages-radius-sm, 4px);
      font-size: var(--pages-font-size-sm, 12px);
      margin-bottom: var(--pages-space-1, 4px);
    }
  `;

  @property() baseUrl = '';
  @property() execBaseUrl = '';
  @property({ attribute: false }) sources: CatalogDataSource[] = [];
  @property() runtime: 'java' | 'ts' = 'ts';

  @state() private _actions: CatalogActionSummary[] = [];
  @state() private _searchText = '';
  @state() private _sourceFilter: string[] = [];
  @state() private _portabilityFilter: string[] = [];
  @state() private _view: 'list' | 'detail' = 'list';
  @state() private _selectedAction: CatalogActionDetail | null = null;
  @state() private _tryParams: Record<string, string> = {};
  @state() private _tryResult: { kind: string; output?: Record<string, unknown>; message?: string } | null = null;
  @state() private _tryLoading = false;
  private _sourceMap = new Map<string, CatalogDataSource>();

  private get _filtered(): CatalogActionSummary[] {
    let result = this._actions;
    if (this._searchText) {
      const q = this._searchText.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.description ?? '').toLowerCase().includes(q));
    }
    if (this._sourceFilter.length > 0) {
      result = result.filter(a => this._sourceFilter.includes(a.source));
    }
    if (this._portabilityFilter.length > 0) {
      result = result.filter(a => this._portabilityFilter.includes(a.portability));
    }
    return result;
  }

  private get _allSources(): string[] {
    return [...new Set(this._actions.map(a => a.source))];
  }

  private get _allPortabilities(): string[] {
    return [...new Set(this._actions.map(a => a.portability).filter(Boolean))];
  }

  async loadCatalog(): Promise<void> {
    try {
      const resp = await fetch(`${this.baseUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '{ catalogActions { name description invokeKind source inputCount outputCount } }',
        }),
      });
      if (!resp.ok) return;
      const json = await resp.json();
      this._actions = json.data?.catalogActions ?? [];
    } catch { /* ignore */ }
  }

  async loadFromSources(): Promise<void> {
    if (this.sources.length === 0) return;
    const sorted = [...this.sources].sort((a, b) => a.priority - b.priority);
    const results = await Promise.all(sorted.map(s => s.fetchSummaries().catch(() => [] as CatalogActionSummary[])));
    const seen = new Set<string>();
    const merged: CatalogActionSummary[] = [];
    this._sourceMap.clear();
    for (let i = 0; i < results.length; i++) {
      for (const summary of results[i]!) {
        if (!seen.has(summary.name)) {
          seen.add(summary.name);
          merged.push(summary);
          this._sourceMap.set(summary.name, sorted[i]!);
        }
      }
    }
    this._actions = merged;
  }

  private _setDetail(detail: CatalogActionDetail): void {
    this._selectedAction = detail;
    this._view = 'detail';
    this._tryParams = {};
    this._tryResult = null;
    if (detail.inputs) {
      for (const [key, param] of Object.entries(detail.inputs)) {
        this._tryParams[key] = param.defaultValue ?? '';
      }
    }
  }

  async _loadDetail(name: string): Promise<void> {
    const source = this._sourceMap.get(name);
    if (source) {
      const detail = await source.fetchDetail(name);
      if (detail) this._setDetail(detail);
      return;
    }
    try {
      const resp = await fetch(`${this.baseUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `{ catalogAction(name: "${name}") { name description invokeKind source inputs outputs invoke { kind metadata } } }`,
        }),
      });
      if (!resp.ok) return;
      const json = await resp.json() as { data?: { catalogAction?: CatalogActionDetail } };
      const detail = json.data?.catalogAction;
      if (detail) this._setDetail(detail as CatalogActionDetail);
    } catch { /* ignore */ }
  }

  async _executeAction(): Promise<void> {
    if (!this._selectedAction) return;
    this._tryLoading = true;
    this._tryResult = null;
    try {
      const resp = await fetch(`${this.execBaseUrl}/playbook/catalog/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionName: this._selectedAction.name,
          params: { ...this._tryParams },
        }),
      });
      if (resp.ok) {
        this._tryResult = await resp.json();
      } else {
        this._tryResult = { kind: 'failure', message: `HTTP ${resp.status}` };
      }
    } catch (err) {
      this._tryResult = { kind: 'failure', message: err instanceof Error ? err.message : String(err) };
    } finally {
      this._tryLoading = false;
    }
  }

  static generateTemplate(detail: CatalogActionDetail): string {
    const lines: string[] = [`- ${detail.name}:`];
    if (detail.inputs) {
      for (const [name, param] of Object.entries(detail.inputs)) {
        const value = param.defaultValue ? `"${param.defaultValue}"` : '""';
        const comment = [param.type?.toLowerCase(), param.required ? 'required' : 'optional']
          .filter(Boolean).join(', ');
        lines.push(`    ${name}: ${value}  # ${comment}`);
      }
    }
    return lines.join('\n');
  }

  private _useTemplate(): void {
    if (!this._selectedAction) return;
    const yaml = PagesActionCatalog.generateTemplate(this._selectedAction);
    void navigator.clipboard?.writeText(yaml);
    this.dispatchEvent(new CustomEvent('step-template-selected', {
      detail: { actionName: this._selectedAction.name, yaml },
      bubbles: true,
      composed: true,
    }));
  }

  override render(): TemplateResult {
    if (this._view === 'detail' && this._selectedAction) {
      return this._renderDetail();
    }
    return this._renderList();
  }

  private _renderList(): TemplateResult {
    return html`
      <div class="search">
        <input type="text" placeholder="Search step actions..."
               .value=${this._searchText}
               @input=${(e: Event) => { this._searchText = (e.target as HTMLInputElement).value; }}
               aria-label="Search step actions">
      </div>
      ${this._allSources.length > 0 ? html`
        <div class="filters">
          ${this._allSources.map(source => html`
            <button class="filter-chip"
                    role="checkbox"
                    aria-checked="${this._sourceFilter.includes(source)}"
                    @click=${() => { this._toggleSource(source); }}>${source}</button>
          `)}
        </div>
      ` : nothing}
      ${this._allPortabilities.length > 0 ? html`
        <div class="filters">
          ${this._allPortabilities.map(p => html`
            <button class="filter-chip portability-badge portability-${p}"
                    role="checkbox"
                    aria-checked="${this._portabilityFilter.includes(p)}"
                    @click=${() => { this._togglePortability(p); }}>${p}</button>
          `)}
        </div>
      ` : nothing}
      <div class="action-list" role="list">
        ${this._filtered.length === 0
          ? html`<div class="empty">No step actions found</div>`
          : this._filtered.map(a => this._renderActionItem(a))}
      </div>
    `;
  }

  private _renderActionItem(action: CatalogActionSummary): TemplateResult {
    return html`
      <div class="action-item" role="listitem"
           @click=${() => { void this._loadDetail(action.name); }}>
        <div class="action-name">${action.name}</div>
        ${action.description ? html`<div class="action-desc">${action.description}</div>` : nothing}
        <div class="action-meta">
          <span class="source-badge">${action.source}</span>
          ${action.portability ? html`<span class="portability-badge portability-${action.portability}">${action.portability}</span>` : nothing}
          ${action.invokeKind ? html`<span class="kind-badge">${action.invokeKind}</span>` : nothing}
          <span class="io-count">${action.inputCount} in / ${action.outputCount} out</span>
        </div>
      </div>
    `;
  }

  private _renderDetail(): TemplateResult {
    const d = this._selectedAction!;
    return html`
      <div class="detail-header">
        <button class="back-btn" aria-label="Back to catalog list"
                @click=${() => { this._view = 'list'; this._selectedAction = null; }}>&#8592; Back</button>
        <span class="detail-name">${d.name}</span>
        <span class="source-badge">${d.source}</span>
        ${d.portability ? html`<span class="portability-badge portability-${d.portability}">${d.portability}</span>` : nothing}
        ${d.invokeKind ? html`<span class="kind-badge">${d.invokeKind}</span>` : nothing}
      </div>
      <div class="detail-body">
        ${d.description ? html`<div class="detail-desc">${d.description}</div>` : nothing}

        ${d.inputs && Object.keys(d.inputs).length > 0 ? html`
          <div class="section-title">Inputs</div>
          <table class="schema-table inputs-table">
            <thead><tr><th>Name</th><th>Type</th><th>Required</th><th>Default</th><th>Values</th><th>Description</th></tr></thead>
            <tbody>
              ${Object.entries(d.inputs).map(([name, p]) => html`
                <tr>
                  <td>${name}</td>
                  <td>${(p).type}</td>
                  <td>${(p).required ? 'yes' : ''}</td>
                  <td>${(p).defaultValue ?? ''}</td>
                  <td>${(p).allowedValues?.join(', ') ?? ''}</td>
                  <td>${(p).description ?? ''}</td>
                </tr>
              `)}
            </tbody>
          </table>
        ` : nothing}

        ${d.outputs && Object.keys(d.outputs).length > 0 ? html`
          <div class="section-title">Outputs</div>
          <table class="schema-table outputs-table">
            <thead><tr><th>Name</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              ${Object.entries(d.outputs).map(([name, p]) => html`
                <tr>
                  <td>${name}</td>
                  <td>${(p).type}</td>
                  <td>${(p).description ?? ''}</td>
                </tr>
              `)}
            </tbody>
          </table>
        ` : nothing}

        ${d.invoke ? html`
          <div class="section-title">Invoke Binding</div>
          <div class="invoke-summary">
            <strong>${d.invoke.kind}</strong>
            ${d.invoke.metadata ? html`
              <span class="invoke-meta">
                ${Object.entries(d.invoke.metadata).map(([k, v]) => html` &mdash; ${k}: ${v}`)}
              </span>
            ` : nothing}
          </div>
        ` : nothing}

        <div class="try-panel">
          <div class="section-title">Try It</div>
          ${d.portability && !isCompatible(d.portability as 'universal' | 'java' | 'ts' | 'both', this.runtime)
            ? html`<div class="portability-violation">
                This action requires '${d.portability}' runtime — incompatible with current '${this.runtime}' runtime.
              </div>`
            : nothing}
          <div class="try-form">
            ${d.inputs ? Object.entries(d.inputs).map(([name, p]) => {
              const param = p;
              return html`
                <div class="try-field">
                  <label>${name}${param.required ? ' *' : ''}</label>
                  ${param.allowedValues && param.allowedValues.length > 0
                    ? html`<select
                              .value=${this._tryParams[name] ?? ''}
                              @change=${(e: Event) => { this._tryParams = { ...this._tryParams, [name]: (e.target as HTMLSelectElement).value }; }}>
                        ${param.allowedValues.map(v => html`<option value=${v} ?selected=${v === (this._tryParams[name] ?? param.defaultValue)}>${v}</option>`)}
                      </select>`
                    : html`<input type="text"
                              .value=${this._tryParams[name] ?? ''}
                              placeholder=${param.defaultValue ?? ''}
                              @input=${(e: Event) => { this._tryParams = { ...this._tryParams, [name]: (e.target as HTMLInputElement).value }; }}>`
                  }
                </div>
              `;
            }) : nothing}
          </div>
          <div class="try-actions">
            <button class="exec-btn"
                    aria-label="Execute ${d.name}"
                    ?disabled=${this._tryLoading || (!!d.portability && !isCompatible(d.portability as 'universal' | 'java' | 'ts' | 'both', this.runtime))}
                    @click=${() => { void this._executeAction(); }}>
              ${this._tryLoading ? 'Running...' : 'Execute'}
            </button>
            <button class="template-btn"
                    aria-label="Use template"
                    @click=${() => { this._useTemplate(); }}>Use Template</button>
          </div>
          ${this._tryResult ? html`
            <div class="try-result ${this._tryResult.kind}">
              ${this._tryResult.kind === 'success'
                ? JSON.stringify(this._tryResult.output, null, 2)
                : this._tryResult.message}
            </div>
          ` : nothing}
        </div>
      </div>
    `;
  }

  private _toggleSource(source: string): void {
    if (this._sourceFilter.includes(source)) {
      this._sourceFilter = this._sourceFilter.filter(s => s !== source);
    } else {
      this._sourceFilter = [...this._sourceFilter, source];
    }
  }

  private _togglePortability(portability: string): void {
    if (this._portabilityFilter.includes(portability)) {
      this._portabilityFilter = this._portabilityFilter.filter(p => p !== portability);
    } else {
      this._portabilityFilter = [...this._portabilityFilter, portability];
    }
  }
}

if (!customElements.get('pages-action-catalog')) {
  customElements.define('pages-action-catalog', PagesActionCatalog);
}
