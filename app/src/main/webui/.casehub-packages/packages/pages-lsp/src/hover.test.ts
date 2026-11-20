import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { handleHover } from './hover.js';
import { createSchemaRegistry } from './schema-registry.js';
import type { FormatRegistration } from './types.js';

const pageSchema = z.object({
  pages: z.array(z.object({ name: z.string().describe('Page display name') })),
});

const pageFormat: FormatRegistration = {
  formatId: 'page',
  extensions: ['.page.yaml'],
  documentSchema: pageSchema,
};

describe('handleHover', () => {
  it('returns description for a known property', () => {
    const registry = createSchemaRegistry();
    registry.register(pageFormat);
    const doc = 'pages:\n  - name: Home\n';
    const hover = handleHover(
      'file:///test.page.yaml', doc, { line: 1, character: 6 }, registry,
    );
    expect(hover).toBeTruthy();
    expect(hover!.contents).toContain('Page display name');
  });

  it('returns null for unknown position', () => {
    const registry = createSchemaRegistry();
    registry.register(pageFormat);
    const doc = 'pages:\n  - name: Home\n';
    const hover = handleHover(
      'file:///test.page.yaml', doc, { line: 1, character: 15 }, registry,
    );
    expect(hover).toBeNull();
  });
});
