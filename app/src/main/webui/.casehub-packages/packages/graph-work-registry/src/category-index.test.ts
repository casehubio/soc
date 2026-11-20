import { describe, it, expect } from 'vitest';
import type { JSONSchema7 } from 'json-schema';
import { CategoryIndex } from './category-index.js';
import type { WorkStencil } from './model.js';

const EMPTY_SCHEMA: JSONSchema7 = {};

function stencil(name: string, category: string): WorkStencil {
  return {
    name,
    displayName: name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    category,
    icon: 'box',
    async: false,
    properties: EMPTY_SCHEMA,
    input: EMPTY_SCHEMA,
    output: EMPTY_SCHEMA,
  };
}

describe('CategoryIndex', () => {
  it('builds tree from flat stencil list', () => {
    const index = new CategoryIndex();
    index.rebuild([
      stencil('send-email', 'connectors/messaging'),
      stencil('send-sms', 'connectors/messaging'),
      stencil('http-request', 'connectors/http'),
      stencil('llm-prompt', 'ai/agents'),
    ]);

    const topLevel = index.all();
    expect(topLevel).toHaveLength(2);
    expect(topLevel.map(c => c.path).sort()).toEqual(['ai', 'connectors']);

    const connectors = index.byCategory('connectors')!;
    expect(connectors.children).toHaveLength(2);
    expect(connectors.children.map(c => c.path).sort()).toEqual([
      'connectors/http',
      'connectors/messaging',
    ]);

    const messaging = index.byCategory('connectors/messaging')!;
    expect(messaging.stencils).toHaveLength(2);
  });

  it('returns undefined for unknown category', () => {
    const index = new CategoryIndex();
    index.rebuild([stencil('x', 'misc')]);
    expect(index.byCategory('nonexistent')).toBeUndefined();
  });

  it('returns root for empty path', () => {
    const index = new CategoryIndex();
    index.rebuild([stencil('x', 'misc')]);
    const root = index.byCategory('');
    expect(root).toBeDefined();
    expect(root!.displayName).toBe('All');
  });

  it('searches by name', () => {
    const index = new CategoryIndex();
    index.rebuild([
      stencil('send-email', 'connectors/messaging'),
      stencil('http-request', 'connectors/http'),
    ]);

    const results = index.search('email');
    expect(results).toHaveLength(1);
    expect(results[0]!.name).toBe('send-email');
  });

  it('searches by display name', () => {
    const index = new CategoryIndex();
    index.rebuild([stencil('send-email', 'connectors/messaging')]);

    const results = index.search('Send');
    expect(results).toHaveLength(1);
  });

  it('searches by category', () => {
    const index = new CategoryIndex();
    index.rebuild([
      stencil('send-email', 'connectors/messaging'),
      stencil('http-request', 'connectors/http'),
      stencil('llm-prompt', 'ai/agents'),
    ]);

    const results = index.search('connectors');
    expect(results).toHaveLength(2);
  });

  it('search is case-insensitive', () => {
    const index = new CategoryIndex();
    index.rebuild([stencil('send-email', 'connectors/messaging')]);

    expect(index.search('EMAIL')).toHaveLength(1);
    expect(index.search('eMaIl')).toHaveLength(1);
  });

  it('returns all stencils across categories', () => {
    const index = new CategoryIndex();
    index.rebuild([
      stencil('a', 'x/y'),
      stencil('b', 'x/z'),
      stencil('c', 'w'),
    ]);

    expect(index.allStencils()).toHaveLength(3);
  });

  it('sorts categories and stencils alphabetically', () => {
    const index = new CategoryIndex();
    index.rebuild([
      stencil('zeta', 'b-cat'),
      stencil('alpha', 'a-cat'),
      stencil('mid', 'b-cat'),
    ]);

    const top = index.all();
    expect(top[0]!.displayName).toBe('A Cat');
    expect(top[1]!.displayName).toBe('B Cat');
    expect(top[1]!.stencils[0]!.displayName).toBe('Mid');
    expect(top[1]!.stencils[1]!.displayName).toBe('Zeta');
  });

  it('rebuilds cleanly — previous state is cleared', () => {
    const index = new CategoryIndex();
    index.rebuild([stencil('a', 'cat1'), stencil('b', 'cat2')]);
    expect(index.allStencils()).toHaveLength(2);

    index.rebuild([stencil('c', 'cat3')]);
    expect(index.allStencils()).toHaveLength(1);
    expect(index.byCategory('cat1')).toBeUndefined();
  });

  it('formats display names from kebab-case segments', () => {
    const index = new CategoryIndex();
    index.rebuild([stencil('x', 'my-cool-category')]);

    const cat = index.byCategory('my-cool-category')!;
    expect(cat.displayName).toBe('My Cool Category');
  });
});
