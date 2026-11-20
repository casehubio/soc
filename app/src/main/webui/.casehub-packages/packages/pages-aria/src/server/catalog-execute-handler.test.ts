import { describe, it, expect } from 'vitest';
import { createCatalogExecuteHandler } from './catalog-execute-handler.js';
import type { Catalog, CatalogEntry } from '@casehubio/yaml-core/step';

function mockCatalog(entries: Map<string, CatalogEntry>): Catalog {
  return {
    resolve: (name: string) => entries.get(name),
    availableActions: () => new Set(entries.keys()),
  };
}

describe('createCatalogExecuteHandler', () => {
  it('executes a catalog action and returns success', async () => {
    const entry: CatalogEntry = {
      qualifiedName: 'greet',
      definition: { name: 'greet', inputs: {}, outputs: {} },
      action: {
        execute: async (params) => ({
          kind: 'success' as const,
          output: { message: `Hello ${params['name']}` },
          executionMetadata: {},
        }),
      },
    };
    const catalog = mockCatalog(new Map([['greet', entry]]));
    const handler = createCatalogExecuteHandler(catalog);

    const result = await handler({ actionName: 'greet', params: { name: 'World' } });
    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.output['message']).toBe('Hello World');
    }
  });

  it('returns failure for unknown action', async () => {
    const catalog = mockCatalog(new Map());
    const handler = createCatalogExecuteHandler(catalog);

    const result = await handler({ actionName: 'unknown', params: {} });
    expect(result.kind).toBe('failure');
    if (result.kind === 'failure') {
      expect(result.message).toContain('unknown');
    }
  });

  it('catches thrown errors and returns failure', async () => {
    const entry: CatalogEntry = {
      qualifiedName: 'boom',
      definition: { name: 'boom', inputs: {}, outputs: {} },
      action: {
        execute: async () => { throw new Error('kaboom'); },
      },
    };
    const catalog = mockCatalog(new Map([['boom', entry]]));
    const handler = createCatalogExecuteHandler(catalog);

    const result = await handler({ actionName: 'boom', params: {} });
    expect(result.kind).toBe('failure');
    if (result.kind === 'failure') {
      expect(result.message).toContain('kaboom');
    }
  });

  it('passes params to the action execute method', async () => {
    let capturedParams: Record<string, unknown> = {};
    const entry: CatalogEntry = {
      qualifiedName: 'capture',
      definition: { name: 'capture', inputs: {}, outputs: {} },
      action: {
        execute: async (params) => {
          capturedParams = params;
          return { kind: 'success' as const, output: {}, executionMetadata: {} };
        },
      },
    };
    const catalog = mockCatalog(new Map([['capture', entry]]));
    const handler = createCatalogExecuteHandler(catalog);

    await handler({ actionName: 'capture', params: { foo: 'bar', count: 42 } });
    expect(capturedParams).toEqual({ foo: 'bar', count: 42 });
  });

  it('rejects execution of incompatible action', async () => {
    const entry: CatalogEntry = {
      qualifiedName: 'java-only',
      definition: { name: 'java-only', inputs: {}, outputs: {}, portability: 'java' },
      action: {
        execute: async () => ({ kind: 'success' as const, output: {}, executionMetadata: {} }),
      },
    };
    const catalog = mockCatalog(new Map([['java-only', entry]]));
    const handler = createCatalogExecuteHandler(catalog, 'ts');
    const result = await handler({ actionName: 'java-only', params: {} });
    expect(result.kind).toBe('failure');
    if (result.kind === 'failure') {
      expect(result.message).toContain('portability');
    }
  });

  it('allows execution of compatible action', async () => {
    const entry: CatalogEntry = {
      qualifiedName: 'universal-action',
      definition: { name: 'universal-action', inputs: {}, outputs: {}, portability: 'universal' },
      action: {
        execute: async () => ({ kind: 'success' as const, output: { ok: true }, executionMetadata: {} }),
      },
    };
    const catalog = mockCatalog(new Map([['universal-action', entry]]));
    const handler = createCatalogExecuteHandler(catalog, 'ts');
    const result = await handler({ actionName: 'universal-action', params: {} });
    expect(result.kind).toBe('success');
  });

  it('defaults to ts runtime when runtime not specified', async () => {
    const entry: CatalogEntry = {
      qualifiedName: 'ts-action',
      definition: { name: 'ts-action', inputs: {}, outputs: {}, portability: 'ts' },
      action: {
        execute: async () => ({ kind: 'success' as const, output: {}, executionMetadata: {} }),
      },
    };
    const catalog = mockCatalog(new Map([['ts-action', entry]]));
    const handler = createCatalogExecuteHandler(catalog);
    const result = await handler({ actionName: 'ts-action', params: {} });
    expect(result.kind).toBe('success');
  });

  it('treats missing portability as ts', async () => {
    const entry: CatalogEntry = {
      qualifiedName: 'no-port',
      definition: { name: 'no-port', inputs: {}, outputs: {} },
      action: {
        execute: async () => ({ kind: 'success' as const, output: {}, executionMetadata: {} }),
      },
    };
    const catalog = mockCatalog(new Map([['no-port', entry]]));
    const handler = createCatalogExecuteHandler(catalog, 'java');
    const result = await handler({ actionName: 'no-port', params: {} });
    expect(result.kind).toBe('failure');
    if (result.kind === 'failure') {
      expect(result.message).toContain('portability');
    }
  });
});
