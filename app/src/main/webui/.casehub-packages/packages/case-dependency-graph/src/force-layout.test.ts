import { describe, it, expect, afterEach } from 'vitest';
import { createSimulation, stopSimulation } from './force-layout.js';
import type { SimNode, SimLink } from './types.js';

describe('createSimulation', () => {
  let sim: ReturnType<typeof createSimulation> | null = null;

  afterEach(() => {
    if (sim) { stopSimulation(sim); sim = null; }
  });

  it('creates a simulation with the given nodes', () => {
    const nodes: SimNode[] = [
      { id: 'a', label: 'A', status: 'RUNNING', domain: 'case' },
      { id: 'b', label: 'B', status: 'COMPLETED', domain: 'case' },
    ];
    const links: SimLink[] = [
      { id: 'a-parent_child-b', type: 'parent_child', source: nodes[0], target: nodes[1] },
    ];
    sim = createSimulation(nodes, links, 800, 600);
    expect(sim.nodes()).toHaveLength(2);
  });

  it('assigns positions to nodes after ticking', () => {
    const nodes: SimNode[] = [
      { id: 'a', label: 'A', status: 'RUNNING', domain: 'case' },
      { id: 'b', label: 'B', status: 'COMPLETED', domain: 'case' },
    ];
    sim = createSimulation(nodes, [], 800, 600);
    sim.tick(50);
    expect(nodes[0].x).toBeDefined();
    expect(nodes[0].y).toBeDefined();
  });
});

describe('stopSimulation', () => {
  it('stops without error', () => {
    const nodes: SimNode[] = [
      { id: 'a', label: 'A', status: 'RUNNING', domain: 'case' },
    ];
    const sim = createSimulation(nodes, [], 800, 600);
    expect(() => stopSimulation(sim)).not.toThrow();
  });
});
