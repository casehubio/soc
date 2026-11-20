import { describe, it, expect } from 'vitest';
import { createSchemaRegistry, handleCompletion, computeDiagnostics } from '@casehubio/pages-lsp';
import { htnFormat } from '../src/formats/htn.js';

describe('HTN format', () => {
  it('detects .htn.yaml by extension', () => {
    const registry = createSchemaRegistry();
    registry.register(htnFormat);
    const detected = registry.detect('file:///app/plan.htn.yaml', '');
    expect(detected?.formatId).toBe('htn');
  });

  it('detects HTN from content (dsl + spec.decomposition)', () => {
    const registry = createSchemaRegistry();
    registry.register(htnFormat);
    const content = 'dsl: casehub/htn\nnamespace: test\nname: plan\nspec:\n  decomposition:\n    root:\n      name: main\n';
    const detected = registry.detect('file:///app/plan.yaml', content);
    expect(detected?.formatId).toBe('htn');
  });

  it('does not detect without spec.decomposition', () => {
    const registry = createSchemaRegistry();
    registry.register(htnFormat);
    const content = 'dsl: casehub/htn\nnamespace: test\nname: plan\nspec:\n  bindings: []\n';
    const detected = registry.detect('file:///app/plan.yaml', content);
    expect(detected).toBeUndefined();
  });

  it('provides completion at spec level', () => {
    const registry = createSchemaRegistry();
    registry.register(htnFormat);
    const content = 'dsl: casehub/htn\nnamespace: test\nname: plan\nspec:\n  ';
    const items = handleCompletion('file:///plan.htn.yaml', content, { line: 4, character: 2 }, registry);
    const labels = items.map(i => i.label);
    expect(labels).toContain('decomposition');
  });

  it('produces no syntax errors for valid HTN', () => {
    const registry = createSchemaRegistry();
    registry.register(htnFormat);
    const content = [
      'dsl: casehub/htn',
      'namespace: test',
      'name: plan',
      'spec:',
      '  decomposition:',
      '    root:',
      '      name: main',
      '      methods:',
      '        - guard: ".severity == \'high\'"',
      '          strategy: ordered',
      '          tasks:',
      '            - name: leaf1',
      '              capability: handle',
    ].join('\n');
    const diags = computeDiagnostics('file:///plan.htn.yaml', content, registry);
    const syntaxErrors = diags.filter(d => d.source === 'casehub-yaml');
    expect(syntaxErrors).toHaveLength(0);
  });
});
