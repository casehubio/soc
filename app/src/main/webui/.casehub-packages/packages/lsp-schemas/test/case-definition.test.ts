import { describe, it, expect } from 'vitest';
import { createSchemaRegistry, handleCompletion, computeDiagnostics, createServerHandler } from '@casehubio/pages-lsp';
import { caseDefinitionFormat } from '../src/formats/case-definition.js';

describe('CaseDefinition format', () => {
  it('detects .case.yaml by extension', () => {
    const registry = createSchemaRegistry();
    registry.register(caseDefinitionFormat);
    const detected = registry.detect('file:///app/incident.case.yaml', '');
    expect(detected?.formatId).toBe('case-definition');
  });

  it('detects CaseDefinition from content (dsl + spec.bindings)', () => {
    const registry = createSchemaRegistry();
    registry.register(caseDefinitionFormat);
    const content = 'dsl: casehub/case\nnamespace: test\nname: case1\nspec:\n  bindings: []\n';
    const detected = registry.detect('file:///app/case.yaml', content);
    expect(detected?.formatId).toBe('case-definition');
  });

  it('detects CaseDefinition from content (dsl + spec.workers)', () => {
    const registry = createSchemaRegistry();
    registry.register(caseDefinitionFormat);
    const content = 'dsl: casehub/case\nnamespace: test\nname: case1\nspec:\n  workers: []\n';
    const detected = registry.detect('file:///app/case.yaml', content);
    expect(detected?.formatId).toBe('case-definition');
  });

  it('detects CaseDefinition from content (dsl + spec.capabilities)', () => {
    const registry = createSchemaRegistry();
    registry.register(caseDefinitionFormat);
    const content = 'dsl: casehub/case\nnamespace: test\nname: case1\nspec:\n  capabilities: []\n';
    const detected = registry.detect('file:///app/case.yaml', content);
    expect(detected?.formatId).toBe('case-definition');
  });

  it('provides completion at spec level', () => {
    const registry = createSchemaRegistry();
    registry.register(caseDefinitionFormat);
    const content = 'dsl: casehub/case\nnamespace: test\nname: case1\nspec:\n  ';
    const items = handleCompletion('file:///case.case.yaml', content, { line: 4, character: 2 }, registry);
    const labels = items.map(i => i.label);
    expect(labels).toContain('bindings');
    expect(labels).toContain('workers');
    expect(labels).toContain('capabilities');
  });

  it('provides completion for binding fields', () => {
    const registry = createSchemaRegistry();
    registry.register(caseDefinitionFormat);
    const content = 'dsl: casehub/case\nspec:\n  bindings:\n    - ';
    const items = handleCompletion('file:///case.case.yaml', content, { line: 3, character: 6 }, registry);
    const labels = items.map(i => i.label);
    expect(labels).toContain('name');
    expect(labels).toContain('capability');
  });

  it('renames capability across document', () => {
    const registry = createSchemaRegistry();
    registry.register(caseDefinitionFormat);
    const handler = createServerHandler(registry);
    const content = [
      'dsl: casehub/case',
      'namespace: test',
      'name: case1',
      'spec:',
      '  capabilities:',
      '    - name: review',
      '  bindings:',
      '    - name: b1',
      '      capability: review',
    ].join('\n');
    handler.onDidOpen('file:///case.case.yaml', content);
    const result = handler.onRename('file:///case.case.yaml', { line: 5, character: 12 }, 'audit');
    expect(result).not.toBeNull();
    const edits = result!.changes['file:///case.case.yaml']!;
    expect(edits.length).toBeGreaterThanOrEqual(2);
  });

  it('renames capability referenced in worker capabilities', () => {
    const registry = createSchemaRegistry();
    registry.register(caseDefinitionFormat);
    const handler = createServerHandler(registry);
    const content = [
      'dsl: casehub/case',
      'spec:',
      '  capabilities:',
      '    - name: review',
      '  workers:',
      '    - name: w1',
      '      capabilities:',
      '        - review',
      '  bindings:',
      '    - name: b1',
      '      capability: review',
    ].join('\n');
    handler.onDidOpen('file:///case.case.yaml', content);
    const result = handler.onRename('file:///case.case.yaml', { line: 3, character: 12 }, 'audit');
    expect(result).not.toBeNull();
    const edits = result!.changes['file:///case.case.yaml']!;
    expect(edits.length).toBeGreaterThanOrEqual(3);
  });

  it('safeParse accepts binding with no variant key (mid-edit)', async () => {
    const { caseDefinitionDocumentSchema } = await import('../src/schemas/case-definition.generated.js');
    const doc = {
      dsl: 'casehub/case', namespace: 'test', name: 'case1', version: '1.0',
      spec: { bindings: [{ name: 'b1', on: { contextChange: {} } }] },
    };
    expect(caseDefinitionDocumentSchema.safeParse(doc).success).toBe(true);
  });

  it('safeParse accepts binding with capability variant', async () => {
    const { caseDefinitionDocumentSchema } = await import('../src/schemas/case-definition.generated.js');
    const doc = {
      dsl: 'casehub/case', namespace: 'test', name: 'case1', version: '1.0',
      spec: { bindings: [{ name: 'b1', on: { contextChange: {} }, capability: 'review' }] },
    };
    expect(caseDefinitionDocumentSchema.safeParse(doc).success).toBe(true);
  });

  it('safeParse accepts binding with subCase variant', async () => {
    const { caseDefinitionDocumentSchema } = await import('../src/schemas/case-definition.generated.js');
    const doc = {
      dsl: 'casehub/case', namespace: 'test', name: 'case1', version: '1.0',
      spec: { bindings: [{ name: 'b1', on: { contextChange: {} }, subCase: { namespace: 'ns', name: 'sub', version: '1.0' } }] },
    };
    expect(caseDefinitionDocumentSchema.safeParse(doc).success).toBe(true);
  });

  it('safeParse accepts trigger with no variant key (mid-edit)', async () => {
    const { caseDefinitionDocumentSchema } = await import('../src/schemas/case-definition.generated.js');
    const doc = {
      dsl: 'casehub/case', namespace: 'test', name: 'case1', version: '1.0',
      spec: { bindings: [{ name: 'b1', on: {} }] },
    };
    expect(caseDefinitionDocumentSchema.safeParse(doc).success).toBe(true);
  });

  it('produces no syntax errors for valid CaseDefinition', () => {
    const registry = createSchemaRegistry();
    registry.register(caseDefinitionFormat);
    const content = [
      'dsl: casehub/case',
      'namespace: test',
      'name: incident',
      'spec:',
      '  capabilities:',
      '    - name: review',
      '  bindings:',
      '    - name: b1',
      '      capability: review',
      '  workers:',
      '    - name: w1',
      '      capabilities:',
      '        - review',
      '  milestones:',
      '    - name: resolved',
      '  goals:',
      '    - name: resolution',
      '      kind: success',
    ].join('\n');
    const diags = computeDiagnostics('file:///case.case.yaml', content, registry);
    const syntaxErrors = diags.filter(d => d.source === 'casehub-yaml');
    expect(syntaxErrors).toHaveLength(0);
  });
});
