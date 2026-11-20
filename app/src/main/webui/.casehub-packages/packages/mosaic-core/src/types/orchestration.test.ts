import { describe, it, expect } from 'vitest';
import type {
  ExecutionState, ExecutionResult, AgentRefType,
  AgentResultStatus, OrchestrationAuditEvent,
  RoutingDecisionPayload, ExecutionSnapshot, AgentRetryPolicy,
  RoutingSpec, DispositionAxisWeight, RoutingAgentStatus,
} from './orchestration.js';
import type { PatternCategoryName } from './patterns/index.js';

describe('orchestration types', () => {
  it('ExecutionState covers all 7 states', () => {
    const states: ExecutionState[] = [
      'idle', 'running', 'waiting-for-agent', 'waiting-for-event',
      'complete', 'faulted', 'cancelled',
    ];
    expect(states).toHaveLength(7);
  });

  it('ExecutionResult covers all 4 outcomes', () => {
    const results: ExecutionResult[] = ['completed', 'failed', 'escalated', 'cancelled'];
    expect(results).toHaveLength(4);
  });

  it('PatternCategoryName covers all 8 categories', () => {
    const names: PatternCategoryName[] = [
      'playbook', 'orchestration', 'deliberation', 'perception',
      'communication', 'governance', 'optimisation', 'social',
    ];
    expect(names).toHaveLength(8);
  });

  it('AgentRefType covers all 5 variants', () => {
    const types: AgentRefType[] = ['worker', 'channel', 'human', 'external', 'composed'];
    expect(types).toHaveLength(5);
  });

  it('AgentResultStatus covers all 4 statuses', () => {
    const statuses: AgentResultStatus[] = ['success', 'failure', 'timeout', 'declined'];
    expect(statuses).toHaveLength(4);
  });

  it('OrchestrationPayload discriminated union narrows on type field', () => {
    const event: OrchestrationAuditEvent = {
      id: 'e1',
      eventType: 'routing-decision',
      executionId: 'exec1',
      timestamp: '2026-01-01T00:00:00Z',
      payload: {
        type: 'routing-decision',
        outcome: 'selected',
        selectedAgents: [{ type: 'worker', name: 'worker-1' }],
        reason: 'highest trust score',
      } satisfies RoutingDecisionPayload,
    };
    const payload = event.payload;
    if (payload.type === 'routing-decision') {
      expect(payload.outcome).toBe('selected');
      expect(payload.selectedAgents).toHaveLength(1);
    }
  });

  it('ExecutionSnapshot has required fields', () => {
    const snapshot: ExecutionSnapshot = {
      executionId: 'exec1',
      state: 'running',
      model: {
        pattern: 'orchestration',
        failurePolicy: {
          routingFailureAction: 'retry-broader',
          aggregationFailureAction: 'escalate',
        },
      },
      activeAgents: [{ type: 'worker' }],
      completedAgents: [],
    };
    expect(snapshot.state).toBe('running');
    expect(snapshot.model.pattern).toBe('orchestration');
  });

  it('AgentRetryPolicy has backoff strategy', () => {
    const policy: AgentRetryPolicy = {
      maxRetries: 3,
      backoffStrategy: 'exponential',
      initialDelayMs: 1000,
    };
    expect(policy.backoffStrategy).toBe('exponential');
  });

  it('RoutingSpec accepts cbr-agent with optional similarityThreshold', () => {
    const spec: RoutingSpec = { type: 'cbr-agent', similarityThreshold: 0.8 };
    expect(spec.type).toBe('cbr-agent');
  });

  it('RoutingSpec accepts disposition-aware with optional axes', () => {
    const axes: DispositionAxisWeight[] = [
      { axis: 'openness', weight: 0.7 },
      { axis: 'conscientiousness', weight: 0.3 },
    ];
    const spec: RoutingSpec = { type: 'disposition-aware', axes };
    expect(spec.type).toBe('disposition-aware');
    if (spec.type === 'disposition-aware') expect(spec.axes).toHaveLength(2);
  });

  it('RoutingSpec accepts llm-selected with model and prompt', () => {
    const spec: RoutingSpec = { type: 'llm-selected', model: 'claude-sonnet-5-5', prompt: 'Pick the best analyst' };
    expect(spec.type).toBe('llm-selected');
    if (spec.type === 'llm-selected') {
      expect(spec.model).toBe('claude-sonnet-5-5');
      expect(spec.prompt).toBe('Pick the best analyst');
    }
  });

  it('RoutingAgentStatus covers all 4 values', () => {
    const statuses: RoutingAgentStatus[] = ['selected', 'skipped', 'not-evaluated', 'excluded'];
    expect(statuses).toHaveLength(4);
  });
});
