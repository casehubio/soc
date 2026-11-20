import { describe, it, expect, vi, beforeEach } from 'vitest';
import './preferences-editor.js';
import type { PreferenceSchemaDescriptor, PreferenceRecord, ScopeNode } from './types.js';

describe('PreferencesEditor', () => {
  let fetchFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchFn = vi.fn();
    document.body.innerHTML = '';
  });

  const SCHEMA: PreferenceSchemaDescriptor[] = [
    {
      namespace: 'casehub.work', name: 'sla.default-hours',
      qualifiedName: 'casehub.work.sla.default-hours', type: 'integer',
      label: 'Default SLA hours', description: 'Hours before escalation',
      defaultValue: '24', multiValue: false,
      constraints: { min: 1, max: 720 }, options: [],
    },
    {
      namespace: 'casehub.work', name: 'delegation.decline-target',
      qualifiedName: 'casehub.work.delegation.decline-target', type: 'enum',
      label: 'Decline target', description: null, defaultValue: 'POOL',
      multiValue: false, constraints: {},
      options: [{ value: 'POOL', label: 'Return to pool' }, { value: 'DELEGATOR', label: 'Return to delegator' }],
    },
  ];

  const RECORDS: PreferenceRecord[] = [
    { tenancyId: 't1', scope: 'system', namespace: 'casehub.work', name: 'sla.default-hours', subKey: '', value: '24' },
    { tenancyId: 't1', scope: 'tenant/acme', namespace: 'casehub.work', name: 'sla.default-hours', subKey: '', value: '8' },
  ];

  const SCOPE_TREE: ScopeNode[] = [
    { path: 'system', label: 'System', children: [
      { path: 'tenant/acme', label: 'Acme Corp' },
    ]},
  ];

  function mockFetchResponses() {
    fetchFn.mockImplementation((url: string) => {
      if (url.includes('/schema')) return Promise.resolve({ ok: true, json: async () => SCHEMA });
      return Promise.resolve({ ok: true, json: async () => RECORDS });
    });
  }

  function create(scopeTree: ScopeNode[] = SCOPE_TREE) {
    const el = document.createElement('agency-preferences-editor') as any;
    el.scopeTree = scopeTree;
    el.endpoint = '/preferences';
    el.fetchFn = fetchFn;
    document.body.appendChild(el);
    return el;
  }

  async function waitForLoad(el: any) {
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 50));
    await el.updateComplete;
  }

  it('fetches schema and records on connectedCallback', async () => {
    mockFetchResponses();
    const el = create();
    await waitForLoad(el);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    const urls = fetchFn.mock.calls.map((c: unknown[]) => c[0]);
    expect(urls).toContain('/preferences/schema');
    expect(urls).toContain('/preferences');
  });

  it('builds dataset with scope and preference rows', async () => {
    mockFetchResponses();
    const el = create();
    await waitForLoad(el);
    const ds = el.dataSet;
    expect(ds).toBeTruthy();
    expect(ds.rows.length).toBeGreaterThan(0);
  });

  it('computes local state for preferences set at a scope', async () => {
    mockFetchResponses();
    const el = create();
    await waitForLoad(el);
    const rows = el._buildRows();
    const systemSla = rows.find((r: any) => r.id === 'system:casehub.work.sla.default-hours');
    expect(systemSla).toBeTruthy();
    expect(systemSla.inheritanceState).toBe('local');
    expect(systemSla.value).toBe('24');
  });

  it('computes overridden state for child scope overrides', async () => {
    mockFetchResponses();
    const el = create();
    await waitForLoad(el);
    const rows = el._buildRows();
    const acmeSla = rows.find((r: any) => r.id === 'tenant/acme:casehub.work.sla.default-hours');
    expect(acmeSla).toBeTruthy();
    expect(acmeSla.inheritanceState).toBe('overridden');
    expect(acmeSla.value).toBe('8');
    expect(acmeSla.sourceScope).toBe('system');
  });

  it('computes inherited state for preferences not set at a scope', async () => {
    mockFetchResponses();
    const el = create();
    await waitForLoad(el);
    const rows = el._buildRows();
    const acmeDecline = rows.find((r: any) => r.id === 'tenant/acme:casehub.work.delegation.decline-target');
    expect(acmeDecline).toBeTruthy();
    expect(acmeDecline.inheritanceState).toBe('default');
  });

  it('computes default state when no record exists at any scope', async () => {
    mockFetchResponses();
    const el = create();
    await waitForLoad(el);
    const rows = el._buildRows();
    const systemDecline = rows.find((r: any) => r.id === 'system:casehub.work.delegation.decline-target');
    expect(systemDecline).toBeTruthy();
    expect(systemDecline.inheritanceState).toBe('default');
    expect(systemDecline.value).toBe('POOL');
  });

  it('emits preference-changed on successful save', async () => {
    mockFetchResponses();
    const el = create();
    await waitForLoad(el);
    const handler = vi.fn();
    el.addEventListener('preference-changed', handler);
    await el.handleSave('tenant/acme', 'casehub.work', 'sla.default-hours', '', '12');
    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0]![0].detail.newValue).toBe('12');
  });

  it('emits preference-deleted on successful delete', async () => {
    mockFetchResponses();
    const el = create();
    await waitForLoad(el);
    const handler = vi.fn();
    el.addEventListener('preference-deleted', handler);
    await el.handleDelete('tenant/acme', 'casehub.work', 'sla.default-hours', '');
    expect(handler).toHaveBeenCalled();
  });

  it('shows loading state during fetch', async () => {
    fetchFn.mockImplementation(() => new Promise(() => {}));
    const el = create();
    await el.updateComplete;
    const loading = el.shadowRoot!.querySelector('.loading');
    expect(loading).toBeTruthy();
  });

  it('shows error state on fetch failure', async () => {
    fetchFn.mockRejectedValue(new Error('Network error'));
    const el = create();
    await waitForLoad(el);
    const error = el.shadowRoot!.querySelector('.error');
    expect(error).toBeTruthy();
  });

  it('creates scope rows as parents of preference rows', async () => {
    mockFetchResponses();
    const el = create();
    await waitForLoad(el);
    const rows = el._buildRows();
    const scopeRows = rows.filter((r: any) => r.rowType === 'scope');
    const prefRows = rows.filter((r: any) => r.rowType === 'preference');
    expect(scopeRows).toHaveLength(2);
    expect(prefRows).toHaveLength(4);
    expect(prefRows.every((r: any) => scopeRows.some((s: any) => s.id === r.parentId))).toBe(true);
  });

  it('has role="form" and aria-label on host', async () => {
    const el = create();
    expect(el.getAttribute('role')).toBe('form');
    expect(el.getAttribute('aria-label')).toBe('Preferences');
  });
});
