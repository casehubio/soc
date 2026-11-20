import { describe, it, expect } from 'vitest';
import type { ExecutionSnapshot } from '@casehubio/mosaic-core';

const RUNNING_SNAPSHOT: ExecutionSnapshot = {
  executionId: 'exec1',
  state: 'RUNNING',
  model: {
    pattern: 'PARALLEL',
    routingStrategy: 'trust-weighted',
    aggregationStrategy: 'majority',
    failurePolicy: {
      routingFailureAction: 'RETRY_BROADER',
      aggregationFailureAction: 'ESCALATE',
    },
  },
  activeAgents: [
    { id: 'w1', type: 'WORKER', name: 'worker-1' },
    { id: 'h1', type: 'HUMAN', name: 'reviewer' },
  ],
  completedAgents: [
    { agentRef: { id: 'w2', type: 'WORKER', name: 'worker-2' }, status: 'SUCCESS', duration: 1200 },
    { agentRef: { id: 'c1', type: 'CHANNEL', name: 'channel-1' }, status: 'FAILURE', error: 'timeout' },
  ],
  iteration: 3,
  startedAt: '2026-01-01T00:00:00Z',
};

describe('ExecutionMonitor', () => {
  it('can be instantiated', async () => {
    const { ExecutionMonitor } = await import('./execution-monitor.js');
    const el = new ExecutionMonitor();
    expect(el).toBeDefined();
  });

  it('accepts inline data via property', async () => {
    const { ExecutionMonitor } = await import('./execution-monitor.js');
    const el = new ExecutionMonitor();
    el.data = RUNNING_SNAPSHOT;
    expect(el.data.state).toBe('RUNNING');
  });

  it('exports ExecutionMonitorTopics', async () => {
    const { ExecutionMonitorTopics } = await import('./execution-monitor.js');
    expect(ExecutionMonitorTopics.AGENT_SELECTED).toBe('execution.agent-selected');
  });

  it('has default staleThresholdMs', async () => {
    const { ExecutionMonitor } = await import('./execution-monitor.js');
    const el = new ExecutionMonitor();
    expect(el.staleThresholdMs).toBe(30000);
  });

  it('sets role="status" and aria-label on connect', async () => {
    const { ExecutionMonitor } = await import('./execution-monitor.js');
    const el = new ExecutionMonitor();
    document.body.appendChild(el);
    expect(el.getAttribute('role')).toBe('status');
    expect(el.getAttribute('aria-label')).toBe('Execution monitor');
    el.remove();
  });

  it('sets aria-busy when connecting', async () => {
    const { ExecutionMonitor } = await import('./execution-monitor.js');
    const el = new ExecutionMonitor();
    document.body.appendChild(el);
    await (el as any).updateComplete;
    expect(el.getAttribute('aria-busy')).toBe('false');
    el.remove();
  });
});
