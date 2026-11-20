import { describe, it, expect } from 'vitest';
import { orchestrationEventsStrategy, orchestrationFilterCategory } from './orchestration-events.js';
import type { OrchestrationAuditEvent } from '@casehubio/mosaic-core';

function makeEvent(
  eventType: OrchestrationAuditEvent['eventType'],
  payload: OrchestrationAuditEvent['payload'],
  overrides?: Partial<OrchestrationAuditEvent>,
): OrchestrationAuditEvent {
  return {
    id: `e-${eventType}`,
    eventType,
    executionId: 'exec1',
    timestamp: '2026-01-01T00:00:00Z',
    payload,
    ...overrides,
  };
}

describe('orchestrationEventsStrategy', () => {
  it('has defaultLayout vertical', () => {
    expect(orchestrationEventsStrategy.defaultLayout).toBe('vertical');
  });

  it('supports pagination', () => {
    expect(orchestrationEventsStrategy.supportsPagination).toBe(true);
  });

  it('has transformData defined', () => {
    expect(orchestrationEventsStrategy.transformData).toBeDefined();
  });

  it('transformData extracts .content from paged response', () => {
    const paged = {
      content: [
        makeEvent('execution-started', { type: 'execution-started', model: {
          pattern: 'orchestration', failurePolicy: { routingFailureAction: 'fail', aggregationFailureAction: 'fail' },
        }}),
      ],
      page: 0, size: 20, totalElements: 1, totalPages: 1,
    };
    const result = orchestrationEventsStrategy.transformData!(paged);
    expect(result).toHaveLength(1);
    expect(result).toBe(paged.content);
  });

  it('transformData passes through plain array', () => {
    const events = [
      makeEvent('execution-started', { type: 'execution-started', model: {
        pattern: 'orchestration', failurePolicy: { routingFailureAction: 'fail', aggregationFailureAction: 'fail' },
      }}),
    ];
    const result = orchestrationEventsStrategy.transformData!(events);
    expect(result).toBe(events);
  });

  it('maps EXECUTION_STARTED to active node', () => {
    const events: OrchestrationAuditEvent[] = [
      makeEvent('execution-started', { type: 'execution-started', model: {
        pattern: 'orchestration', failurePolicy: { routingFailureAction: 'fail', aggregationFailureAction: 'fail' },
      }}),
    ];
    const nodes = orchestrationEventsStrategy.toNodes(events);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].status).toBe('active');
    expect(nodes[0].label).toContain('Execution started');
  });

  it('maps ROUTING_DECISION SELECTED to completed', () => {
    const events: OrchestrationAuditEvent[] = [
      makeEvent('routing-decision', {
        type: 'routing-decision', outcome: 'selected',
        selectedAgents: [{ id: 'w1', type: 'worker', name: 'worker-1' }],
        reason: 'highest score',
      }),
    ];
    const nodes = orchestrationEventsStrategy.toNodes(events);
    expect(nodes[0].status).toBe('completed');
    expect(nodes[0].label).toContain('selected');
  });

  it('maps ROUTING_DECISION UNRESOLVABLE to failed', () => {
    const events: OrchestrationAuditEvent[] = [
      makeEvent('routing-decision', {
        type: 'routing-decision', outcome: 'unresolvable', reason: 'no candidates',
      }),
    ];
    const nodes = orchestrationEventsStrategy.toNodes(events);
    expect(nodes[0].status).toBe('failed');
  });

  it('maps AGENT_DISPATCHED to active', () => {
    const events: OrchestrationAuditEvent[] = [
      makeEvent('agent-dispatched', {
        type: 'agent-dispatched', agentRef: { id: 'w1', type: 'worker', name: 'worker-1' },
      }),
    ];
    const nodes = orchestrationEventsStrategy.toNodes(events);
    expect(nodes[0].status).toBe('active');
    expect(nodes[0].label).toContain('worker-1');
  });

  it('maps AGENT_RESULT to completed', () => {
    const events: OrchestrationAuditEvent[] = [
      makeEvent('agent-result', {
        type: 'agent-result', agentRef: { id: 'w1', type: 'worker', name: 'worker-1' },
        status: 'success', duration: 1200,
      }),
    ];
    const nodes = orchestrationEventsStrategy.toNodes(events);
    expect(nodes[0].status).toBe('completed');
  });

  it('maps AGENT_FAILED to failed', () => {
    const events: OrchestrationAuditEvent[] = [
      makeEvent('agent-failed', {
        type: 'agent-failed', agentRef: { id: 'w1', type: 'worker' },
        status: 'failure', error: 'timeout',
      }),
    ];
    const nodes = orchestrationEventsStrategy.toNodes(events);
    expect(nodes[0].status).toBe('failed');
  });

  it('maps ACTIVATION_EVALUATED met to completed', () => {
    const events: OrchestrationAuditEvent[] = [
      makeEvent('activation-evaluated', {
        type: 'activation-evaluated', conditionMet: true, conditionExpression: 'x > 0',
      }),
    ];
    const nodes = orchestrationEventsStrategy.toNodes(events);
    expect(nodes[0].status).toBe('completed');
    expect(nodes[0].label).toContain('met');
  });

  it('maps ACTIVATION_EVALUATED unmet to skipped', () => {
    const events: OrchestrationAuditEvent[] = [
      makeEvent('activation-evaluated', {
        type: 'activation-evaluated', conditionMet: false,
      }),
    ];
    const nodes = orchestrationEventsStrategy.toNodes(events);
    expect(nodes[0].status).toBe('skipped');
  });

  it('maps AGGREGATION_COMPLETED RESOLVED to completed', () => {
    const events: OrchestrationAuditEvent[] = [
      makeEvent('aggregation-completed', {
        type: 'aggregation-completed', outcome: 'resolved',
      }),
    ];
    const nodes = orchestrationEventsStrategy.toNodes(events);
    expect(nodes[0].status).toBe('completed');
  });

  it('maps AGGREGATION_COMPLETED DEADLOCKED to failed', () => {
    const events: OrchestrationAuditEvent[] = [
      makeEvent('aggregation-completed', {
        type: 'aggregation-completed', outcome: 'deadlocked',
      }),
    ];
    const nodes = orchestrationEventsStrategy.toNodes(events);
    expect(nodes[0].status).toBe('failed');
  });

  it('maps TERMINATION_EVALUATED COMPLETE to completed', () => {
    const events: OrchestrationAuditEvent[] = [
      makeEvent('termination-evaluated', {
        type: 'termination-evaluated', outcome: 'complete',
      }),
    ];
    const nodes = orchestrationEventsStrategy.toNodes(events);
    expect(nodes[0].status).toBe('completed');
  });

  it('maps EXECUTION_COMPLETED with COMPLETED result to completed', () => {
    const events: OrchestrationAuditEvent[] = [
      makeEvent('execution-completed', {
        type: 'execution-completed', result: 'completed',
      }),
    ];
    const nodes = orchestrationEventsStrategy.toNodes(events);
    expect(nodes[0].status).toBe('completed');
  });

  it('maps EXECUTION_COMPLETED with FAILED result to failed', () => {
    const events: OrchestrationAuditEvent[] = [
      makeEvent('execution-completed', {
        type: 'execution-completed', result: 'failed', reason: 'deadlock',
      }),
    ];
    const nodes = orchestrationEventsStrategy.toNodes(events);
    expect(nodes[0].status).toBe('failed');
  });

  it('sets iteration category when iteration is present', () => {
    const events: OrchestrationAuditEvent[] = [
      makeEvent('routing-decision', {
        type: 'routing-decision', outcome: 'selected',
      }, { iteration: 2 }),
    ];
    const nodes = orchestrationEventsStrategy.toNodes(events);
    expect(nodes[0].category).toBe('iteration-2');
  });

  it('sets category from filter mapping when no iteration', () => {
    const events: OrchestrationAuditEvent[] = [
      makeEvent('aggregation-completed', {
        type: 'aggregation-completed', outcome: 'resolved',
      }),
    ];
    const nodes = orchestrationEventsStrategy.toNodes(events);
    expect(nodes[0].category).toBe('aggregation');
  });
});

describe('orchestrationFilterCategory', () => {
  it('maps ROUTING_DECISION to routing', () => {
    expect(orchestrationFilterCategory('routing-decision')).toBe('routing');
  });

  it('maps AGENT_DISPATCHED to dispatch', () => {
    expect(orchestrationFilterCategory('agent-dispatched')).toBe('dispatch');
  });

  it('maps AGENT_RESULT to dispatch', () => {
    expect(orchestrationFilterCategory('agent-result')).toBe('dispatch');
  });

  it('maps AGGREGATION_COMPLETED to aggregation', () => {
    expect(orchestrationFilterCategory('aggregation-completed')).toBe('aggregation');
  });

  it('maps EXECUTION_STARTED to termination', () => {
    expect(orchestrationFilterCategory('execution-started')).toBe('termination');
  });
});
