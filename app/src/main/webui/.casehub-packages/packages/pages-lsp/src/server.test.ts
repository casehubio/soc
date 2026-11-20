import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createSchemaRegistry } from './schema-registry.js';
import { initializeServer } from './server.js';
import type { FormatRegistration } from './types.js';

const pageSchema = z.object({
  pages: z.array(z.object({ name: z.string() })),
});

const pageFormat: FormatRegistration = {
  formatId: 'page',
  extensions: ['.page.yaml'],
  documentSchema: pageSchema,
};

describe('initializeServer', () => {
  it('returns capabilities with completion, hover, and diagnostics', () => {
    const registry = createSchemaRegistry();
    registry.register(pageFormat);
    const capabilities = initializeServer(registry);
    expect(capabilities.completionProvider).toBeTruthy();
    expect(capabilities.hoverProvider).toBe(true);
    expect(capabilities.textDocumentSync).toBeTruthy();
  });
});
