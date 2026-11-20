import { html } from 'lit';
import type { EventTimelineNode, EventNodeStatus } from '@casehubio/pages-viz';
import type { EventTimelineStrategy } from '@casehubio/pages-viz';
import type {
  OrchestrationAuditEvent, OrchestrationEventType, OrchestrationPayload,
} from '@casehubio/mosaic-core';

const FILTER_MAP: Record<OrchestrationEventType, string> = {
  'routing-decision': 'routing',
  'activation-evaluated': 'activation',
  'agent-dispatched': 'dispatch',
  'agent-result': 'dispatch',
  'agent-failed': 'dispatch',
  'aggregation-completed': 'aggregation',
  'termination-evaluated': 'termination',
  'execution-started': 'termination',
  'execution-completed': 'termination',
};

export function orchestrationFilterCategory(eventType: OrchestrationEventType): string {
  return FILTER_MAP[eventType] ?? 'termination';
}

function nodeLabel(payload: OrchestrationPayload): string {
  switch (payload.type) {
    case 'execution-started': return 'Execution started';
    case 'routing-decision': return `Routing: ${payload.outcome}`;
    case 'activation-evaluated': return `Activation: ${payload.conditionMet ? 'met' : 'unmet'}`;
    case 'agent-dispatched': return `Dispatched: ${payload.agentRef.name ?? payload.agentRef.id}`;
    case 'agent-result': return `Result: ${payload.agentRef.name ?? payload.agentRef.id}`;
    case 'agent-failed': return `Failed: ${payload.agentRef.name ?? payload.agentRef.id}`;
    case 'aggregation-completed': return `Aggregation: ${payload.outcome}`;
    case 'termination-evaluated': return `Termination: ${payload.outcome}`;
    case 'execution-completed': return 'Execution completed';
  }
}

function nodeStatus(payload: OrchestrationPayload): EventNodeStatus {
  switch (payload.type) {
    case 'execution-started': return 'active';
    case 'routing-decision':
      return payload.outcome === 'selected' ? 'completed' : 'failed';
    case 'activation-evaluated':
      return payload.conditionMet ? 'completed' : 'skipped';
    case 'agent-dispatched': return 'active';
    case 'agent-result': return 'completed';
    case 'agent-failed': return 'failed';
    case 'aggregation-completed':
      if (payload.outcome === 'resolved') return 'completed';
      if (payload.outcome === 'partial') return 'active';
      return 'failed';
    case 'termination-evaluated':
      if (payload.outcome === 'complete') return 'completed';
      if (payload.outcome === 'continue') return 'active';
      return 'failed';
    case 'execution-completed':
      return payload.result === 'completed' ? 'completed' : 'failed';
  }
}

function toNode(event: OrchestrationAuditEvent): EventTimelineNode {
  const filterCat = orchestrationFilterCategory(event.eventType);
  return {
    key: event.id,
    label: nodeLabel(event.payload),
    status: nodeStatus(event.payload),
    timestamp: event.timestamp,
    detail: event.payload,
    category: event.iteration != null ? `iteration-${event.iteration}` : filterCat,
  };
}

function renderDetail(node: EventTimelineNode) {
  const payload = node.detail as OrchestrationPayload;
  if (!payload) return html``;

  switch (payload.type) {
    case 'execution-started':
      return html`<div style="font-size: 12px; color: var(--pages-neutral-11, #333);">Pattern: ${payload.model.pattern} | Routing failure: ${payload.model.failurePolicy.routingFailureAction} | Aggregation failure: ${payload.model.failurePolicy.aggregationFailureAction}</div>`;
    case 'routing-decision': {
      const agents = payload.selectedAgents ?? [];
      return html`
        <div style="font-size: 12px; color: var(--pages-neutral-11, #333);">
          ${agents.length > 0 ? html`<div>Selected: ${agents.map(a => html`<span style="display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 500; background: var(--pages-accent-3, #dbeafe); color: var(--pages-accent-11, #1e40af); margin-right: 4px;">${a.name ?? a.id} [${a.type}]</span>`)}</div>` : ''}
          ${payload.reason ? html`<div style="margin-top: 4px; font-style: italic; color: var(--pages-neutral-9, #888);">${payload.reason}</div>` : ''}
        </div>`;
    }
    case 'activation-evaluated':
      return html`<div style="font-size: 12px; color: var(--pages-neutral-11, #333);">${payload.conditionExpression ? html`Condition: <code style="font-family: var(--pages-font-mono, monospace); font-size: 11px; background: var(--pages-neutral-2, #f5f5f5); padding: 1px 4px; border-radius: 2px;">${payload.conditionExpression}</code>` : ''}</div>`;
    case 'agent-dispatched':
      return html`<div style="font-size: 12px; color: var(--pages-neutral-11, #333);"><span style="display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 500; background: var(--pages-neutral-3, #e5e5e5); color: var(--pages-neutral-11, #333);">${payload.agentRef.type}</span> ${payload.agentRef.name ?? payload.agentRef.id}</div>`;
    case 'agent-result':
    case 'agent-failed':
      return html`<div style="font-size: 12px; color: var(--pages-neutral-11, #333);">Status: ${payload.status}${payload.duration != null ? html` | Duration: ${payload.duration}ms` : ''}${payload.error ? html` | Error: ${payload.error}` : ''}${payload.detail ? html` | ${payload.detail}` : ''}</div>`;
    case 'aggregation-completed':
      return html`<div style="font-size: 12px; color: var(--pages-neutral-11, #333);">Outcome: ${payload.outcome}${payload.remainingCount != null ? html` | Remaining: ${payload.remainingCount}` : ''}</div>`;
    case 'termination-evaluated':
      return html`<div style="font-size: 12px; color: var(--pages-neutral-11, #333);">Decision: ${payload.outcome}${payload.reason ? html` | ${payload.reason}` : ''}</div>`;
    case 'execution-completed':
      return html`<div style="font-size: 12px; color: var(--pages-neutral-11, #333);">Result: ${payload.result}${payload.reason ? html` | ${payload.reason}` : ''}</div>`;
  }
}

function isPagedResponse(data: unknown): data is { content: OrchestrationAuditEvent[] } {
  return data != null && typeof data === 'object' && 'content' in data && Array.isArray((data as { content: unknown[] }).content);
}

export const orchestrationEventsStrategy: EventTimelineStrategy<OrchestrationAuditEvent[]> = {
  toNodes(data: OrchestrationAuditEvent[]): EventTimelineNode[] {
    return data.map(toNode);
  },
  transformData(raw: unknown): OrchestrationAuditEvent[] {
    if (isPagedResponse(raw)) return raw.content;
    return raw as OrchestrationAuditEvent[];
  },
  defaultLayout: 'vertical',
  renderDetail,
  filterCategories: ['routing', 'activation', 'dispatch', 'aggregation', 'termination'],
  supportsPagination: true,
};
