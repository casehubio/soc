import { describe, it, expect, beforeEach } from 'vitest';
import { renderGraph, clearGraph } from './graph-renderer.js';
import type { SimNode, SimLink } from './types.js';

describe('renderGraph', () => {
  let svg: SVGSVGElement;
  let container: SVGGElement;

  beforeEach(() => {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    container = document.createElementNS('http://www.w3.org/2000/svg', 'g') as SVGGElement;
    svg.appendChild(container);
    document.body.appendChild(svg);
  });

  it('creates node groups for each SimNode', () => {
    const nodes: SimNode[] = [
      { id: 'a', label: 'A', status: 'RUNNING', domain: 'case', x: 100, y: 100 },
      { id: 'b', label: 'B', status: 'COMPLETED', domain: 'case', x: 200, y: 200 },
    ];
    renderGraph(container, nodes, [], {});
    const nodeGroups = container.querySelectorAll('.nodes g');
    expect(nodeGroups.length).toBe(2);
  });

  it('creates line elements for each SimLink', () => {
    const nodes: SimNode[] = [
      { id: 'a', label: 'A', status: 'RUNNING', domain: 'case', x: 100, y: 100 },
      { id: 'b', label: 'B', status: 'COMPLETED', domain: 'case', x: 200, y: 200 },
    ];
    const links: SimLink[] = [
      { id: 'e1', type: 'parent_child', source: nodes[0], target: nodes[1] },
    ];
    renderGraph(container, nodes, links, {});
    const lines = container.querySelectorAll('.edges line');
    expect(lines.length).toBe(1);
  });

  it('renders default rect and text for nodes without renderNode', () => {
    const nodes: SimNode[] = [
      { id: 'a', label: 'Hello', status: 'RUNNING', domain: 'case', x: 0, y: 0 },
    ];
    renderGraph(container, nodes, [], {});
    const rect = container.querySelector('.nodes rect');
    expect(rect).toBeTruthy();
    const text = container.querySelector('.nodes text');
    expect(text?.textContent).toBe('Hello');
  });

  it('uses renderNode callback when provided', () => {
    const nodes: SimNode[] = [
      { id: 'a', label: 'A', status: 'RUNNING', domain: 'case', x: 0, y: 0 },
    ];
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', '20');
    renderGraph(container, nodes, [], {
      renderNode: () => circle,
    });
    const found = container.querySelector('.nodes circle');
    expect(found).toBeTruthy();
  });

  it('adds title tooltip to nodes', () => {
    const nodes: SimNode[] = [
      { id: 'a', label: 'My Case', status: 'RUNNING', domain: 'case', x: 0, y: 0 },
    ];
    renderGraph(container, nodes, [], {});
    const title = container.querySelector('.nodes title');
    expect(title?.textContent).toContain('My Case');
    expect(title?.textContent).toContain('RUNNING');
  });
});

describe('clearGraph', () => {
  it('removes all children', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(container);
    document.body.appendChild(svg);

    const child = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    container.appendChild(child);
    expect(container.children.length).toBe(1);

    clearGraph(container);
    expect(container.children.length).toBe(0);
  });
});
