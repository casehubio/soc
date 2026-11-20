import { describe, it, expect, afterEach } from 'vitest';
import { LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { TrendSourceMixin } from './trend-source-mixin.js';
import type { TrendPoint } from './trend-types.js';

@customElement('test-trend-host')
class TestTrendHost extends TrendSourceMixin(LitElement) {}


describe('TrendSourceMixin', () => {
  afterEach(() => {
    document.querySelectorAll('test-trend-host').forEach(e => e.remove());
  });

  function createElement(): TestTrendHost {
    const el = document.createElement('test-trend-host') as TestTrendHost;
    document.body.appendChild(el);
    return el;
  }

  describe('trendData (direct import)', () => {
    it('trendPoints returns trendData capped to maxTrendPoints', async () => {
      const el = createElement();
      await el.updateComplete;
      const data: TrendPoint[] = Array.from({ length: 50 }, (_, i) => ({
        timestamp: i * 1000,
        score: 0.5 + i * 0.01,
      }));
      el.trendData = data;
      await el.updateComplete;
      expect(el.trendPoints).toHaveLength(30);
      expect(el.trendPoints[0]!.timestamp).toBe(20000);
      expect(el.trendPoints[29]!.timestamp).toBe(49000);
    });

    it('trendPoints sorts by timestamp ascending', async () => {
      const el = createElement();
      await el.updateComplete;
      el.trendData = [
        { timestamp: 3000, score: 0.9 },
        { timestamp: 1000, score: 0.7 },
        { timestamp: 2000, score: 0.8 },
      ];
      await el.updateComplete;
      expect(el.trendPoints.map(p => p.timestamp)).toEqual([1000, 2000, 3000]);
    });

    it('trendLoading is false when using trendData', async () => {
      const el = createElement();
      await el.updateComplete;
      el.trendData = [{ timestamp: 1000, score: 0.8 }];
      await el.updateComplete;
      expect(el.trendLoading).toBe(false);
    });

    it('trendError is empty when using trendData', async () => {
      const el = createElement();
      await el.updateComplete;
      el.trendData = [{ timestamp: 1000, score: 0.8 }];
      await el.updateComplete;
      expect(el.trendError).toBe('');
    });
  });

  describe('maxTrendPoints runtime change', () => {
    it('trendPoints reflects new maxTrendPoints without data change', async () => {
      const el = createElement();
      await el.updateComplete;
      el.trendData = Array.from({ length: 10 }, (_, i) => ({
        timestamp: i * 1000,
        score: 0.5,
      }));
      el.maxTrendPoints = 5;
      await el.updateComplete;
      expect(el.trendPoints).toHaveLength(5);
      el.maxTrendPoints = 3;
      await el.updateComplete;
      expect(el.trendPoints).toHaveLength(3);
    });
  });
});
