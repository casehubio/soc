import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { DataSourceAdapter } from '@casehubio/pages-component';
import { fromRows } from '@casehubio/pages-data';
import { ColumnType, columnId } from '@casehubio/pages-data';
import type { TypedDataSet, TypedRow } from '@casehubio/pages-data';
import type { DataSink } from '@casehubio/pages-data/dist/datasource/types.js';
import '@casehubio/pages-table';
import './value-editor.js';
import { PreferencesApi } from './api.js';
import type {
  ScopeNode, PreferenceSchemaDescriptor, PreferenceRecord,
  PreferenceRow, InheritanceState,
} from './types.js';

const ID_COL = columnId('id');
const PARENT_COL = columnId('parentId');
const LABEL_COL = columnId('label');
const VALUE_COL = columnId('value');
const TYPE_COL = columnId('schemaType');
const STATE_COL = columnId('inheritanceState');
const SOURCE_COL = columnId('sourceScope');
const ROW_TYPE_COL = columnId('rowType');
const QN_COL = columnId('qualifiedName');
const SCOPE_COL = columnId('scope');

export interface PreferencesEditorProps {
  endpoint: string;
}

@customElement('agency-preferences-editor')
export class PreferencesEditor extends LitElement {
  @property({ attribute: false }) scopeTree: readonly ScopeNode[] = [];
  @property({ type: String }) endpoint = '/preferences';
  @property({ attribute: false }) fetchFn: typeof fetch = fetch;

  @state() _saveError: string | null = null;

  private readonly _dataSource = new DataSourceAdapter(this, {
    sourceFactory: (url) => this._createPreferencesSource(url),
  });

  private _api!: PreferencesApi;
  private _schema: PreferenceSchemaDescriptor[] = [];
  private _records: PreferenceRecord[] = [];

  get loading(): boolean { return this._dataSource.loading; }
  get error(): string { return this._dataSource.error; }
  get dataSet(): TypedDataSet | undefined { return this._dataSource.dataSet; }

  static override styles = css`
    :host { display: block; height: 100%; }
    .error { padding: 16px; color: var(--pages-danger-color, #dc3545); text-align: center; }
    .loading { padding: 32px; text-align: center; color: var(--pages-muted-color, #999); }
    .source-badge {
      font-size: 0.6875rem;
      color: var(--pages-muted-color, #999);
      margin-left: 4px;
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'form');
    this.setAttribute('aria-label', 'Preferences');
    this._dataSource.endpoint = this.endpoint;
  }

  private _createPreferencesSource(url: string) {
    let abort: AbortController | undefined;
    return {
      connect: (sink: DataSink) => {
        abort = new AbortController();
        this._fetchPreferences(url, sink, abort.signal);
      },
      disconnect: () => { abort?.abort(); },
    };
  }

  private async _fetchPreferences(url: string, sink: DataSink, signal: AbortSignal): Promise<void> {
    try {
      this._api = new PreferencesApi(url, this.fetchFn);
      const [schema, records] = await Promise.all([
        this._api.fetchSchema(),
        this._api.fetchAll(),
      ]);
      if (signal.aborted) return;
      this._schema = schema;
      this._records = records;
      const dataset = this._buildDataSet();
      sink.apply({ type: 'snapshot', dataset });
    } catch (err) {
      if (signal.aborted) return;
      sink.error({ message: err instanceof Error ? err.message : String(err), permanent: true });
    }
  }

  override render() {
    if (this._dataSource.loading) return html`<div class="loading">Loading preferences...</div>`;
    if (this._dataSource.error || this._saveError) return html`<div class="error">${this._dataSource.error || this._saveError}</div>`;
    if (!this._dataSource.dataSet) return nothing;

    return html`
      <pages-data-table
        .dataSet=${this._dataSource.dataSet}
        .columnConfig=${[
          { id: ID_COL, label: 'Name' },
          { id: PARENT_COL, label: '' },
          { id: LABEL_COL, label: 'Name' },
          { id: VALUE_COL, label: 'Value' },
          { id: TYPE_COL, label: '' },
          { id: STATE_COL, label: '' },
          { id: SOURCE_COL, label: 'Source' },
          { id: ROW_TYPE_COL, label: '' },
          { id: QN_COL, label: '' },
          { id: SCOPE_COL, label: '' },
        ]}
        .hiddenColumns=${[String(ID_COL), String(PARENT_COL), String(TYPE_COL), String(STATE_COL), String(ROW_TYPE_COL), String(QN_COL), String(SCOPE_COL)]}
        .columnRenderers=${this._columnRenderers()}
        .props=${{ expandable: { idColumn: ID_COL, parentColumn: PARENT_COL, defaultExpanded: true } }}
        client-filter
      ></pages-data-table>
    `;
  }

  private _columnRenderers() {
    const schemaMap = new Map(this._schema.map(s => [s.qualifiedName, s]));
    return new Map([
      [VALUE_COL, (_cell: unknown, row: TypedRow) => {
        const rowType = row.text(ROW_TYPE_COL);
        if (rowType === 'scope') return html``;
        const qn = row.text(QN_COL);
        const schema = schemaMap.get(qn);
        if (!schema) return html`<span>${row.text(VALUE_COL)}</span>`;
        const inheritState = row.text(STATE_COL) as InheritanceState;
        const disabled = inheritState === 'inherited' || inheritState === 'default';
        const scope = row.text(SCOPE_COL);
        const value = row.text(VALUE_COL);
        return html`<agency-value-editor
          .schema=${schema}
          .value=${value}
          ?disabled=${disabled}
          style="display:inline-block;min-width:120px;"
          @value-changed=${(e: CustomEvent) => this.handleSave(scope, schema.namespace, schema.name, '', e.detail.value)}
        ></agency-value-editor>`;
      }],
      [SOURCE_COL, (_cell: unknown, row: TypedRow) => {
        const rowType = row.text(ROW_TYPE_COL);
        if (rowType === 'scope') return html``;
        const inheritState = row.text(STATE_COL) as InheritanceState;
        const source = row.text(SOURCE_COL);
        if (inheritState === 'inherited') return html`<span class="source-badge" style="font-style:italic;">from: ${source}</span>`;
        if (inheritState === 'overridden') return html`<span class="source-badge">overrides ${source}</span>`;
        if (inheritState === 'default') return html`<span class="source-badge" style="font-style:italic;">default</span>`;
        return html`<span class="source-badge">local</span>`;
      }],
    ]);
  }

  async handleSave(scope: string, namespace: string, name: string, subKey: string, newValue: string): Promise<void> {
    const oldValue = this._findRecordValue(scope, namespace, name, subKey);
    try {
      this._saveError = null;
      await this._api.set(scope, { namespace, name, subKey, value: newValue });
      this.dispatchEvent(new CustomEvent('preference-changed', {
        detail: { scope, qualifiedName: `${namespace}.${name}`, oldValue, newValue },
        bubbles: true, composed: true,
      }));
      this._dataSource.refresh();
    } catch (e) {
      this._saveError = e instanceof Error ? e.message : String(e);
    }
  }

  async handleDelete(scope: string, namespace: string, name: string, subKey: string): Promise<void> {
    try {
      this._saveError = null;
      await this._api.deleteOne(scope, namespace, name, subKey);
      this.dispatchEvent(new CustomEvent('preference-deleted', {
        detail: { scope, qualifiedName: `${namespace}.${name}` },
        bubbles: true, composed: true,
      }));
      this._dataSource.refresh();
    } catch (e) {
      this._saveError = e instanceof Error ? e.message : String(e);
    }
  }

  private _findRecordValue(scope: string, namespace: string, name: string, subKey: string): string | undefined {
    return this._records.find(r =>
      r.scope === scope && r.namespace === namespace && r.name === name && r.subKey === subKey
    )?.value;
  }

  private _buildDataSet(): TypedDataSet {
    const rows = this._buildRows();
    return fromRows(rows, [
      { id: ID_COL, name: 'id', type: ColumnType.TEXT, getValue: (r: PreferenceRow) => r.id },
      { id: PARENT_COL, name: 'parentId', type: ColumnType.TEXT, getValue: (r: PreferenceRow) => r.parentId },
      { id: LABEL_COL, name: 'label', type: ColumnType.TEXT, getValue: (r: PreferenceRow) => r.label },
      { id: VALUE_COL, name: 'value', type: ColumnType.TEXT, getValue: (r: PreferenceRow) => r.value },
      { id: TYPE_COL, name: 'schemaType', type: ColumnType.TEXT, getValue: (r: PreferenceRow) => r.schemaType },
      { id: STATE_COL, name: 'inheritanceState', type: ColumnType.TEXT, getValue: (r: PreferenceRow) => r.inheritanceState },
      { id: SOURCE_COL, name: 'sourceScope', type: ColumnType.TEXT, getValue: (r: PreferenceRow) => r.sourceScope },
      { id: ROW_TYPE_COL, name: 'rowType', type: ColumnType.TEXT, getValue: (r: PreferenceRow) => r.rowType },
      { id: QN_COL, name: 'qualifiedName', type: ColumnType.TEXT, getValue: (r: PreferenceRow) => r.qualifiedName },
      { id: SCOPE_COL, name: 'scope', type: ColumnType.TEXT, getValue: (r: PreferenceRow) => r.scope },
    ]);
  }

  _buildRows(): PreferenceRow[] {
    const rows: PreferenceRow[] = [];
    const recordIndex = new Map<string, PreferenceRecord>();
    for (const r of this._records) {
      recordIndex.set(`${r.scope}:${r.namespace}.${r.name}:${r.subKey}`, r);
    }

    const walkScope = (node: ScopeNode, parentId: string, ancestorScopes: string[]) => {
      rows.push({
        id: node.path,
        parentId,
        rowType: 'scope',
        label: node.label,
        value: '',
        schemaType: '',
        inheritanceState: 'local',
        sourceScope: '',
        qualifiedName: '',
        scope: node.path,
      });

      for (const schema of this._schema) {
        if (schema.multiValue) continue;
        const key = `${node.path}:${schema.qualifiedName}:`;
        const localRecord = recordIndex.get(key);

        let inheritanceState: InheritanceState = 'default';
        let value = schema.defaultValue;
        let sourceScope = 'default';

        if (localRecord) {
          value = localRecord.value;
          sourceScope = node.path;
          const parentRecord = ancestorScopes.find(s => recordIndex.has(`${s}:${schema.qualifiedName}:`));
          inheritanceState = parentRecord ? 'overridden' : 'local';
          if (inheritanceState === 'overridden') sourceScope = parentRecord!;
        } else {
          const inheritedScope = ancestorScopes.find(s => recordIndex.has(`${s}:${schema.qualifiedName}:`));
          if (inheritedScope) {
            value = recordIndex.get(`${inheritedScope}:${schema.qualifiedName}:`)!.value;
            sourceScope = inheritedScope;
            inheritanceState = 'inherited';
          }
        }

        rows.push({
          id: `${node.path}:${schema.qualifiedName}`,
          parentId: node.path,
          rowType: 'preference',
          label: schema.label,
          value,
          schemaType: schema.type,
          inheritanceState,
          sourceScope,
          qualifiedName: schema.qualifiedName,
          scope: node.path,
        });
      }

      if (node.children) {
        for (const child of node.children) {
          walkScope(child, node.path, [node.path, ...ancestorScopes]);
        }
      }
    };

    for (const root of this.scopeTree) {
      walkScope(root, '', []);
    }
    return rows;
  }
}
