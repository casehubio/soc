import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import type { JSONSchema7 } from 'json-schema';
import type { WorkStencil } from '@casehubio/graph-work-registry';
import type { GraphNode } from '@casehubio/graph-core';
import { getGrammar } from '@casehubio/graph-core';

vi.mock('@xyflow/react', () => ({
  Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
}));

import { createWorkStencilRenderFn, toWorkStencilDescriptor } from './work-stencil-renderer.js';
import { registerStencil, clearRegistry, getStencil, getNodeTypes } from './registry/stencil-registry.js';

const EMPTY_SCHEMA: JSONSchema7 = {};

function makeWorkStencil(overrides?: Partial<WorkStencil>): WorkStencil {
  return {
    name: 'send-email',
    displayName: 'Send Email',
    category: 'connectors/messaging',
    icon: '📧',
    async: true,
    properties: { type: 'object', properties: { to: { type: 'string' } } },
    input: { type: 'object', properties: { body: { type: 'string' } } },
    output: { type: 'object', properties: { messageId: { type: 'string' } } },
    ...overrides,
  };
}

const DUMMY_NODE: GraphNode = {
  id: 'n1',
  type: 'work:send-email',
  properties: {},
};

describe('createWorkStencilRenderFn', () => {
  it('returns a StencilRenderFn', () => {
    const renderFn = createWorkStencilRenderFn(makeWorkStencil());
    expect(typeof renderFn).toBe('function');
  });

  it('produces a TemplateResult', () => {
    const renderFn = createWorkStencilRenderFn(makeWorkStencil());
    const result = renderFn(DUMMY_NODE);
    expect(result).toBeDefined();
    expect(result).toHaveProperty('_$litType$');
  });

  it('renders sync stencil', () => {
    const renderFn = createWorkStencilRenderFn(makeWorkStencil({ async: false }));
    const result = renderFn(DUMMY_NODE);
    expect(result).toBeDefined();
  });

  it('renders stencil with no I/O schemas', () => {
    const renderFn = createWorkStencilRenderFn(makeWorkStencil({
      input: EMPTY_SCHEMA,
      output: EMPTY_SCHEMA,
    }));
    const result = renderFn(DUMMY_NODE);
    expect(result).toBeDefined();
  });
});

describe('toWorkStencilDescriptor', () => {
  beforeEach(() => {
    clearRegistry();
  });

  it('creates a StencilDescriptor with work: prefix', () => {
    const desc = toWorkStencilDescriptor(makeWorkStencil());
    expect(desc.type).toBe('work:send-email');
    expect(desc.label).toBe('Send Email');
    expect(desc.icon).toBe('📧');
  });

  it('provides open grammar (any connections allowed)', () => {
    const desc = toWorkStencilDescriptor(makeWorkStencil());
    expect(desc.grammar.type).toBe('work:send-email');
    expect(desc.grammar.connections.inbound.min).toBe(0);
    expect(desc.grammar.connections.outbound.min).toBe(0);
  });

  it('integrates with stencil registry', () => {
    const desc = toWorkStencilDescriptor(makeWorkStencil());
    registerStencil(desc);

    expect(getStencil('work:send-email')).toBeDefined();
    expect(getGrammar('work:send-email')).toBeDefined();
    expect(getNodeTypes()['work:send-email']).toBeDefined();
  });

  it('registers multiple work stencils without conflict', () => {
    const email = toWorkStencilDescriptor(makeWorkStencil());
    const http = toWorkStencilDescriptor(makeWorkStencil({
      name: 'http-request',
      displayName: 'HTTP Request',
      category: 'connectors/http',
      icon: '🌐',
    }));

    registerStencil(email);
    registerStencil(http);

    expect(getStencil('work:send-email')).toBeDefined();
    expect(getStencil('work:http-request')).toBeDefined();
  });
});
