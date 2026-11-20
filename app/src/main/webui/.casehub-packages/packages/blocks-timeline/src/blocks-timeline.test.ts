import { describe, it, expect, afterEach, vi } from 'vitest';
import { html, render } from 'lit';
import './blocks-timeline.js';
import type { BlocksTimeline } from './blocks-timeline.js';
import { eventChronologyStrategy } from './strategies/event-chronology.js';
import { stateProgressionStrategy, linearResolveStatus } from './strategies/state-progression.js';
import type { CaseEvent, PagedResponse, EventLogEntryResponse } from './strategies/event-chronology.js';
import type { BlocksTimelineStrategy } from './types.js';
import type { EventTimelineNode } from '@casehubio/pages-viz';

async function fixture<T extends HTMLElement & { updateComplete: Promise<boolean> }>(
  template: ReturnType<typeof html>,
): Promise<T> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(template, container);
  const element = container.firstElementChild as T;
  await element.updateComplete;
  return element;
}

describe('BlocksTimeline', () => {
  let element: BlocksTimeline;

  afterEach(() => {
    document.body.innerHTML = '';
  });

  const mockEvents: CaseEvent[] = [
    { eventType: 'CASE_STARTED', streamType: 'CASE', timestamp: '2026-01-01T10:00:00Z', payload: { type: 'FRAUD' } },
    { eventType: 'TASK_CREATED', streamType: 'WORKER', timestamp: '2026-01-01T10:05:00Z', payload: { taskId: 't-1' } },
    { eventType: 'MILESTONE_REACHED', streamType: 'CASE', timestamp: '2026-01-01T11:00:00Z', payload: {} },
    { eventType: 'AGENT_DISPATCHED', streamType: 'WORKER', timestamp: '2026-01-01T11:30:00Z', payload: {}, metadata: { workerName: 'Alice', trustScore: 0.85 } },
    { eventType: 'CASE_COMPLETED', streamType: 'CASE', timestamp: '2026-01-01T12:00:00Z', payload: {} },
  ];

  describe('element registration', () => {
    it('defines the custom element', () => {
      const el = document.createElement('blocks-timeline');
      expect(el).toBeInstanceOf(HTMLElement);
    });
  });

  // === eventChronology × vertical ===
  describe('eventChronologyStrategy + vertical layout', () => {
    beforeEach(async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} .data=${mockEvents} layout="vertical"></blocks-timeline>
      `);
      await element.updateComplete;
    });

    it('renders vertical timeline with list role', () => {
      const list = element.shadowRoot!.querySelector('[role="list"]');
      expect(list).toBeTruthy();
      expect(list?.getAttribute('aria-orientation')).toBeNull();
    });

    it('renders all events as nodes', () => {
      expect(element.shadowRoot!.querySelectorAll('[role="listitem"]').length).toBe(5);
    });

    it('renders nodes with status-based classes', () => {
      expect(element.shadowRoot!.querySelector('.timeline-node.status-completed')).toBeTruthy();
    });

    it('renders filter bar with stream type chips', () => {
      const chips = element.shadowRoot!.querySelectorAll('.filter-chip');
      expect(chips.length).toBe(5);
    });

    it('filters nodes when chip toggled', async () => {
      const before = element.shadowRoot!.querySelectorAll('[role="listitem"]').length;
      const workerChip = Array.from(element.shadowRoot!.querySelectorAll('.filter-chip'))
        .find(c => c.textContent?.includes('WORKER')) as HTMLElement;
      workerChip.click();
      await element.updateComplete;
      const after = element.shadowRoot!.querySelectorAll('[role="listitem"]').length;
      expect(after).toBeLessThan(before);
    });

    it('emits event-timeline:node-selected on node click', async () => {
      const handler = vi.fn();
      element.addEventListener('pages-event', handler);
      const nodeBody = element.shadowRoot!.querySelector('.node-body') as HTMLElement;
      nodeBody.click();
      await element.updateComplete;
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        detail: expect.objectContaining({ topic: 'event-timeline:node-selected' }),
      }));
    });

    it('event-timeline:node-selected payload contains node and index', async () => {
      const handler = vi.fn();
      element.addEventListener('pages-event', handler);
      const nodeBodies = element.shadowRoot!.querySelectorAll('.node-body');
      (nodeBodies[1] as HTMLElement).click();
      await element.updateComplete;
      const payload = handler.mock.calls[0]![0].detail.payload;
      expect(payload.node.key).toBe('event-1');
      expect(payload.index).toBe(1);
    });

    it('ArrowDown moves focus to next node', async () => {
      const nodes = element.shadowRoot!.querySelectorAll('.timeline-node');
      (nodes[0] as HTMLElement).focus();
      (nodes[0] as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await element.updateComplete;
      await new Promise(r => setTimeout(r, 10));
      expect(element.shadowRoot!.activeElement).toBe(nodes[1]);
    });

    it('ArrowUp moves focus to previous node', async () => {
      const nodes = element.shadowRoot!.querySelectorAll('.timeline-node');
      (nodes[1] as HTMLElement).focus();
      (nodes[1] as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      await element.updateComplete;
      await new Promise(r => setTimeout(r, 10));
      expect(element.shadowRoot!.activeElement).toBe(nodes[0]);
    });

    it('expands detail on expand button click', async () => {
      const expandBtn = element.shadowRoot!.querySelector('.expand-button') as HTMLElement;
      expect(expandBtn.getAttribute('aria-expanded')).toBe('false');
      expandBtn.click();
      await element.updateComplete;
      expect(expandBtn.getAttribute('aria-expanded')).toBe('true');
      expect(element.shadowRoot!.querySelector('.payload-detail')).toBeTruthy();
    });
  });

  // === eventChronology × horizontal ===
  describe('eventChronologyStrategy + horizontal layout', () => {
    beforeEach(async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} .data=${mockEvents} layout="horizontal"></blocks-timeline>
      `);
      await element.updateComplete;
    });

    it('renders horizontal layout with aria-orientation', () => {
      const list = element.shadowRoot!.querySelector('[role="list"]');
      expect(list?.getAttribute('aria-orientation')).toBe('horizontal');
    });

    it('renders connectors between nodes', () => {
      expect(element.shadowRoot!.querySelectorAll('.connector').length).toBe(4);
    });

    it('ArrowRight moves focus', async () => {
      const items = element.shadowRoot!.querySelectorAll('[role="listitem"]');
      (items[0] as HTMLElement).focus();
      (items[0] as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await element.updateComplete;
      await new Promise(r => setTimeout(r, 10));
      expect(element.shadowRoot!.activeElement).toBe(items[1]);
    });

    it('ArrowLeft moves focus back', async () => {
      const items = element.shadowRoot!.querySelectorAll('[role="listitem"]');
      (items[1] as HTMLElement).focus();
      (items[1] as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await element.updateComplete;
      await new Promise(r => setTimeout(r, 10));
      expect(element.shadowRoot!.activeElement).toBe(items[0]);
    });

    it('renders filter bar (event strategy has categories)', () => {
      expect(element.shadowRoot!.querySelectorAll('.filter-chip').length).toBe(5);
    });
  });

  // === eventChronology × compact ===
  describe('eventChronologyStrategy + compact layout', () => {
    beforeEach(async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} .data=${mockEvents} layout="compact"></blocks-timeline>
      `);
      await element.updateComplete;
    });

    it('renders compact strip with role="img"', () => {
      expect(element.shadowRoot!.querySelector('[role="img"]')).toBeTruthy();
    });

    it('emits event-timeline:expand-requested on click', async () => {
      const handler = vi.fn();
      element.addEventListener('pages-event', handler);
      const strip = element.shadowRoot!.querySelector('.compact-strip') as HTMLElement;
      strip.click();
      await element.updateComplete;
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        detail: expect.objectContaining({ topic: 'event-timeline:expand-requested' }),
      }));
    });

    it('no filter bar in compact mode', () => {
      expect(element.shadowRoot!.querySelector('.filter-bar')).toBeNull();
    });
  });

  // === stateProgression × horizontal (default) ===
  describe('stateProgressionStrategy + horizontal layout (default)', () => {
    beforeEach(async () => {
      element = await fixture(html`
        <blocks-timeline
          .strategy=${stateProgressionStrategy()}
          .data=${{ currentState: 'ACKNOWLEDGED', transitions: [
            { state: 'OPEN', actor: 'system', timestamp: '2026-01-01T00:00:00Z' },
            { state: 'ACKNOWLEDGED', actor: 'agent-1', timestamp: '2026-01-01T01:00:00Z' },
          ]}}
        ></blocks-timeline>
      `);
      await element.updateComplete;
    });

    it('uses horizontal layout by default', () => {
      expect(element.shadowRoot!.querySelector('[aria-orientation="horizontal"]')).toBeTruthy();
    });

    it('renders all 7 qhorus stages', () => {
      expect(element.shadowRoot!.querySelectorAll('[role="listitem"]').length).toBe(7);
    });

    it('marks OPEN as completed (visited in transitions)', () => {
      expect(element.shadowRoot!.querySelector('.stage-node--completed')).toBeTruthy();
    });

    it('marks ACKNOWLEDGED as active', () => {
      expect(element.shadowRoot!.querySelector('.stage-node--active')).toBeTruthy();
    });

    it('no filter bar (stateProgression has no filterCategories)', () => {
      expect(element.shadowRoot!.querySelector('.filter-bar')).toBeNull();
    });

    it('renders connectors', () => {
      expect(element.shadowRoot!.querySelectorAll('.connector').length).toBe(6);
    });
  });

  // === stateProgression × vertical ===
  describe('stateProgressionStrategy + vertical layout', () => {
    beforeEach(async () => {
      element = await fixture(html`
        <blocks-timeline
          .strategy=${stateProgressionStrategy()}
          .data=${{ currentState: 'FULFILLED', transitions: [
            { state: 'OPEN', timestamp: '2026-01-01T00:00:00Z' },
            { state: 'ACKNOWLEDGED', timestamp: '2026-01-01T01:00:00Z' },
            { state: 'FULFILLED', timestamp: '2026-01-01T02:00:00Z' },
          ]}}
          layout="vertical"
        ></blocks-timeline>
      `);
      await element.updateComplete;
    });

    it('renders vertical list', () => {
      const list = element.shadowRoot!.querySelector('[role="list"]');
      expect(list).toBeTruthy();
      expect(list?.getAttribute('aria-orientation')).toBeNull();
    });

    it('renders all 7 stages as vertical nodes', () => {
      expect(element.shadowRoot!.querySelectorAll('[role="listitem"]').length).toBe(7);
    });
  });

  // === stateProgression × compact ===
  describe('stateProgressionStrategy + compact layout', () => {
    beforeEach(async () => {
      element = await fixture(html`
        <blocks-timeline
          .strategy=${stateProgressionStrategy()}
          .data=${{ currentState: 'OPEN' }}
          layout="compact"
        ></blocks-timeline>
      `);
      await element.updateComplete;
    });

    it('renders compact strip', () => {
      expect(element.shadowRoot!.querySelector('[role="img"]')).toBeTruthy();
    });

    it('renders dots for stages', () => {
      expect(element.shadowRoot!.querySelectorAll('.event-dot').length).toBe(7);
    });
  });

  // === DATA FLOW ===
  describe('data flow', () => {
    it('data prop takes precedence over dataSet', async () => {
      const inlineData: CaseEvent[] = [
        { eventType: 'CASE_STARTED', streamType: 'CASE', timestamp: '2026-01-01T10:00:00Z', payload: {} },
      ];
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} .data=${inlineData} layout="vertical"></blocks-timeline>
      `);
      await element.updateComplete;
      expect(element.shadowRoot!.querySelectorAll('[role="listitem"]').length).toBe(1);
    });

    it('recomputes nodes when data changes', async () => {
      const data1: CaseEvent[] = [
        { eventType: 'CASE_STARTED', streamType: 'CASE', timestamp: '2026-01-01T10:00:00Z', payload: {} },
      ];
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} .data=${data1} layout="vertical"></blocks-timeline>
      `);
      await element.updateComplete;
      expect(element.shadowRoot!.querySelectorAll('[role="listitem"]').length).toBe(1);

      element.data = [...data1, { eventType: 'CASE_COMPLETED', streamType: 'CASE', timestamp: '2026-01-01T11:00:00Z', payload: {} }];
      await element.updateComplete;
      expect(element.shadowRoot!.querySelectorAll('[role="listitem"]').length).toBe(2);
    });

    it('recomputes nodes when strategy changes', async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} .data=${mockEvents} layout="vertical"></blocks-timeline>
      `);
      await element.updateComplete;
      expect(element.shadowRoot!.querySelectorAll('[role="listitem"]').length).toBe(5);

      element.strategy = stateProgressionStrategy();
      element.data = { currentState: 'OPEN' };
      await element.updateComplete;
      expect(element.shadowRoot!.querySelectorAll('[role="listitem"]').length).toBe(7);
    });

    it('renders empty when no data', async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} layout="vertical"></blocks-timeline>
      `);
      await element.updateComplete;
      expect(element.shadowRoot!.querySelectorAll('[role="listitem"]').length).toBe(0);
    });

    it('transformData extracts PagedResponse content', async () => {
      const paged: PagedResponse<EventLogEntryResponse> = {
        content: mockEvents as EventLogEntryResponse[],
        page: 0, size: 20, totalElements: mockEvents.length, totalPages: 1,
      };
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} .data=${paged} layout="vertical"></blocks-timeline>
      `);
      await element.updateComplete;
      expect(element.shadowRoot!.querySelectorAll('[role="listitem"]').length).toBe(5);
    });
  });

  // === RENDER CALLBACKS ===
  describe('render callback resolution', () => {
    it('component renderNode overrides strategy renderNode', async () => {
      const strategyRender = vi.fn(() => html`<span class="strat">s</span>`);
      const componentRender = vi.fn(() => html`<span class="comp">c</span>`);
      const strategy: BlocksTimelineStrategy<CaseEvent[]> = {
        ...eventChronologyStrategy(),
        renderNode: strategyRender,
      };
      element = await fixture(html`
        <blocks-timeline .strategy=${strategy} .data=${mockEvents} .renderNode=${componentRender} layout="vertical"></blocks-timeline>
      `);
      await element.updateComplete;
      expect(componentRender).toHaveBeenCalled();
      expect(strategyRender).not.toHaveBeenCalled();
      expect(element.shadowRoot!.querySelector('.comp')).toBeTruthy();
    });

    it('strategy renderNode used when component has none', async () => {
      const strategyRender = vi.fn(() => html`<span class="strat">s</span>`);
      const strategy: BlocksTimelineStrategy<CaseEvent[]> = {
        ...eventChronologyStrategy(),
        renderNode: strategyRender,
      };
      element = await fixture(html`
        <blocks-timeline .strategy=${strategy} .data=${mockEvents} layout="vertical"></blocks-timeline>
      `);
      await element.updateComplete;
      expect(strategyRender).toHaveBeenCalled();
      expect(element.shadowRoot!.querySelector('.strat')).toBeTruthy();
    });

    it('built-in default when neither provides renderNode', async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} .data=${mockEvents} layout="vertical"></blocks-timeline>
      `);
      await element.updateComplete;
      expect(element.shadowRoot!.querySelector('.node-dot')).toBeTruthy();
    });

    it('component renderDetail overrides strategy renderDetail', async () => {
      const strategyDetail = vi.fn(() => html`<span class="strat-d">sd</span>`);
      const componentDetail = vi.fn(() => html`<span class="comp-d">cd</span>`);
      const strategy: BlocksTimelineStrategy<CaseEvent[]> = {
        ...eventChronologyStrategy(),
        renderDetail: strategyDetail,
      };
      element = await fixture(html`
        <blocks-timeline .strategy=${strategy} .data=${[mockEvents[0]!]} .renderDetail=${componentDetail} layout="vertical"></blocks-timeline>
      `);
      await element.updateComplete;
      const expandBtn = element.shadowRoot!.querySelector('.expand-button') as HTMLElement;
      expandBtn.click();
      await element.updateComplete;
      expect(componentDetail).toHaveBeenCalled();
      expect(strategyDetail).not.toHaveBeenCalled();
      expect(element.shadowRoot!.querySelector('.comp-d')).toBeTruthy();
    });
  });

  // === FILTER BEHAVIOR ===
  describe('filter behavior', () => {
    it('shows all categories initially when activeFilters not set', async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} .data=${mockEvents} layout="vertical"></blocks-timeline>
      `);
      await element.updateComplete;
      const chips = element.shadowRoot!.querySelectorAll('.filter-chip');
      chips.forEach(c => expect(c.getAttribute('aria-checked')).toBe('true'));
    });

    it('accepts string[] as activeFilters', async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} .data=${mockEvents} .activeFilters=${['CASE']} layout="vertical"></blocks-timeline>
      `);
      await element.updateComplete;
      const nodes = element.shadowRoot!.querySelectorAll('[role="listitem"]');
      expect(nodes.length).toBe(3);
    });

    it('accepts Set<string> as activeFilters', async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} .data=${mockEvents} .activeFilters=${new Set(['WORKER'])} layout="vertical"></blocks-timeline>
      `);
      await element.updateComplete;
      const nodes = element.shadowRoot!.querySelectorAll('[role="listitem"]');
      expect(nodes.length).toBe(2);
    });

    it('nodes with undefined category always visible', async () => {
      const nodes: EventTimelineNode[] = [
        { key: 'n-0', label: 'No category', status: 'completed' },
      ];
      const strategy: BlocksTimelineStrategy<EventTimelineNode[]> = {
        toNodes: (d) => [...d],
        defaultLayout: 'vertical',
        filterCategories: ['CASE'],
      };
      element = await fixture(html`
        <blocks-timeline .strategy=${strategy} .data=${nodes} .activeFilters=${[]} layout="vertical"></blocks-timeline>
      `);
      await element.updateComplete;
      expect(element.shadowRoot!.querySelectorAll('[role="listitem"]').length).toBe(1);
    });

    it('no filter UI when strategy has no filterCategories', async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${stateProgressionStrategy()} .data=${{ currentState: 'OPEN' }}></blocks-timeline>
      `);
      await element.updateComplete;
      expect(element.shadowRoot!.querySelector('.filter-bar')).toBeNull();
    });
  });

  // === PAGINATION ===
  describe('pagination (endpoint mode)', () => {
    let origFetch: typeof globalThis.fetch;
    let mockFetch: ReturnType<typeof vi.fn>;

    function pagedResponse(page: number, totalPages: number, perPage = 2): PagedResponse<CaseEvent> {
      const events: CaseEvent[] = Array.from({ length: perPage }, (_, i) => ({
        eventType: i % 2 === 0 ? 'CASE_STARTED' : 'TASK_CREATED',
        streamType: i % 2 === 0 ? 'CASE' : 'WORKER',
        timestamp: `2026-01-01T${10 + page}:${String(i * 5).padStart(2, '0')}:00Z`,
        payload: { page, index: i },
      } as CaseEvent));
      return { content: events, page, size: perPage, totalElements: totalPages * perPage, totalPages };
    }

    beforeEach(() => {
      origFetch = globalThis.fetch;
      mockFetch = vi.fn();
      globalThis.fetch = mockFetch as any;
    });

    afterEach(() => {
      globalThis.fetch = origFetch;
    });

    it('fetches first page with page and size params', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(pagedResponse(0, 3))));
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} endpoint="/api/events" .pageSize=${2} layout="vertical"></blocks-timeline>
      `);
      await new Promise(r => setTimeout(r, 50));
      await element.updateComplete;
      const url = mockFetch.mock.calls[0]![0] as string;
      expect(url).toContain('page=0');
      expect(url).toContain('size=2');
    });

    it('renders nodes from first page', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(pagedResponse(0, 3))));
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} endpoint="/api/events" .pageSize=${2} layout="vertical"></blocks-timeline>
      `);
      await new Promise(r => setTimeout(r, 50));
      await element.updateComplete;
      expect(element.shadowRoot!.querySelectorAll('[role="listitem"]').length).toBe(2);
    });

    it('shows Load more button when more pages exist', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(pagedResponse(0, 3))));
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} endpoint="/api/events" .pageSize=${2} layout="vertical"></blocks-timeline>
      `);
      await new Promise(r => setTimeout(r, 50));
      await element.updateComplete;
      expect(element.shadowRoot!.querySelector('.load-more-button')).toBeTruthy();
    });

    it('hides Load more button on last page', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(pagedResponse(0, 1))));
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} endpoint="/api/events" .pageSize=${2} layout="vertical"></blocks-timeline>
      `);
      await new Promise(r => setTimeout(r, 50));
      await element.updateComplete;
      expect(element.shadowRoot!.querySelector('.load-more-button')).toBeNull();
    });

    it('shows progress text with loaded and total counts', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(pagedResponse(0, 3))));
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} endpoint="/api/events" .pageSize=${2} layout="vertical"></blocks-timeline>
      `);
      await new Promise(r => setTimeout(r, 50));
      await element.updateComplete;
      expect(element.shadowRoot!.textContent).toContain('2 of 6');
    });

    it('appends nodes on Load more click', async () => {
      mockFetch
        .mockResolvedValueOnce(new Response(JSON.stringify(pagedResponse(0, 2))))
        .mockResolvedValueOnce(new Response(JSON.stringify(pagedResponse(1, 2))));
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} endpoint="/api/events" .pageSize=${2} layout="vertical"></blocks-timeline>
      `);
      await new Promise(r => setTimeout(r, 50));
      await element.updateComplete;
      expect(element.shadowRoot!.querySelectorAll('[role="listitem"]').length).toBe(2);

      (element.shadowRoot!.querySelector('.load-more-button') as HTMLElement).click();
      await new Promise(r => setTimeout(r, 50));
      await element.updateComplete;
      expect(element.shadowRoot!.querySelectorAll('[role="listitem"]').length).toBe(4);
    });

    it('hides Load more after loading last page', async () => {
      mockFetch
        .mockResolvedValueOnce(new Response(JSON.stringify(pagedResponse(0, 2))))
        .mockResolvedValueOnce(new Response(JSON.stringify(pagedResponse(1, 2))));
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} endpoint="/api/events" .pageSize=${2} layout="vertical"></blocks-timeline>
      `);
      await new Promise(r => setTimeout(r, 50));
      await element.updateComplete;

      (element.shadowRoot!.querySelector('.load-more-button') as HTMLElement).click();
      await new Promise(r => setTimeout(r, 50));
      await element.updateComplete;
      expect(element.shadowRoot!.querySelector('.load-more-button')).toBeNull();
    });

    it('no Load more for non-paginating strategies', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ currentState: 'OPEN' })));
      element = await fixture(html`
        <blocks-timeline .strategy=${stateProgressionStrategy()} endpoint="/api/case" layout="horizontal"></blocks-timeline>
      `);
      await new Promise(r => setTimeout(r, 100));
      await element.updateComplete;
      expect(element.shadowRoot!.querySelector('.load-more-button')).toBeNull();
    });

    it('no Load more in horizontal layout', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(pagedResponse(0, 3))));
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} endpoint="/api/events" .pageSize=${2} layout="horizontal"></blocks-timeline>
      `);
      await new Promise(r => setTimeout(r, 50));
      await element.updateComplete;
      expect(element.shadowRoot!.querySelector('.load-more-button')).toBeNull();
    });

    it('no Load more in compact layout', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(pagedResponse(0, 3))));
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} endpoint="/api/events" .pageSize=${2} layout="compact"></blocks-timeline>
      `);
      await new Promise(r => setTimeout(r, 50));
      await element.updateComplete;
      expect(element.shadowRoot!.querySelector('.load-more-button')).toBeNull();
    });

    it('passes headers to paginated fetch', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(pagedResponse(0, 1))));
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} .headers=${{ 'X-Tenancy-ID': 't-1' }} endpoint="/api/events" .pageSize=${2} layout="vertical"></blocks-timeline>
      `);
      await new Promise(r => setTimeout(r, 50));
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ headers: expect.objectContaining({ 'X-Tenancy-ID': 't-1' }) }),
      );
    });

    it('pageSize defaults to 20', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(pagedResponse(0, 1))));
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} endpoint="/api/events" layout="vertical"></blocks-timeline>
      `);
      await new Promise(r => setTimeout(r, 50));
      const url = mockFetch.mock.calls[0]![0] as string;
      expect(url).toContain('size=20');
    });

    it('data property bypasses paginated fetch', async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} .data=${mockEvents} endpoint="/api/events" layout="vertical"></blocks-timeline>
      `);
      await element.updateComplete;
      expect(element.shadowRoot!.querySelectorAll('[role="listitem"]').length).toBe(5);
      expect(element.shadowRoot!.querySelector('.load-more-button')).toBeNull();
    });

    it('shows loading state during Load more', async () => {
      let resolveSecond: (value: Response) => void;
      mockFetch
        .mockResolvedValueOnce(new Response(JSON.stringify(pagedResponse(0, 2))))
        .mockReturnValueOnce(new Promise(r => { resolveSecond = r as any; }));
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} endpoint="/api/events" .pageSize=${2} layout="vertical"></blocks-timeline>
      `);
      await new Promise(r => setTimeout(r, 50));
      await element.updateComplete;

      (element.shadowRoot!.querySelector('.load-more-button') as HTMLElement).click();
      await element.updateComplete;
      expect(element.shadowRoot!.querySelector('.load-more-button')!.hasAttribute('disabled')).toBe(true);

      resolveSecond!(new Response(JSON.stringify(pagedResponse(1, 2))));
      await new Promise(r => setTimeout(r, 50));
      await element.updateComplete;
      expect(element.shadowRoot!.querySelectorAll('[role="listitem"]').length).toBe(4);
    });
  });

  // === LOADING / ERROR STATES ===
  describe('loading and error states', () => {
    it('shows error when self-fetch endpoint fails', async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} endpoint="/api/events" layout="vertical"></blocks-timeline>
      `);
      await element.updateComplete;
      await new Promise(r => setTimeout(r, 10));
      await element.updateComplete;
      expect(element.shadowRoot!.textContent).toContain('Failed to load');
    });

    it('shows error message when no inline data', async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} layout="vertical"></blocks-timeline>
      `);
      element.error = 'Network error';
      await element.updateComplete;
      expect(element.shadowRoot!.textContent).toContain('Network error');
    });

    it('inline data renders despite loading state', async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} .data=${mockEvents} layout="vertical"></blocks-timeline>
      `);
      element.loading = true;
      await element.updateComplete;
      expect(element.shadowRoot!.querySelectorAll('[role="listitem"]').length).toBe(5);
    });

    it('inline data renders despite error state', async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} .data=${mockEvents} layout="vertical"></blocks-timeline>
      `);
      element.error = 'stale';
      await element.updateComplete;
      expect(element.shadowRoot!.querySelectorAll('[role="listitem"]').length).toBe(5);
    });
  });

  // === HEADERS ===
  describe('headers', () => {
    it('passes headers object to fetch', async () => {
      const mockFetch = vi.fn(() => Promise.resolve(new Response('[]', { status: 200 })));
      const origFetch = globalThis.fetch;
      globalThis.fetch = mockFetch as any;

      element = await fixture(html`
        <blocks-timeline
          .strategy=${eventChronologyStrategy()}
          .headers=${{ 'X-Tenancy-ID': 'tenant-1' }}
          endpoint="/api/events"
          layout="vertical"
        ></blocks-timeline>
      `);
      await element.updateComplete;
      await new Promise(r => setTimeout(r, 50));

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Tenancy-ID': 'tenant-1' }),
        }),
      );
      globalThis.fetch = origFetch;
    });
  });

  // === CONFIGURE ===
  describe('configure()', () => {
    it('maps identity to headers', async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} layout="vertical"></blocks-timeline>
      `);
      element.configure({
        identity: { userId: 'u', tenancyId: 'tenant-1', displayName: 'U', groups: [], roles: [] },
      });
      await element.updateComplete;
      expect(element.headers).toEqual({ 'X-Tenancy-ID': 'tenant-1' });
    });

    it('clears headers when identity has no tenancyId', async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} layout="vertical"></blocks-timeline>
      `);
      element.configure({
        identity: { userId: 'u', displayName: 'U', groups: [], roles: [] },
      });
      await element.updateComplete;
      expect(element.headers).toBeUndefined();
    });
  });

  // === LAYOUT SWITCHING ===
  describe('layout switching', () => {
    it('uses strategy.defaultLayout when layout not set', async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} .data=${mockEvents}></blocks-timeline>
      `);
      await element.updateComplete;
      expect(element.shadowRoot!.querySelector('[role="list"]')).toBeTruthy();
      expect(element.shadowRoot!.querySelector('[aria-orientation]')).toBeNull();
    });

    it('layout prop overrides strategy default', async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} .data=${mockEvents} layout="horizontal"></blocks-timeline>
      `);
      await element.updateComplete;
      expect(element.shadowRoot!.querySelector('[aria-orientation="horizontal"]')).toBeTruthy();
    });

    it('switches layout dynamically', async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${eventChronologyStrategy()} .data=${mockEvents} layout="vertical"></blocks-timeline>
      `);
      await element.updateComplete;
      expect(element.shadowRoot!.querySelector('.timeline')).toBeTruthy();

      element.layout = 'compact';
      await element.updateComplete;
      expect(element.shadowRoot!.querySelector('.compact-strip')).toBeTruthy();
    });

    it('switches from compact to horizontal', async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${stateProgressionStrategy()} .data=${{ currentState: 'OPEN' }} layout="compact"></blocks-timeline>
      `);
      await element.updateComplete;
      expect(element.shadowRoot!.querySelector('.compact-strip')).toBeTruthy();

      element.layout = 'horizontal';
      await element.updateComplete;
      expect(element.shadowRoot!.querySelector('.pipeline')).toBeTruthy();
    });
  });

  // === LINEAR RESOLVE STATUS end-to-end ===
  describe('stateProgression with linearResolveStatus', () => {
    it('shows positional completion', async () => {
      element = await fixture(html`
        <blocks-timeline
          .strategy=${stateProgressionStrategy({ resolveStatus: linearResolveStatus })}
          .data=${{ currentState: 'ACKNOWLEDGED' }}
        ></blocks-timeline>
      `);
      await element.updateComplete;
      expect(element.shadowRoot!.querySelector('.stage-node--completed')).toBeTruthy();
      expect(element.shadowRoot!.querySelector('.stage-node--active')).toBeTruthy();
      expect(element.shadowRoot!.querySelector('.stage-node--pending')).toBeTruthy();
    });
  });

  // === TERMINAL STATES ===
  describe('terminal state rendering', () => {
    it('FULFILLED shows as completed', async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${stateProgressionStrategy()} .data=${{ currentState: 'FULFILLED' }}></blocks-timeline>
      `);
      await element.updateComplete;
      const nodes = element.shadowRoot!.querySelectorAll('.stage-node');
      const fulfilled = Array.from(nodes).find(n => n.classList.contains('stage-node--completed'));
      expect(fulfilled).toBeTruthy();
    });

    it('DECLINED shows as failed', async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${stateProgressionStrategy()} .data=${{ currentState: 'DECLINED' }}></blocks-timeline>
      `);
      await element.updateComplete;
      expect(element.shadowRoot!.querySelector('.stage-node--failed')).toBeTruthy();
    });

    it('EXPIRED shows as failed', async () => {
      element = await fixture(html`
        <blocks-timeline .strategy=${stateProgressionStrategy()} .data=${{ currentState: 'EXPIRED' }}></blocks-timeline>
      `);
      await element.updateComplete;
      expect(element.shadowRoot!.querySelector('.stage-node--failed')).toBeTruthy();
    });
  });
});
