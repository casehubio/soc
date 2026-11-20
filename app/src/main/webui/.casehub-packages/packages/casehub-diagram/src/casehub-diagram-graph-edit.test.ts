import { describe, it, expect } from 'vitest';
import { addElement, removeElement } from '@casehubio/mosaic-graph-stencil-case';
import { toGraph } from '@casehubio/mosaic-graph-stencil-case';

const YAML = `dsl: "1.0.0"
namespace: test
name: test-case
version: "1.0.0"
spec:
  bindings:
    - name: testBinding
      capability: testCap
  workers:
    - name: testWorker
      capabilities:
        - testCap
  milestones:
    - name: testMilestone
      condition: '.result != null'
`;

describe('case _applyGraphEdit YAML mutations', () => {
  describe('addNode → addElement', () => {
    it('adds a worker element', () => {
      const result = addElement(YAML, 'worker');
      expect(result).toContain('testWorker');
      const { model } = toGraph(result);
      const workers = model.nodes.filter(n => n.type === 'worker');
      expect(workers.length).toBe(2);
    });

    it('adds a binding element', () => {
      const result = addElement(YAML, 'binding');
      const { model } = toGraph(result);
      const bindings = model.nodes.filter(n => n.type === 'binding');
      expect(bindings.length).toBe(2);
    });

    it('adds a milestone element', () => {
      const result = addElement(YAML, 'milestone');
      const { model } = toGraph(result);
      const milestones = model.nodes.filter(n => n.type === 'milestone');
      expect(milestones.length).toBe(2);
    });

    it('adds a goal element', () => {
      const result = addElement(YAML, 'goal');
      const { model } = toGraph(result);
      const goals = model.nodes.filter(n => n.type === 'goal');
      expect(goals.length).toBe(1);
    });
  });

  describe('removeNode → removeElement', () => {
    it('removes a worker by YAML path', () => {
      const { yamlPaths } = toGraph(YAML);
      const workerPath = yamlPaths.get('worker:testWorker');
      expect(workerPath).toBeDefined();
      const result = removeElement(YAML, workerPath!);
      expect(result).not.toContain('testWorker');
    });

    it('removes a binding by YAML path', () => {
      const { yamlPaths } = toGraph(YAML);
      const bindingPath = yamlPaths.get('binding:testBinding');
      expect(bindingPath).toBeDefined();
      const result = removeElement(YAML, bindingPath!);
      expect(result).not.toContain('testBinding');
    });
  });
});
