import { describe, it, expect } from 'vitest';
import { computeNewlineIndent, computeBackspaceIndent } from './yaml-indent.js';

describe('computeNewlineIndent', () => {
  it('maintains indent for plain lines', () => {
    expect(computeNewlineIndent('    foo: bar', 2)).toBe('    ');
  });

  it('increases indent after colon-terminated line', () => {
    expect(computeNewlineIndent('  components:', 2)).toBe('    ');
  });

  it('increases indent after root colon', () => {
    expect(computeNewlineIndent('pages:', 2)).toBe('  ');
  });

  it('indents to key column after dash-prefixed key: value', () => {
    expect(computeNewlineIndent('    - type: metric', 2)).toBe('      ');
  });

  it('increases indent after dash-prefixed colon-only', () => {
    expect(computeNewlineIndent('    - properties:', 2)).toBe('        ');
  });

  it('indents to key column after dash-prefixed key: value (deep)', () => {
    expect(computeNewlineIndent('          - type: metric', 2)).toBe('            ');
  });

  it('stays at dash level after bare dash value (no key:value)', () => {
    expect(computeNewlineIndent('    - column', 2)).toBe('    ');
  });

  it('stays at dash level after bare dash value (deep)', () => {
    expect(computeNewlineIndent('          - item', 2)).toBe('          ');
  });

  it('returns empty string for unindented non-colon line', () => {
    expect(computeNewlineIndent('foo: bar', 2)).toBe('');
  });

  it('handles empty line', () => {
    expect(computeNewlineIndent('', 2)).toBe('');
  });

  it('handles whitespace-only line', () => {
    expect(computeNewlineIndent('    ', 2)).toBe('    ');
  });
});

describe('computeBackspaceIndent', () => {
  it('returns null when cursor is at column 0', () => {
    expect(computeBackspaceIndent('  foo', 0, 2)).toBeNull();
  });

  it('returns null when non-whitespace before cursor', () => {
    expect(computeBackspaceIndent('  foo', 5, 2)).toBeNull();
  });

  it('jumps from 4 spaces to 2', () => {
    expect(computeBackspaceIndent('    ', 4, 2)).toBe(2);
  });

  it('jumps from 2 spaces to 0', () => {
    expect(computeBackspaceIndent('  ', 2, 2)).toBe(0);
  });

  it('jumps from 6 spaces to 4', () => {
    expect(computeBackspaceIndent('      ', 6, 2)).toBe(4);
  });

  it('jumps from 3 spaces to 2 (aligns to tab stop)', () => {
    expect(computeBackspaceIndent('   ', 3, 2)).toBe(2);
  });

  it('jumps from 5 spaces to 4', () => {
    expect(computeBackspaceIndent('     ', 5, 2)).toBe(4);
  });

  it('jumps from 1 space to 0', () => {
    expect(computeBackspaceIndent(' ', 1, 2)).toBe(0);
  });
});
