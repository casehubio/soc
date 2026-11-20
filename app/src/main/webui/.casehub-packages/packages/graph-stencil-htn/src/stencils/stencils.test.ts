// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from 'lit-html';
import { renderDagNode, dagNodeGrammar } from './dag-node.js';
import type { GraphNode } from '@casehubio/graph-core';

function makeNode(overrides: Partial<Record<string, unknown>> = {}): GraphNode {
  return {
    id: 'dag:test',
    type: 'dag-node',
    properties: {
      id: 'test', taskId: 'task-1', taskDescription: 'Test task',
      executorName: 'test-exec', dependsOn: [] as string[], joinType: 'ALL_OF',
      ...overrides,
    },
  };
}

describe('dagNodeGrammar', () => {
  it('has type dag-node with any-to-any connections', () => {
    expect(dagNodeGrammar.type).toBe('dag-node');
    expect(dagNodeGrammar.connections.inbound.allowedFrom).toEqual(['dag-node']);
    expect(dagNodeGrammar.connections.outbound.allowedTo).toEqual(['dag-node']);
  });
});

describe('renderDagNode', () => {
  it('renders without decoration', () => {
    const template = renderDagNode(makeNode());
    const container = document.createElement('div');
    render(template, container);
    expect(container.textContent).toContain('Test task');
    expect(container.textContent).toContain('test-exec');
  });

  it('shows join indicator only when dependsOn.length > 1', () => {
    const single = renderDagNode(makeNode({ dependsOn: ['a'] }));
    const multi = renderDagNode(makeNode({ dependsOn: ['a', 'b'] }));
    const c1 = document.createElement('div');
    const c2 = document.createElement('div');
    render(single, c1);
    render(multi, c2);
    expect(c1.textContent).not.toContain('∧');
    expect(c2.textContent).toContain('∧');
  });

  it('shows ∧ for ALL_OF and ∨ for ANY_OF', () => {
    const allOf = renderDagNode(makeNode({ dependsOn: ['a', 'b'], joinType: 'ALL_OF' }));
    const anyOf = renderDagNode(makeNode({ dependsOn: ['a', 'b'], joinType: 'ANY_OF' }));
    const c1 = document.createElement('div');
    const c2 = document.createElement('div');
    render(allOf, c1);
    render(anyOf, c2);
    expect(c1.textContent).toContain('∧');
    expect(c2.textContent).toContain('∨');
  });

  it('applies opacity 0.5 for Skipped decoration (⏭ icon)', () => {
    const dec = { badge: { icon: '⏭', color: '#9ca3af' } };
    const template = renderDagNode(makeNode(), dec);
    const c = document.createElement('div');
    render(template, c);
    const outer = c.firstElementChild as HTMLElement;
    expect(outer.style.opacity).toBe('0.5');
  });

  it('renders at full opacity with active decoration', () => {
    const dec = { badge: { icon: '→', color: '#3b82f6' } };
    const template = renderDagNode(makeNode(), dec);
    const c = document.createElement('div');
    render(template, c);
    const outer = c.firstElementChild as HTMLElement;
    expect(outer.style.opacity).toBe('1');
  });
});
