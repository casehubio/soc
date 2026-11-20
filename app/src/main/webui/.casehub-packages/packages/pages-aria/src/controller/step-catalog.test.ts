import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PagesActionCatalog, CatalogActionSummary, CatalogActionDetail } from './step-catalog.js';
import './step-catalog.js';
import type { CatalogDataSource } from './catalog-data-source.js';

class MockCatalogSource implements CatalogDataSource {
  constructor(
    private readonly summaries: CatalogActionSummary[],
    private readonly details: Map<string, CatalogActionDetail>,
    readonly priority: number,
  ) {}
  async fetchSummaries(): Promise<CatalogActionSummary[]> { return this.summaries; }
  async fetchDetail(name: string): Promise<CatalogActionDetail | null> { return this.details.get(name) ?? null; }
}

const MOCK_ACTIONS = [
  { name: 'check-compliance', description: 'Check doc compliance', invokeKind: 'rest', source: 'yaml', inputCount: 2, outputCount: 1 },
  { name: 'mcp.send-email', description: 'Send an email via MCP', invokeKind: 'mcp', source: 'mcp', inputCount: 3, outputCount: 0 },
  { name: 'run-audit', description: 'Run security audit script', invokeKind: 'script', source: 'script', inputCount: 1, outputCount: 2 },
];

const MOCK_DETAIL = {
  name: 'check-compliance',
  description: 'Check doc compliance',
  invokeKind: 'rest',
  source: 'yaml',
  inputs: {
    documentId: { type: 'STRING', required: true, defaultValue: null, allowedValues: null, format: null, description: 'Document identifier' },
    standard: { type: 'STRING', required: true, defaultValue: 'ISO-27001', allowedValues: ['ISO-27001', 'SOC-2', 'GDPR'], format: null, description: 'Compliance standard' },
  },
  outputs: {
    compliant: { type: 'BOOLEAN', required: false, defaultValue: null, allowedValues: null, format: null, description: 'Whether compliant' },
  },
  invoke: { kind: 'rest', metadata: { method: 'POST', url: 'https://api.example.com/compliance/check' } },
};

function createCatalog(baseUrl = 'http://localhost:8080'): PagesActionCatalog {
  const el = document.createElement('pages-action-catalog') as PagesActionCatalog;
  el.baseUrl = baseUrl;
  el.execBaseUrl = 'http://localhost:9090';
  return el;
}

function mockFetch() {
  return vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
    const body = opts?.body ? JSON.parse(opts.body as string) : {};
    if (typeof url === 'string' && url.includes('/graphql')) {
      if (typeof body.query === 'string' && body.query.includes('catalogAction(')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { catalogAction: MOCK_DETAIL } }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: { catalogActions: MOCK_ACTIONS } }),
      });
    }
    if (typeof url === 'string' && url.includes('/playbook/catalog/execute')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ kind: 'success', output: { compliant: true }, executionMetadata: {} }),
      });
    }
    return Promise.resolve({ ok: false });
  });
}

describe('pages-action-catalog', () => {
  let el: PagesActionCatalog;

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch());
  });

  afterEach(() => {
    el?.remove();
    vi.restoreAllMocks();
  });

  describe('list view', () => {
    it('renders action list after loading', async () => {
      el = createCatalog();
      document.body.appendChild(el);
      await el.loadCatalog();
      await el.updateComplete;
      const items = el.shadowRoot!.querySelectorAll('.action-item');
      expect(items.length).toBe(3);
    });

    it('shows action name and description', async () => {
      el = createCatalog();
      document.body.appendChild(el);
      await el.loadCatalog();
      await el.updateComplete;
      const name = el.shadowRoot!.querySelector('.action-name');
      expect(name).not.toBeNull();
      expect(name!.textContent).toBe('check-compliance');
    });

    it('shows source badge', async () => {
      el = createCatalog();
      document.body.appendChild(el);
      await el.loadCatalog();
      await el.updateComplete;
      const badges = el.shadowRoot!.querySelectorAll('.source-badge');
      expect(badges.length).toBe(3);
      expect(badges[0]!.textContent.trim()).toBe('yaml');
    });

    it('filters by search text', async () => {
      el = createCatalog();
      document.body.appendChild(el);
      await el.loadCatalog();
      el['_searchText'] = 'compliance';
      await el.updateComplete;
      const items = el.shadowRoot!.querySelectorAll('.action-item');
      expect(items.length).toBe(1);
    });

    it('filters by source chip', async () => {
      el = createCatalog();
      document.body.appendChild(el);
      await el.loadCatalog();
      el['_sourceFilter'] = ['mcp'];
      await el.updateComplete;
      const items = el.shadowRoot!.querySelectorAll('.action-item');
      expect(items.length).toBe(1);
      expect(items[0]!.querySelector('.action-name')!.textContent).toBe('mcp.send-email');
    });

    it('shows empty state when no actions match', async () => {
      el = createCatalog();
      document.body.appendChild(el);
      await el.loadCatalog();
      el['_searchText'] = 'nonexistent';
      await el.updateComplete;
      const empty = el.shadowRoot!.querySelector('.empty');
      expect(empty).not.toBeNull();
    });

    it('search input has correct aria-label', async () => {
      el = createCatalog();
      document.body.appendChild(el);
      await el.loadCatalog();
      await el.updateComplete;
      const input = el.shadowRoot!.querySelector('input[aria-label="Search step actions"]');
      expect(input).not.toBeNull();
    });

    it('calls GraphQL endpoint with correct query', async () => {
      el = createCatalog();
      document.body.appendChild(el);
      await el.loadCatalog();
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8080/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      );
    });
  });

  describe('detail view', () => {
    it('shows input schema table', async () => {
      el = createCatalog();
      document.body.appendChild(el);
      await el.loadCatalog();
      await el['_loadDetail']('check-compliance');
      await el.updateComplete;
      const table = el.shadowRoot!.querySelector('.inputs-table');
      expect(table).not.toBeNull();
      const rows = table!.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
    });

    it('shows output schema table', async () => {
      el = createCatalog();
      document.body.appendChild(el);
      await el.loadCatalog();
      await el['_loadDetail']('check-compliance');
      await el.updateComplete;
      const table = el.shadowRoot!.querySelector('.outputs-table');
      expect(table).not.toBeNull();
    });

    it('back button returns to list', async () => {
      el = createCatalog();
      document.body.appendChild(el);
      await el.loadCatalog();
      await el['_loadDetail']('check-compliance');
      await el.updateComplete;
      const back = el.shadowRoot!.querySelector('[aria-label="Back to catalog list"]') as HTMLElement;
      expect(back).not.toBeNull();
      back.click();
      await el.updateComplete;
      expect(el['_view']).toBe('list');
    });

    it('shows invoke binding summary', async () => {
      el = createCatalog();
      document.body.appendChild(el);
      await el.loadCatalog();
      await el['_loadDetail']('check-compliance');
      await el.updateComplete;
      const invoke = el.shadowRoot!.querySelector('.invoke-summary');
      expect(invoke).not.toBeNull();
      expect(invoke!.textContent).toContain('rest');
    });
  });

  describe('try-it execution', () => {
    it('calls execute endpoint and shows result', async () => {
      el = createCatalog();
      document.body.appendChild(el);
      await el.loadCatalog();
      await el['_loadDetail']('check-compliance');
      await el.updateComplete;
      await el['_executeAction']();
      await el.updateComplete;
      const result = el.shadowRoot!.querySelector('.try-result');
      expect(result).not.toBeNull();
      expect(result!.classList.contains('success')).toBe(true);
    });
  });

  describe('YAML template', () => {
    it('generates correct YAML from action detail', async () => {
      el = createCatalog();
      document.body.appendChild(el);
      const { PagesActionCatalog: Cls } = await import('./step-catalog.js');
      const yaml = Cls.generateTemplate(MOCK_DETAIL);
      expect(yaml).toContain('- check-compliance:');
      expect(yaml).toContain('documentId:');
      expect(yaml).toContain('"ISO-27001"');
    });

    it('emits event with YAML template on use-template click', async () => {
      el = createCatalog();
      document.body.appendChild(el);
      await el.loadCatalog();
      await el['_loadDetail']('check-compliance');
      await el.updateComplete;

      const events: CustomEvent[] = [];
      el.addEventListener('step-template-selected', (e) => events.push(e as CustomEvent));

      const btn = el.shadowRoot!.querySelector('[aria-label="Use template"]') as HTMLElement;
      expect(btn).not.toBeNull();
      btn.click();
      await el.updateComplete;

      expect(events.length).toBe(1);
      expect(events[0]!.detail.actionName).toBe('check-compliance');
      expect(events[0]!.detail.yaml).toContain('check-compliance');
    });
  });

  describe('multi-source merge', () => {
    const SOURCE_A_ACTIONS: CatalogActionSummary[] = [
      { name: 'action-a', description: 'From source A', invokeKind: 'rest', source: 'registry', portability: 'universal', inputCount: 1, outputCount: 0 },
      { name: 'shared-action', description: 'A version', invokeKind: 'rest', source: 'registry', portability: 'universal', inputCount: 2, outputCount: 1 },
    ];
    const SOURCE_B_ACTIONS: CatalogActionSummary[] = [
      { name: 'action-b', description: 'From source B', invokeKind: 'mcp', source: 'graphql', portability: 'java', inputCount: 1, outputCount: 1 },
      { name: 'shared-action', description: 'B version', invokeKind: 'graphql', source: 'graphql', portability: 'java', inputCount: 3, outputCount: 2 },
    ];
    const DETAIL_A: CatalogActionDetail = {
      name: 'action-a', description: 'From source A', invokeKind: 'rest', source: 'registry', portability: 'universal',
      inputs: { x: { type: 'STRING', required: true, defaultValue: null, allowedValues: null, format: null, description: null } },
      outputs: {}, invoke: null,
    };

    it('merges actions from multiple sources', async () => {
      el = document.createElement('pages-action-catalog') as PagesActionCatalog;
      document.body.appendChild(el);
      const sourceA = new MockCatalogSource(SOURCE_A_ACTIONS, new Map(), 0);
      const sourceB = new MockCatalogSource(SOURCE_B_ACTIONS, new Map(), 10);
      el.sources = [sourceA, sourceB];
      await el.loadFromSources();
      await el.updateComplete;
      const items = el.shadowRoot!.querySelectorAll('.action-item');
      expect(items.length).toBe(3);
    });

    it('lower priority source wins on name collision', async () => {
      el = document.createElement('pages-action-catalog') as PagesActionCatalog;
      document.body.appendChild(el);
      const sourceA = new MockCatalogSource(SOURCE_A_ACTIONS, new Map(), 0);
      const sourceB = new MockCatalogSource(SOURCE_B_ACTIONS, new Map(), 10);
      el.sources = [sourceA, sourceB];
      await el.loadFromSources();
      await el.updateComplete;
      const names = Array.from(el.shadowRoot!.querySelectorAll('.action-name')).map(n => n.textContent);
      expect(names).toContain('shared-action');
      const sharedItem = el.shadowRoot!.querySelectorAll('.action-item')[1]!;
      expect(sharedItem.querySelector('.action-desc')!.textContent).toBe('A version');
    });

    it('fetches detail from the source that provided the summary', async () => {
      el = document.createElement('pages-action-catalog') as PagesActionCatalog;
      document.body.appendChild(el);
      const detailMap = new Map<string, CatalogActionDetail>([['action-a', DETAIL_A]]);
      const sourceA = new MockCatalogSource(SOURCE_A_ACTIONS, detailMap, 0);
      const sourceB = new MockCatalogSource(SOURCE_B_ACTIONS, new Map(), 10);
      el.sources = [sourceA, sourceB];
      await el.loadFromSources();
      await el['_loadDetail']('action-a');
      await el.updateComplete;
      expect(el['_selectedAction']).not.toBeNull();
      expect(el['_selectedAction']!.name).toBe('action-a');
      expect(el['_selectedAction']!.portability).toBe('universal');
    });

    it('handles source fetch failure gracefully', async () => {
      el = document.createElement('pages-action-catalog') as PagesActionCatalog;
      document.body.appendChild(el);
      const failingSource: CatalogDataSource = {
        priority: 0,
        fetchSummaries: () => Promise.reject(new Error('network error')),
        fetchDetail: () => Promise.reject(new Error('network error')),
      };
      const goodSource = new MockCatalogSource(SOURCE_B_ACTIONS, new Map(), 10);
      el.sources = [failingSource, goodSource];
      await el.loadFromSources();
      await el.updateComplete;
      const items = el.shadowRoot!.querySelectorAll('.action-item');
      expect(items.length).toBe(2);
    });
  });

  describe('portability badges', () => {
    it('renders portability badge on action items', async () => {
      el = document.createElement('pages-action-catalog') as PagesActionCatalog;
      document.body.appendChild(el);
      const actions: CatalogActionSummary[] = [
        { name: 'rest-action', description: 'Universal', invokeKind: 'rest', source: 'yaml', portability: 'universal', inputCount: 1, outputCount: 0 },
        { name: 'ts-action', description: 'TS only', invokeKind: 'mcp', source: 'plugin', portability: 'ts', inputCount: 1, outputCount: 0 },
      ];
      const source = new MockCatalogSource(actions, new Map(), 0);
      el.sources = [source];
      await el.loadFromSources();
      await el.updateComplete;
      const badges = el.shadowRoot!.querySelectorAll('.portability-badge:not(.filter-chip)');
      expect(badges.length).toBe(2);
      expect(badges[0]!.textContent).toBe('universal');
      expect(badges[0]!.classList.contains('portability-universal')).toBe(true);
      expect(badges[1]!.textContent).toBe('ts');
      expect(badges[1]!.classList.contains('portability-ts')).toBe(true);
    });

    it('does not render portability badge when portability is empty', async () => {
      el = document.createElement('pages-action-catalog') as PagesActionCatalog;
      document.body.appendChild(el);
      vi.stubGlobal('fetch', mockFetch());
      await el.loadCatalog();
      await el.updateComplete;
      const badges = el.shadowRoot!.querySelectorAll('.portability-badge:not(.filter-chip)');
      expect(badges.length).toBe(0);
    });
  });

  describe('portability filter', () => {
    const MIXED_ACTIONS: CatalogActionSummary[] = [
      { name: 'rest-action', description: 'Universal', invokeKind: 'rest', source: 'yaml', portability: 'universal', inputCount: 1, outputCount: 0 },
      { name: 'ts-action', description: 'TS only', invokeKind: 'mcp', source: 'plugin', portability: 'ts', inputCount: 1, outputCount: 0 },
      { name: 'java-action', description: 'Java only', invokeKind: 'graphql', source: 'graphql', portability: 'java', inputCount: 2, outputCount: 1 },
    ];

    it('renders portability filter chips', async () => {
      el = document.createElement('pages-action-catalog') as PagesActionCatalog;
      document.body.appendChild(el);
      el.sources = [new MockCatalogSource(MIXED_ACTIONS, new Map(), 0)];
      await el.loadFromSources();
      await el.updateComplete;
      const chips = el.shadowRoot!.querySelectorAll('.filter-chip.portability-badge');
      expect(chips.length).toBe(3);
    });

    it('filters by portability when chip is clicked', async () => {
      el = document.createElement('pages-action-catalog') as PagesActionCatalog;
      document.body.appendChild(el);
      el.sources = [new MockCatalogSource(MIXED_ACTIONS, new Map(), 0)];
      await el.loadFromSources();
      await el.updateComplete;
      el['_portabilityFilter'] = ['ts'];
      await el.updateComplete;
      const items = el.shadowRoot!.querySelectorAll('.action-item');
      expect(items.length).toBe(1);
      expect(items[0]!.querySelector('.action-name')!.textContent).toBe('ts-action');
    });

    it('combines source and portability filters with AND logic', async () => {
      el = document.createElement('pages-action-catalog') as PagesActionCatalog;
      document.body.appendChild(el);
      el.sources = [new MockCatalogSource(MIXED_ACTIONS, new Map(), 0)];
      await el.loadFromSources();
      await el.updateComplete;
      el['_sourceFilter'] = ['yaml', 'plugin'];
      el['_portabilityFilter'] = ['ts'];
      await el.updateComplete;
      const items = el.shadowRoot!.querySelectorAll('.action-item');
      expect(items.length).toBe(1);
      expect(items[0]!.querySelector('.action-name')!.textContent).toBe('ts-action');
    });
  });

  describe('portability pre-flight check', () => {
    const JAVA_DETAIL: CatalogActionDetail = {
      name: 'java-action', description: 'Java only', invokeKind: 'graphql', source: 'graphql', portability: 'java',
      inputs: { id: { type: 'STRING', required: true, defaultValue: null, allowedValues: null, format: null, description: null } },
      outputs: {}, invoke: null,
    };
    const UNIVERSAL_DETAIL: CatalogActionDetail = {
      name: 'universal-action', description: 'Universal', invokeKind: 'rest', source: 'yaml', portability: 'universal',
      inputs: {}, outputs: {}, invoke: null,
    };

    it('shows violation message for incompatible action', async () => {
      el = document.createElement('pages-action-catalog') as PagesActionCatalog;
      el.runtime = 'ts';
      document.body.appendChild(el);
      el['_setDetail'](JAVA_DETAIL);
      await el.updateComplete;
      const violation = el.shadowRoot!.querySelector('.portability-violation');
      expect(violation).not.toBeNull();
      expect(violation!.textContent).toContain('java');
      expect(violation!.textContent).toContain('ts');
    });

    it('disables execute button for incompatible action', async () => {
      el = document.createElement('pages-action-catalog') as PagesActionCatalog;
      el.runtime = 'ts';
      document.body.appendChild(el);
      el['_setDetail'](JAVA_DETAIL);
      await el.updateComplete;
      const btn = el.shadowRoot!.querySelector('.exec-btn') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it('does not show violation for compatible action', async () => {
      el = document.createElement('pages-action-catalog') as PagesActionCatalog;
      el.runtime = 'ts';
      document.body.appendChild(el);
      el['_setDetail'](UNIVERSAL_DETAIL);
      await el.updateComplete;
      const violation = el.shadowRoot!.querySelector('.portability-violation');
      expect(violation).toBeNull();
      const btn = el.shadowRoot!.querySelector('.exec-btn') as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });
  });
});
