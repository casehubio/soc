import { describe, it, expect } from 'vitest';
import { htnYamlToGraph } from './htn-yaml-adapter.js';

const YAML = `dsl: "1.0.0"
namespace: test
name: test-case
spec:
  decomposition:
    root:
      name: investigate-incident
      methods:
        - guardLabel: "High severity"
          guard: ".severity == 'high'"
          tasks:
            - name: triage
              capability: triage-assessment
            - name: escalate
              capability: escalation
        - guardLabel: "Low severity"
          guard: ".severity == 'low'"
          tasks:
            - name: triage
              capability: triage-assessment
            - name: auto-resolve
              capability: auto-resolution
`;

describe('htnYamlToGraph', () => {
  it('creates a compound root node', () => {
    const { model } = htnYamlToGraph(YAML);
    const root = model.nodes.find(n => n.type === 'htn-compound');
    expect(root).toBeDefined();
    expect(root!.properties['name']).toBe('investigate-incident');
  });

  it('creates method branch nodes', () => {
    const { model } = htnYamlToGraph(YAML);
    const methods = model.nodes.filter(n => n.type === 'htn-method');
    expect(methods).toHaveLength(2);
    expect(methods[0]!.properties['guardLabel']).toBe('High severity');
  });

  it('creates leaf task nodes', () => {
    const { model } = htnYamlToGraph(YAML);
    const leaves = model.nodes.filter(n => n.type === 'htn-leaf');
    expect(leaves).toHaveLength(4);
  });

  it('creates compound→method edges', () => {
    const { model } = htnYamlToGraph(YAML);
    const compoundMethodEdges = model.edges.filter(e => e.type === 'decomposition');
    expect(compoundMethodEdges).toHaveLength(2);
  });

  it('creates method→task edges', () => {
    const { model } = htnYamlToGraph(YAML);
    const methodTaskEdges = model.edges.filter(e => e.type === 'contains');
    expect(methodTaskEdges).toHaveLength(4);
  });

  it('provides yamlPaths for all nodes', () => {
    const { yamlPaths } = htnYamlToGraph(YAML);
    expect(yamlPaths.size).toBeGreaterThan(0);
  });

  it('handles nested compound tasks', () => {
    const nestedYaml = `dsl: "1.0.0"
namespace: test
name: nested
spec:
  decomposition:
    root:
      name: top
      methods:
        - guard: "true"
          tasks:
            - name: sub-compound
              methods:
                - guard: "true"
                  tasks:
                    - name: leaf
                      capability: cap1
`;
    const { model } = htnYamlToGraph(nestedYaml);
    const compounds = model.nodes.filter(n => n.type === 'htn-compound');
    expect(compounds).toHaveLength(2);
    const leaves = model.nodes.filter(n => n.type === 'htn-leaf');
    expect(leaves).toHaveLength(1);
  });

  it('returns empty model when no decomposition', () => {
    const { model } = htnYamlToGraph('dsl: "1.0.0"\nspec:\n  bindings: []');
    expect(model.nodes).toHaveLength(0);
  });
});
