import { describe, it, expect } from 'vitest';
import { createSchemaRegistry, createServerHandler, handleCompletion } from '@casehubio/pages-lsp';
import { caseDefinitionFormat } from '../src/formats/case-definition.js';
import { swfFormat } from '../src/formats/swf.js';
import { htnFormat } from '../src/formats/htn.js';
import { orgFormat } from '../src/formats/org.js';

function createDomainRegistry() {
  const registry = createSchemaRegistry();
  registry.register(caseDefinitionFormat);
  registry.register(swfFormat);
  registry.register(htnFormat);
  registry.register(orgFormat);
  return registry;
}

describe('multi-format integration', () => {
  it('detects all four domain formats by convention extension', () => {
    const registry = createDomainRegistry();
    expect(registry.detect('file:///a.case.yaml', '')?.formatId).toBe('case-definition');
    expect(registry.detect('file:///a.swf.yaml', '')?.formatId).toBe('swf');
    expect(registry.detect('file:///a.htn.yaml', '')?.formatId).toBe('htn');
    expect(registry.detect('file:///a.org.yaml', '')?.formatId).toBe('org');
  });

  it('detects formats by content for plain .yaml files', () => {
    const registry = createDomainRegistry();
    expect(registry.detect('file:///a.yaml', 'organization:\n  units: []\n')?.formatId).toBe('org');
    expect(registry.detect('file:///a.yaml', 'do:\n  - step1:\n      call: http:get\n')?.formatId).toBe('swf');
    expect(registry.detect('file:///a.yaml', 'dsl: x\nspec:\n  bindings: []\n')?.formatId).toBe('case-definition');
    expect(registry.detect('file:///a.yaml', 'dsl: x\nspec:\n  decomposition:\n    root:\n      name: main\n')?.formatId).toBe('htn');
  });

  it('returns undefined for unknown YAML', () => {
    const registry = createDomainRegistry();
    expect(registry.detect('file:///a.yaml', 'foo: bar\n')).toBeUndefined();
  });

  it('detection priority: org before swf (org has unique root key)', () => {
    const registry = createDomainRegistry();
    const content = 'organization:\n  units: []\n  relationships: []\n';
    expect(registry.detect('file:///a.yaml', content)?.formatId).toBe('org');
  });

  it('distinguishes case-definition from htn by spec children', () => {
    const registry = createDomainRegistry();
    const caseContent = 'dsl: x\nspec:\n  bindings: []\n';
    const htnContent = 'dsl: x\nspec:\n  decomposition:\n    root:\n      name: main\n';
    expect(registry.detect('file:///a.yaml', caseContent)?.formatId).toBe('case-definition');
    expect(registry.detect('file:///a.yaml', htnContent)?.formatId).toBe('htn');
  });

  it('handler works with all domain formats in one server', () => {
    const registry = createDomainRegistry();
    const handler = createServerHandler(registry);

    handler.onDidOpen('file:///b.case.yaml', [
      'dsl: casehub/case',
      'spec:',
      '  capabilities:',
      '    - name: review',
      '  bindings:',
      '    - name: b1',
      '      capability: review',
    ].join('\n'));
    handler.onDidOpen('file:///c.swf.yaml', 'do:\n  - fetchData:\n      call: http:get\n');
    handler.onDidOpen('file:///d.htn.yaml', 'dsl: casehub/htn\nspec:\n  decomposition:\n    root:\n      name: main\n');
    handler.onDidOpen('file:///e.org.yaml', [
      'organization:',
      '  units:',
      '    - unitId: eng',
      '      name: Engineering',
      '      tenancyId: default',
      '      members: []',
      '      capabilities: []',
      '      goals: []',
      '      constraints: []',
      '  relationships: []',
    ].join('\n'));

    const caseCompletions = handler.onCompletion('file:///b.case.yaml', { line: 2, character: 2 });
    expect(caseCompletions.length).toBeGreaterThan(0);

    const swfPrepare = handler.onPrepareRename('file:///c.swf.yaml', { line: 1, character: 6 });
    expect(swfPrepare).not.toBeNull();
    expect(swfPrepare!.placeholder).toBe('fetchData');

    const orgPrepare = handler.onPrepareRename('file:///e.org.yaml', { line: 2, character: 14 });
    expect(orgPrepare).not.toBeNull();
    expect(orgPrepare!.placeholder).toBe('eng');
  });

  it('cross-file rename stays within same format', () => {
    const registry = createDomainRegistry();
    const handler = createServerHandler(registry);

    handler.onDidOpen('file:///def.case.yaml', [
      'dsl: casehub/case',
      'spec:',
      '  capabilities:',
      '    - name: review',
    ].join('\n'));
    handler.onDidOpen('file:///use.case.yaml', [
      'dsl: casehub/case',
      'spec:',
      '  bindings:',
      '    - name: b1',
      '      capability: review',
    ].join('\n'));
    handler.onDidOpen('file:///flow.swf.yaml', 'do:\n  - review:\n      call: http:get\n');

    const result = handler.onRename('file:///def.case.yaml', { line: 3, character: 12 }, 'audit');
    expect(result).not.toBeNull();
    expect(Object.keys(result!.changes)).toHaveLength(2);
    expect(result!.changes['file:///def.case.yaml']).toBeDefined();
    expect(result!.changes['file:///use.case.yaml']).toBeDefined();
    expect(result!.changes['file:///flow.swf.yaml']).toBeUndefined();
  });
});
