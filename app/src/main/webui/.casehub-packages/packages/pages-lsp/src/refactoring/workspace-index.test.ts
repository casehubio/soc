import { describe, it, expect } from 'vitest';
import { createWorkspaceIndex } from './workspace-index.js';
import { pageSymbolExtractor } from './page-symbols.js';

describe('WorkspaceSymbolIndex', () => {
  it('indexes symbols from a document and finds definitions', () => {
    const index = createWorkspaceIndex();
    const content = 'datasets:\n  - uuid: products\n';
    index.update('file:///a.page.yaml', content, pageSymbolExtractor);
    const defs = index.findDefinitions('products', 'dataset');
    expect(defs).toHaveLength(1);
    expect(defs[0]!.uri).toBe('file:///a.page.yaml');
  });

  it('finds references across multiple documents', () => {
    const index = createWorkspaceIndex();
    index.update('file:///a.page.yaml', 'datasets:\n  - uuid: products\n', pageSymbolExtractor);
    index.update('file:///b.page.yaml', [
      'pages:',
      '  - components:',
      '      - type: bar-chart',
      '        properties:',
      '          lookup:',
      '            uuid: products',
    ].join('\n'), pageSymbolExtractor);
    const refs = index.findReferences('products', 'dataset');
    expect(refs).toHaveLength(1);
    expect(refs[0]!.uri).toBe('file:///b.page.yaml');
  });

  it('finds symbol at position', () => {
    const index = createWorkspaceIndex();
    index.update('file:///a.page.yaml', 'datasets:\n  - uuid: products\n', pageSymbolExtractor);
    const sym = index.getSymbolAt('file:///a.page.yaml', 1, 12);
    expect(sym).toBeDefined();
    expect(sym!.name).toBe('products');
    expect(sym!.kind).toBe('dataset');
  });

  it('returns undefined for non-symbol position', () => {
    const index = createWorkspaceIndex();
    index.update('file:///a.page.yaml', 'datasets:\n  - uuid: products\n', pageSymbolExtractor);
    const sym = index.getSymbolAt('file:///a.page.yaml', 0, 0);
    expect(sym).toBeUndefined();
  });

  it('cross-file rename produces edits for all documents', () => {
    const index = createWorkspaceIndex();
    const contentA = 'datasets:\n  - uuid: products\n';
    const contentB = 'pages:\n  - components:\n      - type: bar-chart\n        properties:\n          lookup:\n            uuid: products\n';
    index.update('file:///a.page.yaml', contentA, pageSymbolExtractor);
    index.update('file:///b.page.yaml', contentB, pageSymbolExtractor);
    const contents = new Map([['file:///a.page.yaml', contentA], ['file:///b.page.yaml', contentB]]);
    const edit = index.crossFileRename('products', 'dataset', 'items', contents);
    expect(Object.keys(edit.changes)).toHaveLength(2);
    expect(edit.changes['file:///a.page.yaml']).toHaveLength(1);
    expect(edit.changes['file:///b.page.yaml']).toHaveLength(1);
  });

  it('removes document from index', () => {
    const index = createWorkspaceIndex();
    index.update('file:///a.page.yaml', 'datasets:\n  - uuid: products\n', pageSymbolExtractor);
    index.remove('file:///a.page.yaml');
    expect(index.findDefinitions('products', 'dataset')).toHaveLength(0);
  });

  it('re-indexes when document content changes', () => {
    const index = createWorkspaceIndex();
    index.update('file:///a.page.yaml', 'datasets:\n  - uuid: products\n', pageSymbolExtractor);
    index.update('file:///a.page.yaml', 'datasets:\n  - uuid: items\n', pageSymbolExtractor);
    expect(index.findDefinitions('products', 'dataset')).toHaveLength(0);
    expect(index.findDefinitions('items', 'dataset')).toHaveLength(1);
  });

  it('findAll returns both definitions and references', () => {
    const index = createWorkspaceIndex();
    const contentA = 'datasets:\n  - uuid: products\n';
    const contentB = 'pages:\n  - components:\n      - type: bar-chart\n        properties:\n          lookup:\n            uuid: products\n';
    index.update('file:///a.page.yaml', contentA, pageSymbolExtractor);
    index.update('file:///b.page.yaml', contentB, pageSymbolExtractor);
    const all = index.findAll('products', 'dataset');
    expect(all).toHaveLength(2);
    expect(all.filter(s => s.role === 'definition')).toHaveLength(1);
    expect(all.filter(s => s.role === 'reference')).toHaveLength(1);
  });
});
