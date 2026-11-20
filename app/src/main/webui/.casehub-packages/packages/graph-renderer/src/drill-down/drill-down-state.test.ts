import { describe, it, expect } from 'vitest';
import { DrillDownState } from './drill-down-state.js';
import type { DrillDownTarget } from './types.js';
import type { GraphModel } from '@casehubio/graph-core';

const MODEL_A = { nodes: [{ id: 'a' }], edges: [] } as unknown as GraphModel;
const MODEL_B = { nodes: [{ id: 'b' }], edges: [] } as unknown as GraphModel;
const MODEL_C = { nodes: [{ id: 'c' }], edges: [] } as unknown as GraphModel;

function makeTarget(name: string, model: GraphModel): DrillDownTarget {
  return { name, model };
}

const VP = { x: 0, y: 0, zoom: 1 };

describe('DrillDownState', () => {
  it('starts empty', () => {
    const state = new DrillDownState();
    expect(state.depth).toBe(0);
    expect(state.activeIndex).toBe(-1);
    expect(state.levels).toEqual([]);
  });

  it('push increases depth', () => {
    const state = new DrillDownState();
    state.push(makeTarget('Level 1', MODEL_A), 'node-1', VP, [], [], 0);
    expect(state.depth).toBe(1);
    expect(state.activeIndex).toBe(0);
    expect(state.levels[0]!.name).toBe('Level 1');
  });

  it('3-level deep push', () => {
    const state = new DrillDownState();
    state.push(makeTarget('L1', MODEL_A), 'n1', VP, [], [], 0);
    state.push(makeTarget('L2', MODEL_B), 'n2', VP, [], [], 1);
    state.push(makeTarget('L3', MODEL_C), 'n3', VP, [], [], 2);
    expect(state.depth).toBe(3);
    expect(state.levels).toHaveLength(3);
  });

  it('pop returns popped level and decreases depth', () => {
    const state = new DrillDownState();
    state.push(makeTarget('L1', MODEL_A), 'n1', VP, [], [], 0);
    state.push(makeTarget('L2', MODEL_B), 'n2', VP, [], [], 1);
    const popped = state.pop();
    expect(popped?.name).toBe('L2');
    expect(state.depth).toBe(1);
  });

  it('pop on empty returns undefined', () => {
    const state = new DrillDownState();
    expect(state.pop()).toBeUndefined();
  });

  it('navigateTo removes levels above target depth', () => {
    const state = new DrillDownState();
    state.push(makeTarget('L1', MODEL_A), 'n1', VP, [], [], 0);
    state.push(makeTarget('L2', MODEL_B), 'n2', VP, [], [], 1);
    state.push(makeTarget('L3', MODEL_C), 'n3', VP, [], [], 2);
    const removed = state.navigateTo(0);
    expect(removed).toHaveLength(2);
    expect(removed[0]!.name).toBe('L3');
    expect(removed[1]!.name).toBe('L2');
    expect(state.depth).toBe(1);
  });

  it('navigateTo(-1) pops to root', () => {
    const state = new DrillDownState();
    state.push(makeTarget('L1', MODEL_A), 'n1', VP, [], [], 0);
    state.push(makeTarget('L2', MODEL_B), 'n2', VP, [], [], 1);
    const removed = state.navigateTo(-1);
    expect(removed).toHaveLength(2);
    expect(state.depth).toBe(0);
    expect(state.activeIndex).toBe(-1);
  });

  it('resolveGeneration increments on push', () => {
    const state = new DrillDownState();
    const gen1 = state.resolveGeneration;
    state.push(makeTarget('L1', MODEL_A), 'n1', VP, [], [], 0);
    expect(state.resolveGeneration).toBeGreaterThan(gen1);
  });

  it('resolveGeneration increments on pop (stale resolve guard)', () => {
    const state = new DrillDownState();
    state.push(makeTarget('L1', MODEL_A), 'n1', VP, [], [], 0);
    const genAfterPush = state.resolveGeneration;
    state.pop();
    expect(state.resolveGeneration).toBeGreaterThan(genAfterPush);
  });

  it('resolveGeneration increments on navigateTo', () => {
    const state = new DrillDownState();
    state.push(makeTarget('L1', MODEL_A), 'n1', VP, [], [], 0);
    state.push(makeTarget('L2', MODEL_B), 'n2', VP, [], [], 1);
    const genBefore = state.resolveGeneration;
    state.navigateTo(0);
    expect(state.resolveGeneration).toBeGreaterThan(genBefore);
  });

  it('saved level retains viewport and layout', () => {
    const state = new DrillDownState();
    const viewport = { x: 10, y: 20, zoom: 1.5 };
    const nodes = [{ id: 'n1' }] as any[];
    const edges = [{ id: 'e1' }] as any[];
    state.push(makeTarget('L1', MODEL_A), 'n1', viewport, nodes, edges, 42);
    const level = state.levels[0]!;
    expect(level.viewport).toEqual(viewport);
    expect(level.layoutNodes).toBe(nodes);
    expect(level.layoutEdges).toBe(edges);
    expect(level.layoutGeneration).toBe(42);
  });

  it('preserves diagramType from target', () => {
    const state = new DrillDownState();
    state.push({ name: 'L1', model: MODEL_A, diagramType: 'swf' }, 'n1', VP, [], [], 0);
    expect(state.levels[0]!.diagramType).toBe('swf');
  });

  it('push saves the current model (not the target) for restoration on pop', () => {
    const ROOT = { nodes: [{ id: 'root' }], edges: [] } as unknown as GraphModel;
    const SUB = { nodes: [{ id: 'sub' }], edges: [] } as unknown as GraphModel;
    const state = new DrillDownState();

    state.push(makeTarget('Sub', SUB), 'root-node', VP, [], [], 0, ROOT);
    const saved = state.levels[0]!;
    expect(saved.model).toBe(ROOT);
    expect(saved.name).toBe('Sub');

    const popped = state.pop()!;
    expect(popped.model).toBe(ROOT);
  });

  it('round-trip: pop restores model that was active before push', () => {
    const ROOT = { nodes: [{ id: 'root' }], edges: [] } as unknown as GraphModel;
    const L1 = { nodes: [{ id: 'l1' }], edges: [] } as unknown as GraphModel;
    const L2 = { nodes: [{ id: 'l2' }], edges: [] } as unknown as GraphModel;
    const state = new DrillDownState();

    state.push(makeTarget('L1', L1), 'n1', VP, [], [], 0, ROOT);
    state.push(makeTarget('L2', L2), 'n2', VP, [], [], 1, L1);

    const popped2 = state.pop()!;
    expect(popped2.model).toBe(L1);

    const popped1 = state.pop()!;
    expect(popped1.model).toBe(ROOT);
  });
});
