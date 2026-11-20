import { describe, it, expect } from 'vitest';
import { createSchemaRegistry, handleCompletion, computeDiagnostics, createServerHandler } from '@casehubio/pages-lsp';
import { orgFormat } from '../src/formats/org.js';

describe('Org format', () => {
  it('detects .org.yaml by extension', () => {
    const registry = createSchemaRegistry();
    registry.register(orgFormat);
    const detected = registry.detect('file:///app/structure.org.yaml', '');
    expect(detected?.formatId).toBe('org');
  });

  it('detects Org from content (organization: at root)', () => {
    const registry = createSchemaRegistry();
    registry.register(orgFormat);
    const content = 'organization:\n  units: []\n  relationships: []\n';
    const detected = registry.detect('file:///app/org.yaml', content);
    expect(detected?.formatId).toBe('org');
  });

  it('does not detect without organization:', () => {
    const registry = createSchemaRegistry();
    registry.register(orgFormat);
    const content = 'units:\n  - unitId: eng\n';
    const detected = registry.detect('file:///app/org.yaml', content);
    expect(detected).toBeUndefined();
  });

  it('provides completion under organization.units[]', () => {
    const registry = createSchemaRegistry();
    registry.register(orgFormat);
    const content = 'organization:\n  units:\n    - ';
    const items = handleCompletion('file:///org.org.yaml', content, { line: 2, character: 6 }, registry);
    const labels = items.map(i => i.label);
    expect(labels).toContain('unitId');
    expect(labels).toContain('name');
    expect(labels).toContain('members');
  });

  it('produces no syntax errors for valid Org', () => {
    const registry = createSchemaRegistry();
    registry.register(orgFormat);
    const content = [
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
    ].join('\n');
    const diags = computeDiagnostics('file:///org.org.yaml', content, registry);
    const syntaxErrors = diags.filter(d => d.source === 'casehub-yaml');
    expect(syntaxErrors).toHaveLength(0);
  });

  it('extracts unitId symbols for rename', () => {
    const registry = createSchemaRegistry();
    registry.register(orgFormat);
    const handler = createServerHandler(registry);
    const content = [
      'organization:',
      '  units:',
      '    - unitId: eng',
      '      name: Engineering',
      '      tenancyId: default',
      '      members: []',
      '      capabilities: []',
      '      goals: []',
      '      constraints: []',
      '    - unitId: frontend',
      '      name: Frontend',
      '      tenancyId: default',
      '      parentUnitId: eng',
      '      members: []',
      '      capabilities: []',
      '      goals: []',
      '      constraints: []',
      '  relationships: []',
    ].join('\n');
    handler.onDidOpen('file:///org.org.yaml', content);
    const result = handler.onPrepareRename('file:///org.org.yaml', { line: 2, character: 14 });
    expect(result).not.toBeNull();
    expect(result!.placeholder).toBe('eng');
  });
});
