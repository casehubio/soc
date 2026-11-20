import { describe, it, expect } from 'vitest';
import { createSchemaRegistry, handleCompletion, createServerHandler } from '@casehubio/pages-lsp';
import { swfFormat } from '../src/formats/swf.js';

describe('SWF format', () => {
  it('detects .swf.yaml by extension', () => {
    const registry = createSchemaRegistry();
    registry.register(swfFormat);
    const detected = registry.detect('file:///app/flow.swf.yaml', '');
    expect(detected?.formatId).toBe('swf');
  });

  it('detects SWF from content (do: at root)', () => {
    const registry = createSchemaRegistry();
    registry.register(swfFormat);
    const content = 'document:\n  dsl: 1.0.0\ndo:\n  - step1:\n      call: http:get\n';
    const detected = registry.detect('file:///app/flow.yaml', content);
    expect(detected?.formatId).toBe('swf');
  });

  it('does not detect without do:', () => {
    const registry = createSchemaRegistry();
    registry.register(swfFormat);
    const content = 'document:\n  dsl: 1.0.0\nsteps:\n  - step1: {}\n';
    const detected = registry.detect('file:///app/flow.yaml', content);
    expect(detected).toBeUndefined();
  });

  it('extracts task key definitions', () => {
    const registry = createSchemaRegistry();
    registry.register(swfFormat);
    const handler = createServerHandler(registry);
    const content = [
      'do:',
      '  - fetchData:',
      '      call: http:get',
      '  - processData:',
      '      set:',
      '        result: done',
    ].join('\n');
    handler.onDidOpen('file:///flow.swf.yaml', content);
    const result = handler.onPrepareRename('file:///flow.swf.yaml', { line: 1, character: 6 });
    expect(result).not.toBeNull();
    expect(result!.placeholder).toBe('fetchData');
  });

  it('renames task key and then: references', () => {
    const registry = createSchemaRegistry();
    registry.register(swfFormat);
    const handler = createServerHandler(registry);
    const content = [
      'do:',
      '  - fetchData:',
      '      call: http:get',
      '  - processData:',
      '      set:',
      '        result: done',
      '      then: fetchData',
    ].join('\n');
    handler.onDidOpen('file:///flow.swf.yaml', content);
    const result = handler.onRename('file:///flow.swf.yaml', { line: 1, character: 6 }, 'getData');
    expect(result).not.toBeNull();
    const edits = result!.changes['file:///flow.swf.yaml']!;
    expect(edits.length).toBeGreaterThanOrEqual(2);
  });

  it('returns task body completions at do: array item level', () => {
    const registry = createSchemaRegistry();
    registry.register(swfFormat);
    const content = 'do:\n  ';
    const items = handleCompletion('file:///t.swf.yaml', content, { line: 1, character: 2 }, registry);
    const labels = items.map(i => i.label.replace(/^- /, ''));
    expect(labels).toContain('call');
    expect(labels).toContain('set');
    expect(labels).toContain('switch');
    expect(labels).toContain('raise');
  });

  it('completes task properties inside a named task', () => {
    const registry = createSchemaRegistry();
    registry.register(swfFormat);
    const content = 'do:\n  - fetchData:\n      ';
    const items = handleCompletion('file:///t.swf.yaml', content, { line: 2, character: 6 }, registry);
    const labels = items.map(i => i.label);
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.some(l => l.includes('call'))).toBe(true);
  });

  it('narrows to call-task properties when call: is sibling', () => {
    const registry = createSchemaRegistry();
    registry.register(swfFormat);
    const content = 'do:\n  - fetchData:\n      call: http\n      ';
    const items = handleCompletion('file:///t.swf.yaml', content, { line: 3, character: 6 }, registry);
    const labels = items.map(i => i.label);
    expect(labels).toContain('with');
    expect(labels).toContain('output');
    expect(labels).not.toContain('call');
    expect(labels).not.toContain('set');
    expect(labels).not.toContain('switch');
  });

  it('suggests enum values for call: field', () => {
    const registry = createSchemaRegistry();
    registry.register(swfFormat);
    const content = 'do:\n  - fetchData:\n      call: ';
    const items = handleCompletion('file:///t.swf.yaml', content, { line: 2, character: 12 }, registry);
    const labels = items.map(i => i.label);
    expect(labels).toContain('http');
    expect(labels).toContain('grpc');
    expect(labels).toContain('asyncapi');
    expect(labels).toContain('openapi');
  });

  it('does not treat flow directives as references', () => {
    const registry = createSchemaRegistry();
    registry.register(swfFormat);
    const handler = createServerHandler(registry);
    const content = [
      'do:',
      '  - step1:',
      '      call: http:get',
      '      then: continue',
    ].join('\n');
    handler.onDidOpen('file:///flow.swf.yaml', content);
    const refs = handler.onReferences('file:///flow.swf.yaml', { line: 1, character: 6 });
    const refNames = refs.map(() => 'ref');
    expect(refs).toHaveLength(1);
  });
});
