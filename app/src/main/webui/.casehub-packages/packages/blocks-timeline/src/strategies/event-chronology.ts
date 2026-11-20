import { html } from 'lit';
import { renderPropertyTree } from '@casehubio/pages-ui-components';
import type { EventTimelineNode } from '@casehubio/pages-viz';
import type { EventTimelineStrategy, PaginationMeta } from '@casehubio/pages-viz';

export type CaseHubEventType =
  | 'CASE_STARTED' | 'CASE_COMPLETED' | 'CASE_FAULTED' | 'CASE_CANCELLED' | 'CASE_SUSPENDED' | 'CASE_RESUMED'
  | 'TASK_CREATED' | 'TASK_ACTIVATED' | 'TASK_CLAIMED' | 'TASK_COMPLETED' | 'TASK_FAILED' | 'TASK_CANCELLED'
  | 'AGENT_ROUTED' | 'AGENT_DISPATCHED' | 'AGENT_COMPLETED' | 'AGENT_FAILED' | 'AGENT_TIMEOUT'
  | 'MILESTONE_REACHED' | 'MILESTONE_ACTIVATED' | 'MILESTONE_COMPLETED' | 'MILESTONE_FAILED' | 'SLA_VIOLATED'
  | 'ACTION_GATE_PENDING' | 'ACTION_GATE_APPROVED' | 'ACTION_GATE_REJECTED' | 'ACTION_GATE_TIMEOUT'
  | 'ORCHESTRATION_STARTED' | 'ORCHESTRATION_COMPLETED' | 'ORCHESTRATION_ESCALATED' | 'ORCHESTRATION_FAILED'
  | 'TIMER_SCHEDULED' | 'TIMER_FIRED' | 'TIMER_CANCELLED';

export type EventStreamType = 'CASE' | 'WORKER' | 'TIMER' | 'SYSTEM' | 'ORCHESTRATION';

export type NodeCategory = 'lifecycle' | 'task' | 'agent' | 'milestone' | 'action-gate' | 'orchestration' | 'timer';

export interface CaseEvent {
  eventType: string;
  streamType: string;
  timestamp: string;
  payload: unknown;
  metadata?: Record<string, unknown>;
}

export interface EventLogEntryResponse {
  eventType: CaseHubEventType;
  streamType: EventStreamType;
  timestamp: string;
  payload: unknown;
  metadata?: Record<string, unknown>;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

const DEFAULT_STREAM_TYPES: string[] = ['CASE', 'WORKER', 'ORCHESTRATION', 'TIMER', 'SYSTEM'];

export function categorizeEvent(eventType: string): NodeCategory {
  if (eventType.startsWith('CASE_')) return 'lifecycle';
  if (eventType.startsWith('TASK_')) return 'task';
  if (eventType.startsWith('AGENT_')) return 'agent';
  if (eventType.startsWith('MILESTONE_') || eventType === 'SLA_VIOLATED') return 'milestone';
  if (eventType.startsWith('ACTION_GATE_')) return 'action-gate';
  if (eventType.startsWith('ORCHESTRATION_')) return 'orchestration';
  if (eventType.startsWith('TIMER_')) return 'timer';
  return 'lifecycle';
}

export function isCompactModeEvent(eventType: string): boolean {
  const category = categorizeEvent(eventType);
  return category === 'lifecycle' || category === 'milestone';
}

const CATEGORY_COLORS: Record<string, string> = {
  lifecycle: 'background: var(--pages-accent-3, #dbeafe); color: var(--pages-accent-11, #1e40af)',
  task: 'background: var(--pages-success-3, #dcfce7); color: var(--pages-success-11, #166534)',
  agent: 'background: var(--pages-warning-3, #fef3c7); color: var(--pages-warning-11, #92400e)',
  milestone: 'background: var(--pages-info-3, #e0f2fe); color: var(--pages-info-11, #0c4a6e)',
  'action-gate': 'background: var(--pages-error-3, #fee2e2); color: var(--pages-error-11, #991b1b)',
  orchestration: 'background: var(--pages-neutral-3, #e5e5e5); color: var(--pages-neutral-11, #333)',
  timer: 'background: var(--pages-neutral-2, #f5f5f5); color: var(--pages-neutral-10, #555)',
};

function isPagedResponse(data: unknown): data is PagedResponse<CaseEvent> {
  return data != null && typeof data === 'object' && 'content' in data && Array.isArray((data as PagedResponse<CaseEvent>).content);
}

export function eventChronologyStrategy(options?: {
  categorize?: (eventType: string) => string;
  streamTypes?: string[];
}): EventTimelineStrategy<CaseEvent[]> {
  const cat = options?.categorize ?? categorizeEvent;

  return {
    toNodes(data: CaseEvent[]): EventTimelineNode[] {
      return data.map((event, i) => {
        const actor = event.metadata?.workerName as string | undefined;
        return {
          key: `event-${i}`,
          label: event.eventType.replace(/_/g, ' '),
          status: 'completed' as const,
          timestamp: event.timestamp,
          ...(actor != null && { actor }),
          detail: event,
          category: event.streamType,
        };
      });
    },
    transformData(raw: unknown): CaseEvent[] {
      if (isPagedResponse(raw)) return raw.content;
      return raw as CaseEvent[];
    },
    renderNode(node: EventTimelineNode) {
      const event = node.detail as CaseEvent | undefined;
      const eventCategory = event ? cat(event.eventType) : 'lifecycle';
      const style = `display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; ${CATEGORY_COLORS[eventCategory] ?? CATEGORY_COLORS.lifecycle}`;
      return html`<span style="${style}">${node.label}</span>`;
    },
    renderDetail(node: EventTimelineNode) {
      const event = node.detail as CaseEvent | undefined;
      return html`${renderPropertyTree(event?.payload)}`;
    },
    defaultLayout: 'vertical',
    filterCategories: options?.streamTypes ?? DEFAULT_STREAM_TYPES,
    supportsPagination: true,
    extractPaginationMeta(raw: unknown): PaginationMeta | undefined {
      if (isPagedResponse(raw)) {
        return { page: raw.page, totalPages: raw.totalPages, totalElements: raw.totalElements };
      }
      return undefined;
    },
  };
}
