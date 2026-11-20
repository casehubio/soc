import { describe, it, expect } from 'vitest';
import { render } from 'lit';
import {
  eventChronologyStrategy,
  categorizeEvent,
  isCompactModeEvent,
} from './event-chronology.js';
import type { CaseEvent, EventLogEntryResponse, PagedResponse } from './event-chronology.js';

describe('eventChronologyStrategy', () => {
  const events: CaseEvent[] = [
    { eventType: 'CASE_STARTED', streamType: 'CASE', timestamp: '2026-01-01T10:00:00Z', payload: { type: 'FRAUD' } },
    { eventType: 'TASK_CREATED', streamType: 'WORKER', timestamp: '2026-01-01T10:05:00Z', payload: { taskId: 't-1' } },
    { eventType: 'MILESTONE_REACHED', streamType: 'CASE', timestamp: '2026-01-01T11:00:00Z', payload: {} },
    { eventType: 'AGENT_DISPATCHED', streamType: 'WORKER', timestamp: '2026-01-01T11:30:00Z', payload: {}, metadata: { workerName: 'Alice', trustScore: 0.85 } },
    { eventType: 'TIMER_FIRED', streamType: 'TIMER', timestamp: '2026-01-01T12:00:00Z', payload: {} },
  ];

  describe('toNodes', () => {
    it('maps each event to a node', () => {
      const strategy = eventChronologyStrategy();
      const nodes = strategy.toNodes(events);
      expect(nodes).toHaveLength(5);
    });

    it('uses eventType with spaces as label', () => {
      const strategy = eventChronologyStrategy();
      const nodes = strategy.toNodes(events);
      expect(nodes[0]!.label).toBe('CASE STARTED');
    });

    it('sets key with index', () => {
      const strategy = eventChronologyStrategy();
      const nodes = strategy.toNodes(events);
      expect(nodes[0]!.key).toBe('event-0');
      expect(nodes[4]!.key).toBe('event-4');
    });

    it('sets timestamp from event', () => {
      const strategy = eventChronologyStrategy();
      const nodes = strategy.toNodes(events);
      expect(nodes[0]!.timestamp).toBe('2026-01-01T10:00:00Z');
    });

    it('sets category from streamType (for filtering)', () => {
      const strategy = eventChronologyStrategy();
      const nodes = strategy.toNodes(events);
      expect(nodes[0]!.category).toBe('CASE');
      expect(nodes[1]!.category).toBe('WORKER');
      expect(nodes[2]!.category).toBe('CASE');
      expect(nodes[3]!.category).toBe('WORKER');
      expect(nodes[4]!.category).toBe('TIMER');
    });

    it('sets detail to full event (for strategy renderNode access)', () => {
      const strategy = eventChronologyStrategy();
      const nodes = strategy.toNodes(events);
      expect((nodes[0]!.detail as CaseEvent).payload).toEqual({ type: 'FRAUD' });
      expect((nodes[0]!.detail as CaseEvent).eventType).toBe('CASE_STARTED');
    });

    it('sets actor from metadata.workerName', () => {
      const strategy = eventChronologyStrategy();
      const nodes = strategy.toNodes(events);
      expect(nodes[3]!.actor).toBe('Alice');
    });

    it('leaves actor undefined when no workerName in metadata', () => {
      const strategy = eventChronologyStrategy();
      const nodes = strategy.toNodes(events);
      expect(nodes[0]!.actor).toBeUndefined();
    });

    it('sets all nodes to completed status', () => {
      const strategy = eventChronologyStrategy();
      const nodes = strategy.toNodes(events);
      expect(nodes.every(n => n.status === 'completed')).toBe(true);
    });

    it('handles empty array', () => {
      const strategy = eventChronologyStrategy();
      expect(strategy.toNodes([])).toEqual([]);
    });
  });

  describe('toNodes with custom categorize', () => {
    it('custom categorize affects renderNode, not node.category', () => {
      const strategy = eventChronologyStrategy({
        categorize: () => 'custom',
      });
      const nodes = strategy.toNodes(events);
      expect(nodes[0]!.category).toBe('CASE');
      expect(nodes[1]!.category).toBe('WORKER');
    });

    it('custom categorize is called via renderNode', () => {
      const calls: string[] = [];
      const strategy = eventChronologyStrategy({
        categorize: (et) => { calls.push(et); return 'custom'; },
      });
      const nodes = strategy.toNodes(events);
      strategy.renderNode!(nodes[0]!);
      expect(calls).toEqual([events[0]!.eventType]);
    });
  });

  describe('renderNode inline styles (PP-20260713-8ea1af)', () => {
    it('renderNode output uses inline style, not CSS class reference', () => {
      const strategy = eventChronologyStrategy();
      const nodes = strategy.toNodes(events);
      const result = strategy.renderNode!(nodes[0]!);
      const container = document.createElement('div');
      render(result, container);
      const span = container.querySelector('span');
      expect(span).toBeTruthy();
      expect(span!.hasAttribute('style')).toBe(true);
      expect(span!.className).not.toContain('event-type-badge');
    });

    it('renderNode inline style varies by event category', () => {
      const strategy = eventChronologyStrategy();
      const nodes = strategy.toNodes(events);
      const container1 = document.createElement('div');
      render(strategy.renderNode!(nodes[0]!), container1);
      const style1 = container1.querySelector('span')!.getAttribute('style');

      const container2 = document.createElement('div');
      render(strategy.renderNode!(nodes[1]!), container2);
      const style2 = container2.querySelector('span')!.getAttribute('style');

      expect(style1).toBeTruthy();
      expect(style2).toBeTruthy();
      expect(style1).not.toBe(style2);
    });
  });

  describe('transformData', () => {
    it('passes through CaseEvent[] directly', () => {
      const strategy = eventChronologyStrategy();
      const result = strategy.transformData!(events);
      expect(result).toBe(events);
    });

    it('extracts .content from PagedResponse', () => {
      const paged: PagedResponse<EventLogEntryResponse> = {
        content: events as EventLogEntryResponse[],
        page: 0,
        size: 20,
        totalElements: events.length,
        totalPages: 1,
      };
      const strategy = eventChronologyStrategy();
      const result = strategy.transformData!(paged);
      expect(result).toHaveLength(5);
      expect(result).toBe(paged.content);
    });

    it('handles empty content array', () => {
      const paged: PagedResponse<EventLogEntryResponse> = {
        content: [],
        page: 0,
        size: 20,
        totalElements: 0,
        totalPages: 0,
      };
      const strategy = eventChronologyStrategy();
      const result = strategy.transformData!(paged);
      expect(result).toHaveLength(0);
    });

    it('handles object without content as pass-through', () => {
      const strategy = eventChronologyStrategy();
      const data = [{ eventType: 'X', streamType: 'Y', timestamp: 'Z', payload: {} }];
      expect(strategy.transformData!(data)).toBe(data);
    });
  });

  describe('defaultLayout', () => {
    it('is vertical', () => {
      expect(eventChronologyStrategy().defaultLayout).toBe('vertical');
    });
  });

  describe('pagination support', () => {
    it('declares supportsPagination as true', () => {
      expect(eventChronologyStrategy().supportsPagination).toBe(true);
    });

    it('extractPaginationMeta returns meta from PagedResponse', () => {
      const paged: PagedResponse<EventLogEntryResponse> = {
        content: events as EventLogEntryResponse[],
        page: 2,
        size: 10,
        totalElements: 50,
        totalPages: 5,
      };
      const strategy = eventChronologyStrategy();
      const meta = strategy.extractPaginationMeta!(paged);
      expect(meta).toEqual({ page: 2, totalPages: 5, totalElements: 50 });
    });

    it('extractPaginationMeta returns undefined for plain array', () => {
      const strategy = eventChronologyStrategy();
      expect(strategy.extractPaginationMeta!(events)).toBeUndefined();
    });

    it('extractPaginationMeta returns undefined for null', () => {
      const strategy = eventChronologyStrategy();
      expect(strategy.extractPaginationMeta!(null)).toBeUndefined();
    });
  });

  describe('filterCategories', () => {
    it('defaults to standard stream types', () => {
      expect(eventChronologyStrategy().filterCategories).toEqual(['CASE', 'WORKER', 'ORCHESTRATION', 'TIMER', 'SYSTEM']);
    });

    it('uses custom streamTypes when provided', () => {
      expect(eventChronologyStrategy({ streamTypes: ['A', 'B'] }).filterCategories).toEqual(['A', 'B']);
    });
  });
});

describe('categorizeEvent', () => {
  it('categorizes CASE_ events as lifecycle', () => {
    expect(categorizeEvent('CASE_STARTED')).toBe('lifecycle');
    expect(categorizeEvent('CASE_COMPLETED')).toBe('lifecycle');
    expect(categorizeEvent('CASE_FAULTED')).toBe('lifecycle');
    expect(categorizeEvent('CASE_CANCELLED')).toBe('lifecycle');
    expect(categorizeEvent('CASE_SUSPENDED')).toBe('lifecycle');
    expect(categorizeEvent('CASE_RESUMED')).toBe('lifecycle');
  });

  it('categorizes TASK_ events as task', () => {
    expect(categorizeEvent('TASK_CREATED')).toBe('task');
    expect(categorizeEvent('TASK_COMPLETED')).toBe('task');
    expect(categorizeEvent('TASK_FAILED')).toBe('task');
  });

  it('categorizes AGENT_ events as agent', () => {
    expect(categorizeEvent('AGENT_DISPATCHED')).toBe('agent');
    expect(categorizeEvent('AGENT_COMPLETED')).toBe('agent');
    expect(categorizeEvent('AGENT_FAILED')).toBe('agent');
  });

  it('categorizes MILESTONE_ and SLA_VIOLATED as milestone', () => {
    expect(categorizeEvent('MILESTONE_REACHED')).toBe('milestone');
    expect(categorizeEvent('MILESTONE_ACTIVATED')).toBe('milestone');
    expect(categorizeEvent('MILESTONE_COMPLETED')).toBe('milestone');
    expect(categorizeEvent('SLA_VIOLATED')).toBe('milestone');
  });

  it('categorizes ACTION_GATE_ events as action-gate', () => {
    expect(categorizeEvent('ACTION_GATE_PENDING')).toBe('action-gate');
    expect(categorizeEvent('ACTION_GATE_APPROVED')).toBe('action-gate');
    expect(categorizeEvent('ACTION_GATE_REJECTED')).toBe('action-gate');
  });

  it('categorizes ORCHESTRATION_ events as orchestration', () => {
    expect(categorizeEvent('ORCHESTRATION_STARTED')).toBe('orchestration');
    expect(categorizeEvent('ORCHESTRATION_COMPLETED')).toBe('orchestration');
  });

  it('categorizes TIMER_ events as timer', () => {
    expect(categorizeEvent('TIMER_SCHEDULED')).toBe('timer');
    expect(categorizeEvent('TIMER_FIRED')).toBe('timer');
    expect(categorizeEvent('TIMER_CANCELLED')).toBe('timer');
  });

  it('defaults unknown events to lifecycle', () => {
    expect(categorizeEvent('UNKNOWN_EVENT')).toBe('lifecycle');
    expect(categorizeEvent('CUSTOM_TYPE')).toBe('lifecycle');
  });
});

describe('isCompactModeEvent', () => {
  it('includes lifecycle events', () => {
    expect(isCompactModeEvent('CASE_STARTED')).toBe(true);
    expect(isCompactModeEvent('CASE_COMPLETED')).toBe(true);
  });

  it('includes milestone events', () => {
    expect(isCompactModeEvent('MILESTONE_REACHED')).toBe(true);
    expect(isCompactModeEvent('SLA_VIOLATED')).toBe(true);
  });

  it('excludes task events', () => {
    expect(isCompactModeEvent('TASK_CREATED')).toBe(false);
    expect(isCompactModeEvent('TASK_COMPLETED')).toBe(false);
  });

  it('excludes agent events', () => {
    expect(isCompactModeEvent('AGENT_DISPATCHED')).toBe(false);
  });

  it('excludes orchestration events', () => {
    expect(isCompactModeEvent('ORCHESTRATION_STARTED')).toBe(false);
  });

  it('excludes timer events', () => {
    expect(isCompactModeEvent('TIMER_FIRED')).toBe(false);
  });

  it('excludes action-gate events', () => {
    expect(isCompactModeEvent('ACTION_GATE_PENDING')).toBe(false);
  });
});
