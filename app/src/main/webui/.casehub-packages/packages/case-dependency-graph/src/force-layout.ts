import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import type { Simulation } from 'd3-force';
import type { SimNode, SimLink } from './types.js';

export function createSimulation(
  nodes: SimNode[],
  links: SimLink[],
  width: number,
  height: number,
): Simulation<SimNode, SimLink> {
  const pad = 80;
  return forceSimulation(nodes)
    .force('link', forceLink<SimNode, SimLink>(links).id(d => d.id).distance(150))
    .force('charge', forceManyBody().strength(-200))
    .force('center', forceCenter(width / 2, height / 2))
    .force('collision', forceCollide().radius(70))
    .force('bounds', () => {
      for (const d of nodes) {
        d.x = Math.max(pad, Math.min(width - pad, d.x ?? width / 2));
        d.y = Math.max(pad, Math.min(height - pad, d.y ?? height / 2));
      }
    });
}

export function stopSimulation(sim: Simulation<SimNode, SimLink>): void {
  sim.stop();
}
