import { describe, it, expect } from 'vitest';
import { prepareRename, computeRename } from './rename.js';
import { pageSymbolExtractor } from './page-symbols.js';

describe('prepareRename', () => {
  it('returns range and placeholder for dataset definition', () => {
    const content = [
      'datasets:',
      '  - uuid: products',
    ].join('\n');
    const result = prepareRename(content, { line: 1, character: 12 }, pageSymbolExtractor);
    expect(result).not.toBeNull();
    expect(result!.placeholder).toBe('products');
    expect(result!.range.start.line).toBe(1);
  });

  it('returns null for non-symbol position', () => {
    const content = [
      'datasets:',
      '  - uuid: products',
      '    url: http://example.com',
    ].join('\n');
    const result = prepareRename(content, { line: 2, character: 6 }, pageSymbolExtractor);
    expect(result).toBeNull();
  });

  it('returns range for dataset reference position', () => {
    const content = [
      'pages:',
      '  - components:',
      '      - type: bar-chart',
      '        properties:',
      '          lookup:',
      '            uuid: products',
    ].join('\n');
    const result = prepareRename(content, { line: 5, character: 20 }, pageSymbolExtractor);
    expect(result).not.toBeNull();
    expect(result!.placeholder).toBe('products');
  });
});

describe('computeRename', () => {
  it('renames dataset definition and all references', () => {
    const content = [
      'datasets:',
      '  - uuid: products',
      'pages:',
      '  - components:',
      '      - type: bar-chart',
      '        properties:',
      '          lookup:',
      '            uuid: products',
      '      - type: data-table',
      '        properties:',
      '          lookup:',
      '            uuid: products',
    ].join('\n');
    const edits = computeRename(content, { line: 1, character: 12 }, 'items', pageSymbolExtractor);
    expect(edits).not.toBeNull();
    expect(edits).toHaveLength(3);
    for (const edit of edits!) {
      expect(edit.newText).toBe('items');
    }
  });

  it('renames page name and lazy-page references', () => {
    const content = [
      'pages:',
      '  - name: settings',
      '    components: []',
      '  - name: index',
      '    components:',
      '      - type: lazy-page',
      '        properties:',
      '          page: settings',
    ].join('\n');
    const edits = computeRename(content, { line: 1, character: 12 }, 'preferences', pageSymbolExtractor);
    expect(edits).not.toBeNull();
    expect(edits).toHaveLength(2);
    for (const edit of edits!) {
      expect(edit.newText).toBe('preferences');
    }
  });

  it('returns null when cursor is not on a symbol', () => {
    const content = 'datasets:\n  - uuid: products\n    url: http://x.com\n';
    const edits = computeRename(content, { line: 2, character: 6 }, 'newname', pageSymbolExtractor);
    expect(edits).toBeNull();
  });

  it('preserves double-quoted values', () => {
    const content = [
      'datasets:',
      '  - uuid: "my dataset"',
      'pages:',
      '  - components:',
      '      - type: bar-chart',
      '        properties:',
      '          lookup:',
      '            uuid: "my dataset"',
    ].join('\n');
    const edits = computeRename(content, { line: 1, character: 14 }, 'new dataset', pageSymbolExtractor);
    expect(edits).not.toBeNull();
    expect(edits).toHaveLength(2);
    expect(edits![0]!.newText).toBe('"new dataset"');
    expect(edits![1]!.newText).toBe('"new dataset"');
  });

  it('only renames symbols with matching kind', () => {
    const content = [
      'datasets:',
      '  - uuid: index',
      'pages:',
      '  - name: index',
      '    components: []',
    ].join('\n');
    const edits = computeRename(content, { line: 1, character: 12 }, 'data', pageSymbolExtractor);
    expect(edits).not.toBeNull();
    expect(edits).toHaveLength(1);
    expect(edits![0]!.newText).toBe('data');
  });
});
