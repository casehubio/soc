import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearRegistry, getStencil, getEdgeDescriptor,
} from '@casehubio/graph-renderer';
import { registerOrgStencils } from './register.js';

describe('registerOrgStencils', () => {
  beforeEach(() => {
    clearRegistry();
  });

  it('registers org-unit stencil', () => {
    registerOrgStencils();
    const stencil = getStencil('org-unit');
    expect(stencil).toBeDefined();
    expect(stencil!.label).toBe('Unit');
  });

  it('registers org-agent stencil', () => {
    registerOrgStencils();
    const stencil = getStencil('org-agent');
    expect(stencil).toBeDefined();
    expect(stencil!.label).toBe('Agent');
  });

  it('registers all 6 edge types', () => {
    registerOrgStencils();
    expect(getEdgeDescriptor('org-supervises')).toBeDefined();
    expect(getEdgeDescriptor('org-delegates-to')).toBeDefined();
    expect(getEdgeDescriptor('org-escalates-to')).toBeDefined();
    expect(getEdgeDescriptor('org-reports-to')).toBeDefined();
    expect(getEdgeDescriptor('org-backs-up')).toBeDefined();
    expect(getEdgeDescriptor('org-extended')).toBeDefined();
  });

  it('org-unit grammar allows agent and unit children', () => {
    registerOrgStencils();
    const stencil = getStencil('org-unit')!;
    expect(stencil.grammar.containment?.allowedChildTypes).toContain('org-agent');
    expect(stencil.grammar.containment?.allowedChildTypes).toContain('org-unit');
  });

  it('org-unit grammar disallows connections', () => {
    registerOrgStencils();
    const stencil = getStencil('org-unit')!;
    expect(stencil.grammar.connections.outbound.max).toBe(0);
    expect(stencil.grammar.connections.inbound.max).toBe(0);
  });

  it('org-agent grammar allows agent-to-agent connections', () => {
    registerOrgStencils();
    const stencil = getStencil('org-agent')!;
    expect(stencil.grammar.connections.outbound.allowedTo).toContain('org-agent');
    expect(stencil.grammar.connections.inbound.allowedFrom).toContain('org-agent');
  });

  it('org-agent grammar requires unit parent', () => {
    registerOrgStencils();
    const stencil = getStencil('org-agent')!;
    expect(stencil.grammar.containment?.allowedParentTypes).toContain('org-unit');
  });

  it('is idempotent — double registration does not throw', () => {
    registerOrgStencils();
    expect(() => registerOrgStencils()).not.toThrow();
  });

  it('edge types have labels', () => {
    registerOrgStencils();
    expect(getEdgeDescriptor('org-supervises')!.label).toBe('Supervises');
    expect(getEdgeDescriptor('org-delegates-to')!.label).toBe('Delegates to');
    expect(getEdgeDescriptor('org-escalates-to')!.label).toBe('Escalates to');
    expect(getEdgeDescriptor('org-reports-to')!.label).toBe('Reports to');
    expect(getEdgeDescriptor('org-backs-up')!.label).toBe('Backs up');
    expect(getEdgeDescriptor('org-extended')!.label).toBe('Extended');
  });
});
