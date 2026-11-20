import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { computeDiagnostics } from './diagnostics.js';
import { createSchemaRegistry } from './schema-registry.js';
import type { FormatRegistration } from './types.js';

const pageSchema = z.object({
  pages: z.array(z.object({ name: z.string() })),
});

const pageFormat: FormatRegistration = {
  formatId: 'page',
  extensions: ['.page.yaml'],
  documentSchema: pageSchema,
};

describe('computeDiagnostics', () => {
  it('reports YAML syntax errors', () => {
    const registry = createSchemaRegistry();
    registry.register(pageFormat);
    const yaml = 'pages:\n  - name: Home\n  bad indent';
    const diags = computeDiagnostics('file:///test.page.yaml', yaml, registry);
    expect(diags.some(d => d.severity === 1)).toBe(true);
  });

  it('returns empty for valid YAML', () => {
    const registry = createSchemaRegistry();
    registry.register(pageFormat);
    const yaml = 'pages:\n  - name: Home\n';
    const diags = computeDiagnostics('file:///test.page.yaml', yaml, registry);
    expect(diags).toHaveLength(0);
  });

  it('returns empty for unrecognised format', () => {
    const registry = createSchemaRegistry();
    const diags = computeDiagnostics('file:///random.yaml', 'foo: bar\n', registry);
    expect(diags).toHaveLength(0);
  });
});
