import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PreferencesApi } from './api.js';
import type { PreferenceSchemaDescriptor, PreferenceRecord } from './types.js';

describe('PreferencesApi', () => {
  let fetchFn: ReturnType<typeof vi.fn>;
  let api: PreferencesApi;

  beforeEach(() => {
    fetchFn = vi.fn();
    api = new PreferencesApi('/preferences', fetchFn);
  });

  const mockSchema: PreferenceSchemaDescriptor[] = [
    {
      namespace: 'casehub.work', name: 'sla.default-hours',
      qualifiedName: 'casehub.work.sla.default-hours', type: 'integer',
      label: 'Default SLA hours', description: null, defaultValue: '24',
      multiValue: false, constraints: { min: 1, max: 720 }, options: [],
    },
  ];

  const mockRecords: PreferenceRecord[] = [
    { tenancyId: 't1', scope: 'system', namespace: 'casehub.work',
      name: 'sla.default-hours', subKey: '', value: '24' },
  ];

  it('fetchSchema calls GET /preferences/schema', async () => {
    fetchFn.mockResolvedValue({ ok: true, json: async () => mockSchema });
    const result = await api.fetchSchema();
    expect(fetchFn).toHaveBeenCalledWith('/preferences/schema', expect.objectContaining({ method: 'GET' }));
    expect(result).toEqual(mockSchema);
  });

  it('fetchSchema with namespace filter', async () => {
    fetchFn.mockResolvedValue({ ok: true, json: async () => mockSchema });
    await api.fetchSchema('casehub.work');
    expect(fetchFn.mock.calls[0]![0]).toContain('namespace=casehub.work');
  });

  it('fetchAll calls GET /preferences with no scope', async () => {
    fetchFn.mockResolvedValue({ ok: true, json: async () => mockRecords });
    const result = await api.fetchAll();
    expect(fetchFn).toHaveBeenCalledWith('/preferences', expect.objectContaining({ method: 'GET' }));
    expect(result).toEqual(mockRecords);
  });

  it('set calls PUT /preferences?scope=<scope>', async () => {
    fetchFn.mockResolvedValue({ ok: true });
    await api.set('tenant/acme', { namespace: 'casehub.work', name: 'sla.default-hours', subKey: '', value: '8' });
    expect(fetchFn).toHaveBeenCalledWith(
      '/preferences?scope=tenant%2Facme',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ namespace: 'casehub.work', name: 'sla.default-hours', subKey: '', value: '8' }),
      }),
    );
  });

  it('deleteOne calls DELETE with query params', async () => {
    fetchFn.mockResolvedValue({ ok: true });
    await api.deleteOne('system', 'casehub.work', 'sla.default-hours', '');
    const url = fetchFn.mock.calls[0]![0] as string;
    expect(url).toContain('/preferences?');
    expect(url).toContain('scope=system');
    expect(url).toContain('namespace=casehub.work');
    expect(url).toContain('name=sla.default-hours');
    expect(fetchFn.mock.calls[0]![1].method).toBe('DELETE');
  });

  it('deleteNamespace calls DELETE /preferences/by-namespace', async () => {
    fetchFn.mockResolvedValue({ ok: true });
    await api.deleteNamespace('system', 'casehub.work');
    const url = fetchFn.mock.calls[0]![0] as string;
    expect(url).toContain('/preferences/by-namespace?');
    expect(url).toContain('namespace=casehub.work');
    expect(fetchFn.mock.calls[0]![1].method).toBe('DELETE');
  });

  it('throws on non-ok response', async () => {
    fetchFn.mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' });
    await expect(api.fetchSchema()).rejects.toThrow('500');
  });
});
