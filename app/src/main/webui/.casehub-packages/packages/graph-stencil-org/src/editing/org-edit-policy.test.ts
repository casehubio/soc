import { describe, it, expect, beforeEach } from 'vitest';
import { clearRegistry } from '@casehubio/graph-renderer';
import { registerOrgStencils } from '../stencils/index.js';
import { createOrgEditPolicy } from './org-edit-policy.js';
import type { GraphModel, GraphNode } from '@casehubio/graph-core';

describe('createOrgEditPolicy', () => {
  beforeEach(() => {
    clearRegistry();
    registerOrgStencils();
  });

  const emptyModel: GraphModel = { nodes: [], edges: [] };

  it('allows creating org-unit without selection', () => {
    const policy = createOrgEditPolicy();
    const types = policy.getCreatableTypes(null, emptyModel);
    expect(types.some(t => t.type === 'org-unit')).toBe(true);
    expect(types.some(t => t.type === 'org-agent')).toBe(false);
  });

  it('allows creating org-agent when unit selected', () => {
    const policy = createOrgEditPolicy();
    const unitNode: GraphNode = {
      id: 'unit:team', type: 'org-unit', properties: {},
    };
    const model: GraphModel = { nodes: [unitNode], edges: [] };
    const types = policy.getCreatableTypes(unitNode, model);
    expect(types.some(t => t.type === 'org-agent')).toBe(true);
  });

  it('still allows creating org-unit when unit selected', () => {
    const policy = createOrgEditPolicy();
    const unitNode: GraphNode = {
      id: 'unit:team', type: 'org-unit', properties: {},
    };
    const model: GraphModel = { nodes: [unitNode], edges: [] };
    const types = policy.getCreatableTypes(unitNode, model);
    expect(types.some(t => t.type === 'org-unit')).toBe(true);
  });

  it('does not show org-agent when agent selected', () => {
    const policy = createOrgEditPolicy();
    const agentNode: GraphNode = {
      id: 'agent:team:alice', type: 'org-agent', parentId: 'unit:team',
      properties: {},
    };
    const model: GraphModel = { nodes: [agentNode], edges: [] };
    const types = policy.getCreatableTypes(agentNode, model);
    expect(types.some(t => t.type === 'org-agent')).toBe(false);
  });

  it('allows agent-to-agent connections', () => {
    const policy = createOrgEditPolicy();
    const source: GraphNode = {
      id: 'agent:team:alice', type: 'org-agent', parentId: 'unit:team',
      properties: {},
    };
    const target: GraphNode = {
      id: 'agent:team:bob', type: 'org-agent', parentId: 'unit:team',
      properties: {},
    };
    const model: GraphModel = { nodes: [source, target], edges: [] };
    expect(policy.canConnect(source, target, model)).toBe(true);
  });

  it('disallows unit-to-unit connections', () => {
    const policy = createOrgEditPolicy();
    const source: GraphNode = {
      id: 'unit:a', type: 'org-unit', properties: {},
    };
    const target: GraphNode = {
      id: 'unit:b', type: 'org-unit', properties: {},
    };
    const model: GraphModel = { nodes: [source, target], edges: [] };
    expect(policy.canConnect(source, target, model)).toBe(false);
  });

  it('allows deleting any node', () => {
    const policy = createOrgEditPolicy();
    const unit: GraphNode = {
      id: 'unit:team', type: 'org-unit', properties: {},
    };
    const agent: GraphNode = {
      id: 'agent:team:alice', type: 'org-agent', parentId: 'unit:team',
      properties: {},
    };
    expect(policy.canDelete(unit, emptyModel)).toBe(true);
    expect(policy.canDelete(agent, emptyModel)).toBe(true);
  });

  it('cascades delete for units with children', () => {
    const policy = createOrgEditPolicy();
    const unit: GraphNode = {
      id: 'unit:team', type: 'org-unit', properties: {},
    };
    const agent: GraphNode = {
      id: 'agent:team:alice', type: 'org-agent', parentId: 'unit:team',
      properties: {},
    };
    const model: GraphModel = { nodes: [unit, agent], edges: [] };
    expect(policy.getDeleteStrategy(unit, model).type).toBe('cascade');
  });
});
