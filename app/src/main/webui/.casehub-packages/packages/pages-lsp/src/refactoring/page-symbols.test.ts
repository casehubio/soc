import { describe, it, expect } from 'vitest';
import { pageSymbolExtractor } from './page-symbols.js';

describe('pageSymbolExtractor', () => {
  it('extracts dataset UUID definitions', () => {
    const content = [
      'datasets:',
      '  - uuid: products',
      '    url: http://example.com',
    ].join('\n');
    const symbols = pageSymbolExtractor(content);
    const defs = symbols.filter(s => s.role === 'definition' && s.kind === 'dataset');
    expect(defs).toHaveLength(1);
    expect(defs[0]!.name).toBe('products');
    expect(defs[0]!.range.start.line).toBe(1);
  });

  it('extracts page name definitions', () => {
    const content = [
      'pages:',
      '  - name: index',
      '    components: []',
      '  - name: settings',
      '    components: []',
    ].join('\n');
    const symbols = pageSymbolExtractor(content);
    const defs = symbols.filter(s => s.role === 'definition' && s.kind === 'page');
    expect(defs).toHaveLength(2);
    expect(defs[0]!.name).toBe('index');
    expect(defs[1]!.name).toBe('settings');
  });

  it('extracts dataset UUID references from lookup.uuid', () => {
    const content = [
      'datasets:',
      '  - uuid: products',
      'pages:',
      '  - components:',
      '      - type: bar-chart',
      '        properties:',
      '          lookup:',
      '            uuid: products',
    ].join('\n');
    const symbols = pageSymbolExtractor(content);
    const refs = symbols.filter(s => s.role === 'reference' && s.kind === 'dataset');
    expect(refs).toHaveLength(1);
    expect(refs[0]!.name).toBe('products');
  });

  it('extracts page references from lazy-page components', () => {
    const content = [
      'pages:',
      '  - name: index',
      '    components:',
      '      - type: lazy-page',
      '        properties:',
      '          page: settings',
    ].join('\n');
    const symbols = pageSymbolExtractor(content);
    const refs = symbols.filter(s => s.role === 'reference' && s.kind === 'page');
    expect(refs).toHaveLength(1);
    expect(refs[0]!.name).toBe('settings');
  });

  it('extracts page references from navTree items', () => {
    const content = [
      'navTree:',
      '  root_items:',
      '    - page: dashboard',
      '      children:',
      '        - page: analytics',
    ].join('\n');
    const symbols = pageSymbolExtractor(content);
    const refs = symbols.filter(s => s.role === 'reference' && s.kind === 'page');
    expect(refs).toHaveLength(2);
    expect(refs.map(r => r.name)).toEqual(['dashboard', 'analytics']);
  });

  it('returns empty for non-Page YAML', () => {
    const content = 'organization:\n  name: Acme\n';
    const symbols = pageSymbolExtractor(content);
    expect(symbols).toHaveLength(0);
  });

  it('returns empty for empty content', () => {
    expect(pageSymbolExtractor('')).toHaveLength(0);
  });

  it('handles multiple dataset references across components', () => {
    const content = [
      'datasets:',
      '  - uuid: products',
      '  - uuid: sales',
      'pages:',
      '  - components:',
      '      - type: bar-chart',
      '        properties:',
      '          lookup:',
      '            uuid: products',
      '      - type: data-table',
      '        properties:',
      '          lookup:',
      '            uuid: sales',
      '      - type: metric',
      '        properties:',
      '          lookup:',
      '            uuid: products',
    ].join('\n');
    const symbols = pageSymbolExtractor(content);
    const defs = symbols.filter(s => s.role === 'definition');
    const refs = symbols.filter(s => s.role === 'reference');
    expect(defs).toHaveLength(2);
    expect(refs).toHaveLength(3);
    expect(refs.filter(r => r.name === 'products')).toHaveLength(2);
    expect(refs.filter(r => r.name === 'sales')).toHaveLength(1);
  });

  it('extracts dataset references via dataSetUuid alias', () => {
    const content = [
      'pages:',
      '  - components:',
      '      - type: bar-chart',
      '        properties:',
      '          lookup:',
      '            dataSetUuid: products',
    ].join('\n');
    const symbols = pageSymbolExtractor(content);
    const refs = symbols.filter(s => s.role === 'reference' && s.kind === 'dataset');
    expect(refs).toHaveLength(1);
    expect(refs[0]!.name).toBe('products');
  });

  it('extracts references nested inside rows and columns', () => {
    const content = [
      'datasets:',
      '  - uuid: items',
      'pages:',
      '  - rows:',
      '      - columns:',
      '          - span: 6',
      '            components:',
      '              - type: bar-chart',
      '                properties:',
      '                  lookup:',
      '                    uuid: items',
    ].join('\n');
    const symbols = pageSymbolExtractor(content);
    const refs = symbols.filter(s => s.role === 'reference' && s.kind === 'dataset');
    expect(refs).toHaveLength(1);
    expect(refs[0]!.name).toBe('items');
  });
});
