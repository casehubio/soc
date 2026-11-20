import { describe, it, expect, vi } from 'vitest';
import { html } from 'lit';
import type { TypedRow } from '@casehubio/pages-data';
import { PagesEventTrail } from './pages-event-trail.js';

describe('PagesEventTrail', () => {
  it('exports the class', () => {
    expect(PagesEventTrail).toBeDefined();
    expect(typeof PagesEventTrail).toBe('function');
  });

  describe('configure() passthrough', () => {
    it('passes through getRowDetail, getRowKey, and columnRenderers', () => {
      const el = new PagesEventTrail();
      const detail = (_row: TypedRow) => html`<div>detail</div>`;
      const key = (_row: TypedRow) => 'key';
      const renderers = new Map();

      el.configure({ getRowDetail: detail, getRowKey: key, columnRenderers: renderers });

      expect(el.getRowDetail).toBeDefined();
      expect(el.getRowKey).toBeDefined();
      expect(el.columnRenderers).toBe(renderers);
    });

    it('passes through recordsPath', () => {
      const el = new PagesEventTrail();
      el.configure({ recordsPath: 'records' });
      expect(el.recordsPath).toBe('records');
    });

    it('passes through csvExport', () => {
      const el = new PagesEventTrail();
      el.configure({ csvExport: true });
      expect(el.csvExport).toBe(true);
    });
  });

  describe('recordsPath', () => {
    it('extracts array from wrapped response via recordsPath', async () => {
      const el = new PagesEventTrail();
      el.recordsPath = 'records';
      el.columnDefs = [{ id: 'name', label: 'Name', getValue: (r: any) => r.name }];

      const mockResponse = { records: [{ name: 'Alice' }, { name: 'Bob' }], totalCount: 2 };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const factory = el.createSourceFactory();
      const source = factory('/api/test');
      const sink = { apply: vi.fn(), error: vi.fn() };
      source.connect(sink as any);

      await vi.waitFor(() => expect(el['_rawEntries']).toHaveLength(2));
      expect(el['_rawEntries'][0]).toEqual({ name: 'Alice' });
      expect(el['_rawEntries'][1]).toEqual({ name: 'Bob' });
    });

    it('treats response as array when recordsPath is not set', async () => {
      const el = new PagesEventTrail();
      el.columnDefs = [{ id: 'name', label: 'Name', getValue: (r: any) => r.name }];

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ name: 'Alice' }]),
      });

      const factory = el.createSourceFactory();
      const source = factory('/api/test');
      const sink = { apply: vi.fn(), error: vi.fn() };
      source.connect(sink as any);

      await vi.waitFor(() => expect(el['_rawEntries']).toHaveLength(1));
      expect(el['_rawEntries'][0]).toEqual({ name: 'Alice' });
    });
  });
});
