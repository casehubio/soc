// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { AgencyDagViewer } from './agency-dag-viewer.js';
import type { DagPlanSnapshot } from '@casehubio/mosaic-graph-stencil-htn';

function simplePlan(): DagPlanSnapshot {
  return {
    nodes: {
      a: { id: 'a', taskId: 'task-a', taskDescription: 'Task A', dependsOn: [], joinType: 'ALL_OF' },
      b: { id: 'b', taskId: 'task-b', taskDescription: 'Task B', dependsOn: ['a'], joinType: 'ALL_OF' },
    },
    timestamp: '2026-08-06T10:00:00Z',
  };
}

describe('AgencyDagViewer', () => {
  it('renders empty state when dagPlan is null', () => {
    const el = new AgencyDagViewer();
    expect(el.dagPlan).toBeNull();
  });

  it('stores dagPlan property', () => {
    const el = new AgencyDagViewer();
    el.dagPlan = simplePlan();
    expect(el.dagPlan).toBeDefined();
    expect(Object.keys(el.dagPlan!.nodes)).toHaveLength(2);
  });

  it('stores dagResult property', () => {
    const el = new AgencyDagViewer();
    el.dagResult = {
      nodeStates: { a: { kind: 'Completed' } },
      allSucceeded: true, elapsed: 'PT5S', timestamp: '2026-08-06T10:01:00Z',
    };
    expect(el.dagResult!.allSucceeded).toBe(true);
  });

  it('accepts dispatchMode as property', () => {
    const el = new AgencyDagViewer();
    el.dispatchMode = 'BARRIER';
    expect(el.dispatchMode).toBe('BARRIER');
  });

  it('defaults selectionTopic to dag-node', () => {
    const el = new AgencyDagViewer();
    expect(el.selectionTopic).toBe('dag-node');
  });

  it('accepts custom selectionTopic', () => {
    const el = new AgencyDagViewer();
    el.selectionTopic = 'my-topic';
    expect(el.selectionTopic).toBe('my-topic');
  });

  it('canvas area has role="img" and aria-label', async () => {
    const el = new AgencyDagViewer();
    document.body.appendChild(el);
    await (el as any).updateComplete;
    const canvas = el.shadowRoot!.querySelector('.canvas-area');
    expect(canvas?.getAttribute('role')).toBe('img');
    expect(canvas?.getAttribute('aria-label')).toBe('DAG execution graph');
    el.remove();
  });
});
