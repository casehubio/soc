import { describe, it, expect } from 'vitest';
import { computeMinimalChanges } from './diff-patch.js';

describe('computeMinimalChanges', () => {
  it('returns empty array for identical strings', () => {
    expect(computeMinimalChanges('abc', 'abc')).toEqual([]);
  });

  it('replaces changed middle region', () => {
    const before = 'line1\nline2\nline3\n';
    const after = 'line1\nchanged\nline3\n';
    const changes = computeMinimalChanges(before, after);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ from: 6, to: 11, insert: 'changed' });
  });

  it('handles appended lines', () => {
    const before = 'line1\n';
    const after = 'line1\nline2\n';
    const changes = computeMinimalChanges(before, after);
    expect(changes).toHaveLength(1);
  });

  it('handles full replacement', () => {
    const changes = computeMinimalChanges('old', 'new');
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ from: 0, to: 3, insert: 'new' });
  });

  it('handles empty before string', () => {
    const changes = computeMinimalChanges('', 'new content');
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ from: 0, to: 0, insert: 'new content' });
  });

  it('handles removed lines', () => {
    const before = 'line1\nline2\nline3\n';
    const after = 'line1\nline3\n';
    const changes = computeMinimalChanges(before, after);
    expect(changes).toHaveLength(1);
    const c = changes[0] as { from: number; to: number; insert: string };
    const applied = before.substring(0, c.from) + c.insert + before.substring(c.to);
    expect(applied).toBe(after);
  });
});
