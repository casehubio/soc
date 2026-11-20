import { describe, it, expect } from 'vitest';
import { validateSelection, canAddToSelection, canRemoveFromSelection } from './selection-validator.js';
import { createGraph } from './graph.js';
import type { GraphNode, GraphEdge } from './model.js';

function node(id: string, type = 'step', parentId?: string): GraphNode {
  const base = { id, type, properties: {} };
  return parentId !== undefined ? { ...base, parentId } : base;
}

function edge(id: string, source: string, target: string, type = 'default'): GraphEdge {
  return { id, type, source, target };
}

describe('validateSelection', () => {
  describe('linear chains', () => {
    const model = createGraph(
      [node('A'), node('B'), node('C'), node('D')],
      [edge('e1', 'A', 'B'), edge('e2', 'B', 'C'), edge('e3', 'C', 'D')],
    );

    it('selects a contiguous middle segment {B,C}', () => {
      const result = validateSelection(new Set(['B', 'C']), model);
      expect(result.valid).toEqual(new Set(['B', 'C']));
      expect(result.invalid).toEqual(new Set());
      expect(result.boundaryInput?.id).toBe('e1');
      expect(result.boundaryOutput?.id).toBe('e3');
    });

    it('selects a single middle node {B}', () => {
      const result = validateSelection(new Set(['B']), model);
      expect(result.valid).toEqual(new Set(['B']));
      expect(result.invalid).toEqual(new Set());
      expect(result.boundaryInput?.id).toBe('e1');
      expect(result.boundaryOutput?.id).toBe('e2');
    });

    it('rejects terminal segment {B,C,D} — 1 in, 0 out', () => {
      const result = validateSelection(new Set(['B', 'C', 'D']), model);
      expect(result.valid).toEqual(new Set());
      expect(result.invalid).toEqual(new Set(['B', 'C', 'D']));
    });

    it('rejects non-contiguous {B,D} — gap at C creates 2 in, 2 out', () => {
      const result = validateSelection(new Set(['B', 'D']), model);
      expect(result.valid).toEqual(new Set());
      expect(result.invalid).toEqual(new Set(['B', 'D']));
    });
  });

  describe('boundary counting', () => {
    it('rejects selection with 2 outbound — branch A→B, A→C, select {A}', () => {
      const model = createGraph(
        [node('A'), node('B'), node('C')],
        [edge('e1', 'A', 'B'), edge('e2', 'A', 'C')],
      );
      const result = validateSelection(new Set(['A']), model);
      expect(result.valid).toEqual(new Set());
      expect(result.invalid).toEqual(new Set(['A']));
    });

    it('rejects selection with 2 inbound — B→D, C→D, select {D}', () => {
      const model = createGraph(
        [node('B'), node('C'), node('D')],
        [edge('e1', 'B', 'D'), edge('e2', 'C', 'D')],
      );
      const result = validateSelection(new Set(['D']), model);
      expect(result.valid).toEqual(new Set());
      expect(result.invalid).toEqual(new Set(['D']));
    });

    it('rejects diamond — A→B→D, A→C→D, select {B,C}', () => {
      const model = createGraph(
        [node('A'), node('B'), node('C'), node('D')],
        [edge('e1', 'A', 'B'), edge('e2', 'A', 'C'), edge('e3', 'B', 'D'), edge('e4', 'C', 'D')],
      );
      const result = validateSelection(new Set(['B', 'C']), model);
      expect(result.valid).toEqual(new Set());
      expect(result.invalid).toEqual(new Set(['B', 'C']));
    });

    it('rejects disconnected node — 0 in, 0 out', () => {
      const model = createGraph([node('X')], []);
      const result = validateSelection(new Set(['X']), model);
      expect(result.valid).toEqual(new Set());
      expect(result.invalid).toEqual(new Set(['X']));
    });

    it('returns empty result for empty candidate set', () => {
      const model = createGraph([node('A')], []);
      const result = validateSelection(new Set(), model);
      expect(result.valid).toEqual(new Set());
      expect(result.invalid).toEqual(new Set());
      expect(result.boundaryInput).toBeNull();
      expect(result.boundaryOutput).toBeNull();
    });

    it('rejects entire graph — 0 boundary edges', () => {
      const model = createGraph(
        [node('A'), node('B'), node('C')],
        [edge('e1', 'A', 'B'), edge('e2', 'B', 'C')],
      );
      const result = validateSelection(new Set(['A', 'B', 'C']), model);
      expect(result.valid).toEqual(new Set());
      expect(result.invalid).toEqual(new Set(['A', 'B', 'C']));
    });
  });

  describe('internal connectivity', () => {
    it('rejects disconnected groups that pass 1-in/1-out', () => {
      // X→A→B (chain 1), C→D→Y (chain 2), select {B,C}
      // Boundary: A→B (in), C→D (out) — 1-in/1-out passes
      // But B and C are not internally connected — must fail
      const model = createGraph(
        [node('X'), node('A'), node('B'), node('C'), node('D'), node('Y')],
        [edge('e1', 'X', 'A'), edge('e2', 'A', 'B'), edge('e3', 'C', 'D'), edge('e4', 'D', 'Y')],
      );
      const result = validateSelection(new Set(['B', 'C']), model);
      expect(result.valid).toEqual(new Set());
      expect(result.invalid).toEqual(new Set(['B', 'C']));
    });

    it('accepts internally connected chain', () => {
      // A→B→C→D, select {B,C} — B→C is internal
      const model = createGraph(
        [node('A'), node('B'), node('C'), node('D')],
        [edge('e1', 'A', 'B'), edge('e2', 'B', 'C'), edge('e3', 'C', 'D')],
      );
      const result = validateSelection(new Set(['B', 'C']), model);
      expect(result.valid).toEqual(new Set(['B', 'C']));
    });
  });

  describe('containment', () => {
    it('validates parent with 1-in/1-out', () => {
      const model = createGraph(
        [node('A'), node('P', 'container'), node('C'), node('Ch', 'step', 'P')],
        [edge('e1', 'A', 'P'), edge('e2', 'P', 'C')],
      );
      const result = validateSelection(new Set(['P']), model);
      expect(result.valid).toEqual(new Set(['P']));
      expect(result.boundaryInput?.id).toBe('e1');
      expect(result.boundaryOutput?.id).toBe('e2');
    });
  });

  describe('edge case — terminal node selection', () => {
    it('validates terminal segment with 1 in and 0 out (end of chain)', () => {
      // A→B→C, select {C} — 1 inbound (B→C), 0 outbound → fails 1-in/1-out
      const model = createGraph(
        [node('A'), node('B'), node('C')],
        [edge('e1', 'A', 'B'), edge('e2', 'B', 'C')],
      );
      const result = validateSelection(new Set(['C']), model);
      expect(result.valid).toEqual(new Set());
      expect(result.invalid).toEqual(new Set(['C']));
    });

    it('validates start node with 0 in and 1 out (start of chain)', () => {
      // A→B→C, select {A} — 0 inbound, 1 outbound → fails 1-in/1-out
      const model = createGraph(
        [node('A'), node('B'), node('C')],
        [edge('e1', 'A', 'B'), edge('e2', 'B', 'C')],
      );
      const result = validateSelection(new Set(['A']), model);
      expect(result.valid).toEqual(new Set());
      expect(result.invalid).toEqual(new Set(['A']));
    });
  });
});

describe('canAddToSelection', () => {
  // A→B→C→D→E — 5-node chain so we can extend segments in the middle
  const model = createGraph(
    [node('A'), node('B'), node('C'), node('D'), node('E')],
    [edge('e1', 'A', 'B'), edge('e2', 'B', 'C'), edge('e3', 'C', 'D'), edge('e4', 'D', 'E')],
  );

  it('allows adding adjacent node that extends the segment', () => {
    // {B,C} valid (in: A→B, out: C→D). Add D → {B,C,D} (in: A→B, out: D→E). Valid.
    const result = canAddToSelection('D', new Set(['B', 'C']), model);
    expect(result.valid).toEqual(new Set(['B', 'C', 'D']));
    expect(result.invalid).toEqual(new Set());
  });

  it('rejects adding node that breaks 1-in/1-out', () => {
    // Adding A to {B,C}: A has 0 inbound → 0 boundary in
    const result = canAddToSelection('A', new Set(['B', 'C']), model);
    expect(result.valid).toEqual(new Set());
    expect(result.invalid.size).toBeGreaterThan(0);
  });

  it('allows adding node between entry and exit', () => {
    // Adding C to {B}: {B,C} valid (in: A→B, out: C→D)
    const result = canAddToSelection('C', new Set(['B']), model);
    expect(result.valid).toEqual(new Set(['B', 'C']));
  });
});

describe('canRemoveFromSelection', () => {
  // A→B→C→D→E — 5-node chain
  const model = createGraph(
    [node('A'), node('B'), node('C'), node('D'), node('E')],
    [edge('e1', 'A', 'B'), edge('e2', 'B', 'C'), edge('e3', 'C', 'D'), edge('e4', 'D', 'E')],
  );

  it('allows removing end node from segment', () => {
    // {B,C,D} valid (in: A→B, out: D→E). Remove D → {B,C} (in: A→B, out: C→D). Valid.
    const result = canRemoveFromSelection('D', new Set(['B', 'C', 'D']), model);
    expect(result.valid).toEqual(new Set(['B', 'C']));
    expect(result.boundaryOutput?.id).toBe('e3');
  });

  it('rejects removing middle node — breaks connectivity', () => {
    // {B,C,D} valid. Remove C → {B,D} — gap, invalid.
    const result = canRemoveFromSelection('C', new Set(['B', 'C', 'D']), model);
    expect(result.valid).toEqual(new Set());
    expect(result.invalid.size).toBeGreaterThan(0);
  });

  it('removing last node returns empty valid set', () => {
    const result = canRemoveFromSelection('B', new Set(['B']), model);
    expect(result.valid).toEqual(new Set());
    expect(result.invalid).toEqual(new Set());
  });
});
