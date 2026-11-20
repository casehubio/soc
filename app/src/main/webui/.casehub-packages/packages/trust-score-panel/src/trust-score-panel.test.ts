import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './trust-score-panel.js';
import type { TrustScorePanel } from './trust-score-panel.js';
import type { TrustScoreResponse } from './types.js';
import { fromRows } from '@casehubio/pages-data';
import { columnId, ColumnType } from '@casehubio/pages-data';

let originalFetch: typeof globalThis.fetch;

describe('agency-trust-score-panel', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    document.body.innerHTML = '';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('Types and Helpers', () => {
    it('trustLevelFromScore returns correct levels', async () => {
      const { trustLevelFromScore } = await import('./types.js');
      expect(trustLevelFromScore(0.85)).toBe('high');
      expect(trustLevelFromScore(0.7)).toBe('high');
      expect(trustLevelFromScore(0.6)).toBe('adequate');
      expect(trustLevelFromScore(0.4)).toBe('adequate');
      expect(trustLevelFromScore(0.3)).toBe('low');
      expect(trustLevelFromScore(undefined)).toBe('none');
    });

    it('maturityFromCount returns correct phases', async () => {
      const { maturityFromCount } = await import('./types.js');
      expect(maturityFromCount(5)).toBe('bootstrap');
      expect(maturityFromCount(9)).toBe('bootstrap');
      expect(maturityFromCount(10)).toBe('calibrating');
      expect(maturityFromCount(50)).toBe('calibrating');
      expect(maturityFromCount(51)).toBe('mature');
      expect(maturityFromCount(1000)).toBe('mature');
    });
  });

  describe('Full Mode', () => {
    it('renders loading state during fetch', async () => {
      let resolveFetch: (value: any) => void;
      mockFetch.mockImplementation(() => new Promise((resolve) => { resolveFetch = resolve; }));

      const el = document.createElement('agency-trust-score-panel') as TrustScorePanel;
      el.mode = 'full';
      el.actorId = 'agent-123';
      el.endpoint = 'http://test.local/api/v1/ledger';
      document.body.appendChild(el);
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(el.loading).toBe(true);
      const container = el.shadowRoot!.querySelector('.trust-score-panel');
      expect(container).toBeTruthy();

      resolveFetch!({ ok: true, json: async () => ({ actorId: 'agent-123', capabilityScores: {}, dimensionScores: {} }) });
    });

    it('fetches trust score on endpoint + actorId change', async () => {
      const mockResponse: TrustScoreResponse = {
        actorId: 'agent-123',
        globalScore: 0.85,
        capabilityScores: { 'claim-review': 0.82, 'fraud-detect': 0.91 },
        dimensionScores: { accuracy: 0.87, timeliness: 0.83 },
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const el = document.createElement('agency-trust-score-panel') as TrustScorePanel;
      el.mode = 'full';
      document.body.appendChild(el);

      el.endpoint = 'http://test.local/api/v1/ledger';
      el.actorId = 'agent-123';
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test.local/api/v1/ledger/trust/agent-123',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('renders score header with correct value', async () => {
      const mockResponse: TrustScoreResponse = {
        actorId: 'agent-123',
        globalScore: 0.85,
        capabilityScores: {},
        dimensionScores: {},
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const el = document.createElement('agency-trust-score-panel') as TrustScorePanel;
      el.mode = 'full';
      el.actorId = 'agent-123';
      el.endpoint = 'http://test.local/api/v1/ledger';
      document.body.appendChild(el);
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 20));
      await el.updateComplete;

      const header = el.shadowRoot!.querySelector('.score-header');
      expect(header).toBeTruthy();
      const scoreText = header!.textContent;
      expect(scoreText).toContain('0.85');
    });

    it('renders capability table with correct columns', async () => {
      const mockResponse: TrustScoreResponse = {
        actorId: 'agent-123',
        globalScore: 0.85,
        capabilityScores: { 'claim-review': 0.82, 'fraud-detect': 0.91 },
        dimensionScores: {},
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const el = document.createElement('agency-trust-score-panel') as TrustScorePanel;
      el.mode = 'full';
      el.actorId = 'agent-123';
      el.endpoint = 'http://test.local/api/v1/ledger';
      document.body.appendChild(el);
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 20));
      await el.updateComplete;

      const table = el.shadowRoot!.querySelector('pages-table');
      expect(table).toBeTruthy();
    });

    it('capability table uses pipeline dataSet with client-sort', async () => {
      const mockResponse: TrustScoreResponse = {
        actorId: 'agent-123',
        globalScore: 0.85,
        capabilityScores: { 'claim-review': 0.82, 'fraud-detect': 0.91 },
        dimensionScores: {},
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const el = document.createElement('agency-trust-score-panel') as TrustScorePanel;
      el.mode = 'full';
      el.actorId = 'agent-123';
      el.endpoint = 'http://test.local/api/v1/ledger';
      document.body.appendChild(el);
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 20));
      await el.updateComplete;

      const table = el.shadowRoot!.querySelector('pages-table') as any;
      expect(table).toBeTruthy();
      expect(table.dataSet).toBe((el as any).dataSet);
      expect(table.clientSort).toBe(true);
    });

    it('hides trend section when no trend data available', async () => {
      const mockResponse: TrustScoreResponse = {
        actorId: 'agent-123',
        globalScore: 0.85,
        capabilityScores: {},
        dimensionScores: {},
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const el = document.createElement('agency-trust-score-panel') as TrustScorePanel;
      el.mode = 'full';
      el.actorId = 'agent-123';
      el.endpoint = 'http://test.local/api/v1/ledger';
      document.body.appendChild(el);
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 20));
      await el.updateComplete;

      const trendSection = el.shadowRoot!.querySelector('.trend-section');
      expect(trendSection).toBeNull();
    });

    it('handles error state gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const el = document.createElement('agency-trust-score-panel') as TrustScorePanel;
      el.mode = 'full';
      el.actorId = 'agent-123';
      el.endpoint = 'http://test.local/api/v1/ledger';
      document.body.appendChild(el);
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 20));
      await el.updateComplete;

      expect(el.error).toContain('Network error');
      const errorMsg = el.shadowRoot!.querySelector('.error-message');
      expect(errorMsg).toBeTruthy();
    });
  });

  describe('Compact Mode - Pre-fetched Path', () => {
    it('renders badge without fetching when score + trustLevel provided', async () => {
      const el = document.createElement('agency-trust-score-panel') as TrustScorePanel;
      el.mode = 'compact';
      el.score = 0.85;
      el.trustLevel = 'high';
      document.body.appendChild(el);
      await el.updateComplete;

      expect(mockFetch).not.toHaveBeenCalled();
      const badge = el.shadowRoot!.querySelector('.trust-badge');
      expect(badge).toBeTruthy();
      expect(badge!.textContent).toContain('0.85');
    });

    it('applies correct CSS class for trust level', async () => {
      const el = document.createElement('agency-trust-score-panel') as TrustScorePanel;
      el.mode = 'compact';
      el.score = 0.85;
      el.trustLevel = 'high';
      document.body.appendChild(el);
      await el.updateComplete;

      const badge = el.shadowRoot!.querySelector('.trust-badge');
      expect(badge!.classList.contains('high')).toBe(true);
    });

    it('renders different colors for different trust levels', async () => {
      const levels = [
        { level: 'high' as const, score: 0.85 },
        { level: 'adequate' as const, score: 0.55 },
        { level: 'low' as const, score: 0.25 },
        { level: 'none' as const, score: undefined },
      ];

      for (const { level, score } of levels) {
        const el = document.createElement('agency-trust-score-panel') as TrustScorePanel;
        el.mode = 'compact';
        if (score !== undefined) el.score = score;
        el.trustLevel = level;
        document.body.appendChild(el);
        await el.updateComplete;

        const badge = el.shadowRoot!.querySelector('.trust-badge');
        expect(badge!.classList.contains(level)).toBe(true);

        document.body.removeChild(el);
      }
    });
  });

  describe('Compact Mode - Self-fetching Path', () => {
    it('fetches when only actorId + endpoint provided', async () => {
      const mockResponse: TrustScoreResponse = {
        actorId: 'agent-456',
        globalScore: 0.72,
        capabilityScores: {},
        dimensionScores: {},
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const el = document.createElement('agency-trust-score-panel') as TrustScorePanel;
      el.mode = 'compact';
      el.actorId = 'agent-456';
      el.endpoint = 'http://test.local/api/v1/ledger';
      document.body.appendChild(el);
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 20));
      await el.updateComplete;

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test.local/api/v1/ledger/trust/agent-456',
        expect.any(Object)
      );
      const badge = el.shadowRoot!.querySelector('.trust-badge');
      expect(badge!.textContent).toContain('0.72');
    });
  });

  describe('Events', () => {
    it('emits trust:capability-selected on capability row click', async () => {
      const mockResponse: TrustScoreResponse = {
        actorId: 'agent-123',
        globalScore: 0.85,
        capabilityScores: { 'claim-review': 0.82 },
        dimensionScores: {},
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const el = document.createElement('agency-trust-score-panel') as TrustScorePanel;
      el.mode = 'full';
      el.actorId = 'agent-123';
      el.endpoint = 'http://test.local/api/v1/ledger';
      document.body.appendChild(el);
      await el.updateComplete;
      await new Promise((resolve) => setTimeout(resolve, 20));
      await el.updateComplete;

      let eventFired = false;
      let eventDetail: any;
      el.addEventListener('pages-event', ((e: CustomEvent) => {
        if (e.detail.topic === 'trust:capability-selected') {
          eventFired = true;
          eventDetail = e.detail.payload;
        }
      }) as EventListener);

      const table = el.shadowRoot!.querySelector('pages-table') as any;
      if (table) {
        const dataset = fromRows([{ tag: 'claim-review', score: 0.82 }], [
          { id: columnId('tag'), type: ColumnType.TEXT, getValue: (c: { tag: string; score: number }) => c.tag },
          { id: columnId('score'), type: ColumnType.NUMBER, getValue: (c: { tag: string; score: number }) => c.score },
        ]);
        table.dispatchEvent(
          new CustomEvent('row-activate', {
            detail: { row: dataset.rows[0], key: 'claim-review' },
          })
        );
      }

      await el.updateComplete;
      expect(eventFired).toBe(true);
      expect(eventDetail?.tag).toBe('claim-review');
    });
  });

  describe('Trend Section', () => {
    it('hides trend section when no trend data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          actorId: 'agent-123',
          globalScore: 0.87,
          capabilityScores: {},
          dimensionScores: {},
        }),
      });
      const el = document.createElement('agency-trust-score-panel') as TrustScorePanel;
      el.mode = 'full';
      el.actorId = 'agent-123';
      el.endpoint = 'http://test.local/api/v1/ledger';
      document.body.appendChild(el);
      await el.updateComplete;
      await new Promise(r => setTimeout(r, 50));
      await el.updateComplete;
      const trendSection = el.shadowRoot!.querySelector('.trend-section');
      expect(trendSection).toBeNull();
    });

    it('renders sparkline when trendData is provided', async () => {
      const el = document.createElement('agency-trust-score-panel') as TrustScorePanel;
      el.mode = 'full';
      el.score = 0.87;
      el.trustLevel = 'high';
      (el as any).trendData = [
        { timestamp: 1000, score: 0.8 },
        { timestamp: 2000, score: 0.85 },
        { timestamp: 3000, score: 0.87 },
      ];
      document.body.appendChild(el);
      await el.updateComplete;
      const sparkline = el.shadowRoot!.querySelector('.sparkline');
      expect(sparkline).toBeTruthy();
      expect(sparkline!.tagName.toLowerCase()).toBe('svg');
    });

    it('uses trust-level color for sparkline', async () => {
      const el = document.createElement('agency-trust-score-panel') as TrustScorePanel;
      el.mode = 'full';
      el.score = 0.87;
      el.trustLevel = 'high';
      (el as any).trendData = [
        { timestamp: 1000, score: 0.8 },
        { timestamp: 2000, score: 0.87 },
      ];
      document.body.appendChild(el);
      await el.updateComplete;
      const polyline = el.shadowRoot!.querySelector('polyline');
      expect(polyline).toBeTruthy();
      const stroke = polyline!.getAttribute('stroke');
      expect(stroke).toContain('--color-success');
    });

    it('renders ARIA label on sparkline', async () => {
      const el = document.createElement('agency-trust-score-panel') as TrustScorePanel;
      el.mode = 'full';
      el.score = 0.87;
      el.trustLevel = 'high';
      (el as any).trendData = [
        { timestamp: 1000, score: 0.8 },
        { timestamp: 2000, score: 0.87 },
      ];
      document.body.appendChild(el);
      await el.updateComplete;
      const wrapper = el.shadowRoot!.querySelector('.trend-section [role="img"]');
      expect(wrapper).toBeTruthy();
      const label = wrapper!.getAttribute('aria-label');
      expect(label).toContain('Trust score trend');
    });

    it('does not show trend section in compact mode', async () => {
      const el = document.createElement('agency-trust-score-panel') as TrustScorePanel;
      el.mode = 'compact';
      el.score = 0.87;
      el.trustLevel = 'high';
      (el as any).trendData = [
        { timestamp: 1000, score: 0.8 },
        { timestamp: 2000, score: 0.87 },
      ];
      document.body.appendChild(el);
      await el.updateComplete;
      const trendSection = el.shadowRoot!.querySelector('.trend-section');
      expect(trendSection).toBeFalsy();
    });

    it('hides trend section with single point (graceful degradation)', async () => {
      const el = document.createElement('agency-trust-score-panel') as TrustScorePanel;
      el.mode = 'full';
      el.score = 0.87;
      el.trustLevel = 'high';
      (el as any).trendData = [{ timestamp: 1000, score: 0.87 }];
      document.body.appendChild(el);
      await el.updateComplete;
      const trendSection = el.shadowRoot!.querySelector('.trend-section');
      expect(trendSection).toBeNull();
    });
  });
});
