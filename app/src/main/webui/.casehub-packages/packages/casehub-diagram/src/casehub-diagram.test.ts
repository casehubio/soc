import { describe, it, expect } from 'vitest';
import { toGraph, applyPropertyEdit, addElement, removeElement, switchBindingTarget } from '@casehubio/mosaic-graph-stencil-case';
import { toReactFlowGraph } from '@casehubio/graph-renderer';
import { InMemoryBackend } from '@casehubio/graph-core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EXAMPLE_PATH = resolve(import.meta.dirname, '../../../packages/graph-stencil-case/src/test-fixtures/document-processing.yaml');
const EXAMPLE_YAML = readFileSync(EXAMPLE_PATH, 'utf-8');

describe('casehub-diagram integration', () => {
  it('end-to-end: YAML → GraphModel → React Flow nodes', () => {
    const { model } = toGraph(EXAMPLE_YAML);
    const { nodes, edges } = toReactFlowGraph(model);

    expect(nodes.length).toBeGreaterThan(0);
    expect(edges.length).toBeGreaterThan(0);

    const workerNodes = nodes.filter(n => n.type === 'worker');
    expect(workerNodes).toHaveLength(5);

    const bindingNodes = nodes.filter(n => n.type === 'binding');
    expect(bindingNodes).toHaveLength(6);

    expect(edges.every(e => nodes.some(n => n.id === e.source))).toBe(true);
    expect(edges.every(e => nodes.some(n => n.id === e.target))).toBe(true);
  });

  it('milestones and goals are present in output', () => {
    const { model } = toGraph(EXAMPLE_YAML);
    const { nodes } = toReactFlowGraph(model);

    const milestones = nodes.filter(n => n.type === 'milestone');
    expect(milestones).toHaveLength(3);

    const goals = nodes.filter(n => n.type === 'goal');
    expect(goals).toHaveLength(1);
  });

  it('all edges reference valid nodes', () => {
    const { model } = toGraph(EXAMPLE_YAML);
    const { nodes, edges } = toReactFlowGraph(model);
    const nodeIds = new Set(nodes.map(n => n.id));

    for (const edge of edges) {
      expect(nodeIds.has(edge.source), `dangling source: ${edge.source}`).toBe(true);
      expect(nodeIds.has(edge.target), `dangling target: ${edge.target}`).toBe(true);
    }
  });
});

describe('edit cycle', () => {
  it('applyPropertyEdit updates YAML and re-parse produces updated model', () => {
    const result = toGraph(EXAMPLE_YAML);
    const bindingPath = result.yamlPaths.get('binding:extract-text');
    expect(bindingPath).toBeDefined();

    const newYaml = applyPropertyEdit(
      EXAMPLE_YAML,
      [...bindingPath!],
      ['when'],
      '.changed == true',
    );
    const updated = toGraph(newYaml);
    const binding = updated.model.nodes.find(n => n.id === 'binding:extract-text');
    expect(binding!.properties['when']).toBe('.changed == true');
  });

  it('skipping re-layout preserves node positions', () => {
    const result = toGraph(EXAMPLE_YAML);
    const { nodes } = toReactFlowGraph(result.model);
    const positioned = nodes.map(n => ({ ...n, position: { x: 100, y: 200 } }));

    const newYaml = applyPropertyEdit(
      EXAMPLE_YAML,
      [...result.yamlPaths.get('binding:extract-text')!],
      ['when'],
      '.changed',
    );
    const updated = toGraph(newYaml);
    const { nodes: newNodes } = toReactFlowGraph(updated.model);

    const merged = newNodes.map(n => {
      const existing = positioned.find(p => p.id === n.id);
      return existing ? { ...n, position: existing.position } : n;
    });

    const binding = merged.find(n => n.id === 'binding:extract-text')!;
    expect(binding.position).toEqual({ x: 100, y: 200 });
    expect(binding.data['when']).toBe('.changed');
  });
});

const SIMPLE_YAML = `dsl: "1.0.0"
namespace: test
name: sample
version: "1.0.0"
spec:
  bindings:
    - name: b1
      capability: cap1
  workers:
    - name: w1
      capabilities:
        - cap1
`;

describe('structural editing round-trip', () => {
  it('add binding → toGraph → new node exists', () => {
    const yaml = addElement(SIMPLE_YAML, 'binding');
    const { model } = toGraph(yaml);
    expect(model.nodes.some(n => n.id === 'binding:binding-1')).toBe(true);
  });

  it('remove worker → toGraph → binding becomes external', () => {
    const yaml = removeElement(SIMPLE_YAML, ['spec', 'workers', 0]);
    const { model } = toGraph(yaml);
    expect(model.nodes.some(n => n.type === 'external')).toBe(true);
  });

  it('switchBindingTarget → toGraph → topology changes', () => {
    const yaml = switchBindingTarget(SIMPLE_YAML, ['spec', 'bindings', 0], 'subCase');
    const { model } = toGraph(yaml);
    const capEdges = model.edges.filter(e => e.type === 'capability-dispatch' && e.source === 'binding:b1');
    expect(capEdges).toHaveLength(0);
    expect(model.nodes.some(n => n.type === 'subcase')).toBe(true);
  });

  it('add then remove round-trips back to equivalent graph', () => {
    const added = addElement(SIMPLE_YAML, 'milestone');
    const { model: withMilestone } = toGraph(added);
    expect(withMilestone.nodes.some(n => n.id === 'milestone:milestone-1')).toBe(true);

    const removed = removeElement(added, ['spec', 'milestones', 0]);
    const { model: withoutMilestone } = toGraph(removed);
    expect(withoutMilestone.nodes.some(n => n.id === 'milestone:milestone-1')).toBe(false);
  });
});

describe('persistence round-trip', () => {
  it('write then read returns the same yaml', async () => {
    const backend = new InMemoryBackend();
    const writeResult = await backend.write('test.yaml', SIMPLE_YAML, '');
    expect(writeResult.status).toBe('ok');
    const readResult = await backend.read('test.yaml');
    expect(readResult.status).toBe('ok');
    if (readResult.status === 'ok') {
      expect(readResult.yaml).toBe(SIMPLE_YAML);
    }
  });

  it('write with stale version returns conflict', async () => {
    const backend = new InMemoryBackend();
    await backend.write('test.yaml', SIMPLE_YAML, '');
    await backend.write('test.yaml', 'changed', '1');
    const result = await backend.write('test.yaml', 'stale', '1');
    expect(result.status).toBe('conflict');
  });

  it('dirty tracking: current !== saved after edit', () => {
    const saved = SIMPLE_YAML;
    const current = addElement(SIMPLE_YAML, 'binding');
    expect(current !== saved).toBe(true);
  });

  it('dirty tracking: undo past save point marks dirty', () => {
    const edited = addElement(SIMPLE_YAML, 'binding');
    const savedYaml = edited;
    const afterUndo = SIMPLE_YAML;
    expect(afterUndo !== savedYaml).toBe(true);
  });
});

describe('getNodeProperties contract', () => {
  it('model lookup returns properties for a known node', () => {
    const result = toGraph(SIMPLE_YAML);
    const node = result.model.nodes.find(n => n.id === 'worker:w1');
    expect(node).toBeDefined();
    const props = { ...node!.properties };
    expect(props.name).toBe('w1');
  });

  it('model lookup returns undefined for an unknown node', () => {
    const result = toGraph(SIMPLE_YAML);
    const node = result.model.nodes.find(n => n.id === 'worker:nonexistent');
    expect(node).toBeUndefined();
  });

  it('spread copy is not the same reference as the original', () => {
    const result = toGraph(SIMPLE_YAML);
    const node = result.model.nodes.find(n => n.id === 'worker:w1')!;
    const props1 = { ...node.properties };
    const props2 = { ...node.properties };
    expect(props1).not.toBe(props2);
    expect(props1).toEqual(props2);
  });
});
