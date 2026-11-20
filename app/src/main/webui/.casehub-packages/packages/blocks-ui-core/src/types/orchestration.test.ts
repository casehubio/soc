import { describe, it, expect } from 'vitest';
import type {
  ExecutionState, ExecutionResult, PatternType, AgentRefType,
  AgentResultStatus, OrchestrationAuditEvent,
  RoutingDecisionPayload, ExecutionSnapshot, AgentRetryPolicy,
} from './orchestration.js';

describe('orchestration types', () => {
  it('ExecutionState covers all 7 states', () => {
    const states: ExecutionState[] = [
      'IDLE', 'RUNNING', 'WAITING_FOR_AGENT', 'WAITING_FOR_EVENT',
      'COMPLETE', 'FAULTED', 'CANCELLED',
    ];
    expect(states).toHaveLength(7);
  });

  it('ExecutionResult covers all 4 outcomes', () => {
    const results: ExecutionResult[] = ['COMPLETED', 'FAILED', 'ESCALATED', 'CANCELLED'];
    expect(results).toHaveLength(4);
  });

  it('PatternType covers all 8 patterns', () => {
    const patterns: PatternType[] = [
      'SEQUENCE', 'PARALLEL', 'LOOP', 'CONDITIONAL',
      'SUPERVISOR', 'DEBATE', 'VOTING', 'HTN',
    ];
    expect(patterns).toHaveLength(8);
  });

  it('AgentRefType covers all 5 variants', () => {
    const types: AgentRefType[] = ['WORKER', 'CHANNEL', 'HUMAN', 'EXTERNAL', 'COMPOSED'];
    expect(types).toHaveLength(5);
  });

  it('AgentResultStatus covers all 4 statuses', () => {
    const statuses: AgentResultStatus[] = ['SUCCESS', 'FAILURE', 'TIMEOUT', 'DECLINED'];
    expect(statuses).toHaveLength(4);
  });

  it('OrchestrationPayload discriminated union narrows on type field', () => {
    const event: OrchestrationAuditEvent = {
      id: 'e1',
      eventType: 'ROUTING_DECISION',
      executionId: 'exec1',
      timestamp: '2026-01-01T00:00:00Z',
      payload: {
        type: 'ROUTING_DECISION',
        outcome: 'SELECTED',
        selectedAgents: [{ id: 'w1', type: 'WORKER', name: 'worker-1' }],
        reason: 'highest trust score',
      } satisfies RoutingDecisionPayload,
    };
    const payload = event.payload;
    if (payload.type === 'ROUTING_DECISION') {
      expect(payload.outcome).toBe('SELECTED');
      expect(payload.selectedAgents).toHaveLength(1);
    }
  });

  it('ExecutionSnapshot has required fields', () => {
    const snapshot: ExecutionSnapshot = {
      executionId: 'exec1',
      state: 'RUNNING',
      model: {
        pattern: 'PARALLEL',
        failurePolicy: {
          routingFailureAction: 'RETRY_BROADER',
          aggregationFailureAction: 'ESCALATE',
        },
      },
      activeAgents: [{ id: 'w1', type: 'WORKER' }],
      completedAgents: [],
    };
    expect(snapshot.state).toBe('RUNNING');
    expect(snapshot.model.pattern).toBe('PARALLEL');
  });

  it('AgentRetryPolicy has backoff strategy', () => {
    const policy: AgentRetryPolicy = {
      maxRetries: 3,
      backoffStrategy: 'EXPONENTIAL',
      initialDelayMs: 1000,
    };
    expect(policy.backoffStrategy).toBe('EXPONENTIAL');
  });
});
