import { describe, it, expect } from 'vitest';
import { applySelectionHighlight } from './selection-highlight.js';

interface TestEdge {
  id: string;
  source: string;
  target: string;
  className?: string;
  style?: Record<string, unknown>;
  [key: string]: unknown;
}

describe('applySelectionHighlight', () => {
  const edges: TestEdge[] = [
    { id: 'e1', source: 'agent:u1:alice', target: 'agent:u1:bob' },
    { id: 'e2', source: 'agent:u1:bob', target: 'agent:u1:carol' },
  ];

  it('highlights edges connected to selected node', () => {
    const result = applySelectionHighlight(edges, 'agent:u1:alice');
    expect(result[0]!.className).toContain('org-edge-highlighted');
    expect(result[1]!.style?.opacity).toBe(0.15);
  });

  it('restores all edges when no selection', () => {
    const result = applySelectionHighlight(edges, undefined);
    expect(result[0]!.className).toBeUndefined();
    expect(result[0]!.style?.opacity).toBeUndefined();
  });

  it('highlights edges on both sides of selected node', () => {
    const result = applySelectionHighlight(edges, 'agent:u1:bob');
    expect(result[0]!.className).toContain('org-edge-highlighted');
    expect(result[1]!.className).toContain('org-edge-highlighted');
  });

  it('dims all edges when selected node has no connections', () => {
    const result = applySelectionHighlight(edges, 'agent:u1:unknown');
    expect(result[0]!.style?.opacity).toBe(0.15);
    expect(result[1]!.style?.opacity).toBe(0.15);
  });
});
