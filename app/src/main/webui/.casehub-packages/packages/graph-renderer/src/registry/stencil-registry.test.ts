import { describe, it, expect, beforeEach, vi } from 'vitest';
import { html } from 'lit-html';
import { getGrammar } from '@casehubio/graph-core';
import type { StencilGrammar } from '@casehubio/graph-core';

vi.mock('@xyflow/react', () => ({
  Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
}));

import {
  registerStencil,
  deregisterStencil,
  getStencil,
  getAllStencils,
  registerEdgeType,
  deregisterEdgeType,
  getEdgeDescriptor,
  getNodeTypes,
  getRegisteredStyles,
  clearRegistry,
  type StencilDescriptor,
} from './stencil-registry.js';

const testGrammar: StencilGrammar = {
  type: 'test-node',
  connections: {
    inbound: { min: 0, max: 5, allowedFrom: [] },
    outbound: { min: 0, max: 5, allowedTo: [] },
  },
};

function makeDescriptor(type: string, grammar?: StencilGrammar): StencilDescriptor {
  return {
    type,
    label: `${type} label`,
    icon: 'icon-test',
    grammar: grammar ?? { ...testGrammar, type },
    render: (node) => html`<div>${String(node.properties['label'] ?? type)}</div>`,
  };
}

describe('stencil-registry', () => {
  beforeEach(() => {
    clearRegistry();
  });

  it('starts empty', () => {
    expect(getAllStencils()).toEqual([]);
    expect(getNodeTypes()).toEqual({});
    expect(getRegisteredStyles()).toBe('');
  });

  it('registers a stencil descriptor', () => {
    registerStencil(makeDescriptor('binding'));
    const stencil = getStencil('binding');
    expect(stencil).toBeDefined();
    expect(stencil!.label).toBe('binding label');
  });

  it('auto-registers grammar with graph-core', () => {
    registerStencil(makeDescriptor('worker'));
    expect(getGrammar('worker')).toBeDefined();
    expect(getGrammar('worker')!.type).toBe('worker');
  });

  it('auto-generates React component in nodeTypes', () => {
    registerStencil(makeDescriptor('milestone'));
    const types = getNodeTypes();
    expect(types['milestone']).toBeDefined();
    expect(typeof types['milestone']).toBe('function');
  });

  it('rejects duplicate type registration', () => {
    registerStencil(makeDescriptor('goal'));
    expect(() => { registerStencil(makeDescriptor('goal')); }).toThrow('already registered');
  });

  it('deregisters stencil, grammar, and nodeType', () => {
    registerStencil(makeDescriptor('temp'));
    deregisterStencil('temp');
    expect(getStencil('temp')).toBeUndefined();
    expect(getGrammar('temp')).toBeUndefined();
    expect(getNodeTypes()['temp']).toBeUndefined();
  });

  it('deregister is silent for unknown type', () => {
    expect(() => { deregisterStencil('nonexistent'); }).not.toThrow();
  });

  it('getAllStencils returns all registered', () => {
    registerStencil(makeDescriptor('a'));
    registerStencil(makeDescriptor('b'));
    registerStencil(makeDescriptor('c'));
    expect(getAllStencils()).toHaveLength(3);
  });

  it('collects defaultStyle from stencils', () => {
    registerStencil({ ...makeDescriptor('styled'), defaultStyle: '.styled { color: red; }' });
    expect(getRegisteredStyles()).toContain('.styled { color: red; }');
  });

  it('clearRegistry removes everything', () => {
    registerStencil(makeDescriptor('x'));
    registerEdgeType({ type: 'edge-x' });
    clearRegistry();
    expect(getAllStencils()).toEqual([]);
    expect(getNodeTypes()).toEqual({});
    expect(getEdgeDescriptor('edge-x')).toBeUndefined();
  });

  describe('edge types', () => {
    it('registers and retrieves edge descriptor', () => {
      registerEdgeType({ type: 'capability', label: 'Capability Edge' });
      const desc = getEdgeDescriptor('capability');
      expect(desc).toBeDefined();
      expect(desc!.label).toBe('Capability Edge');
    });

    it('deregisters edge type', () => {
      registerEdgeType({ type: 'temp-edge' });
      deregisterEdgeType('temp-edge');
      expect(getEdgeDescriptor('temp-edge')).toBeUndefined();
    });

    it('collects defaultStyle from edges', () => {
      registerEdgeType({ type: 'styled-edge', defaultStyle: '.edge { stroke: blue; }' });
      expect(getRegisteredStyles()).toContain('.edge { stroke: blue; }');
    });
  });
});
