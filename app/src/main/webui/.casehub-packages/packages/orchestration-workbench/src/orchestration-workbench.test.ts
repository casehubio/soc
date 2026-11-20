import { describe, it, expect } from 'vitest';
import type { ExecutionSnapshot, OrchestrationAuditEvent } from '@casehubio/mosaic-core';

const SNAPSHOT: ExecutionSnapshot = {
  executionId: 'exec1',
  state: 'RUNNING',
  model: {
    pattern: 'PARALLEL',
    failurePolicy: { routingFailureAction: 'FAIL', aggregationFailureAction: 'FAIL' },
  },
  activeAgents: [{ id: 'w1', type: 'WORKER' }],
  completedAgents: [],
};

const EVENTS: OrchestrationAuditEvent[] = [
  {
    id: 'e1', eventType: 'EXECUTION_STARTED', executionId: 'exec1',
    timestamp: '2026-01-01T00:00:00Z',
    payload: { type: 'EXECUTION_STARTED', model: SNAPSHOT.model },
  },
];

describe('OrchestrationWorkbench', () => {
  it('can be instantiated', async () => {
    const { OrchestrationWorkbench } = await import('./orchestration-workbench.js');
    const el = new OrchestrationWorkbench();
    expect(el).toBeDefined();
  });

  it('accepts inline data', async () => {
    const { OrchestrationWorkbench } = await import('./orchestration-workbench.js');
    const el = new OrchestrationWorkbench();
    el.data = { snapshot: SNAPSHOT, events: EVENTS };
    expect(el.data.snapshot.state).toBe('RUNNING');
  });

  it('has default selectionTopic', async () => {
    const { OrchestrationWorkbench } = await import('./orchestration-workbench.js');
    const el = new OrchestrationWorkbench();
    expect(el.selectionTopic).toBe('orchestration');
  });

  it('configure sets endpoint and executionId', async () => {
    const { OrchestrationWorkbench } = await import('./orchestration-workbench.js');
    const el = new OrchestrationWorkbench();
    el.configure({ endpoint: '/api', executionId: 'e1' });
    expect(el.endpoint).toBe('/api');
    expect(el.executionId).toBe('e1');
  });
});
