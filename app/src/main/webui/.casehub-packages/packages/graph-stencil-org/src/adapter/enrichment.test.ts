import { describe, it, expect } from 'vitest';
import { enrichWithDescriptors } from './enrichment.js';
import { toOrgGraph } from './org-adapter.js';
import type { AgentDescriptor } from '../types.js';

const SIMPLE_YAML = `
organization:
  units:
    - unitId: team1
      name: Team One
      kind: rig
      tenancyId: t1
      members:
        - agentId: alice
          role: worker
        - agentId: bob
          role: lead
      capabilities: []
      goals: []
      constraints: []
  relationships: []
`;

describe('enrichWithDescriptors', () => {
  it('merges descriptor into agent node properties', () => {
    const base = toOrgGraph(SIMPLE_YAML);
    const agents: Record<string, AgentDescriptor> = {
      alice: { slot: 'worker', disposition: { autonomy: 'semi-auto' } },
    };
    const enriched = enrichWithDescriptors(base.model, agents);
    const alice = enriched.nodes.find(n => n.properties['agentId'] === 'alice');
    expect(alice!.properties['slot']).toBe('worker');
    expect((alice!.properties['disposition'] as any).autonomy).toBe('semi-auto');
  });

  it('leaves agent unmodified when descriptor missing', () => {
    const base = toOrgGraph(SIMPLE_YAML);
    const agents: Record<string, AgentDescriptor> = {};
    const enriched = enrichWithDescriptors(base.model, agents);
    const bob = enriched.nodes.find(n => n.properties['agentId'] === 'bob');
    expect(bob!.properties['slot']).toBeUndefined();
  });

  it('does not modify unit nodes', () => {
    const base = toOrgGraph(SIMPLE_YAML);
    const agents: Record<string, AgentDescriptor> = { alice: { slot: 'x' } };
    const enriched = enrichWithDescriptors(base.model, agents);
    const unit = enriched.nodes.find(n => n.type === 'org-unit');
    expect(unit!.properties['slot']).toBeUndefined();
  });

  it('preserves original model (returns new model)', () => {
    const base = toOrgGraph(SIMPLE_YAML);
    const agents: Record<string, AgentDescriptor> = { alice: { slot: 'x' } };
    const enriched = enrichWithDescriptors(base.model, agents);
    const origAlice = base.model.nodes.find(n => n.properties['agentId'] === 'alice');
    expect(origAlice!.properties['slot']).toBeUndefined();
    expect(enriched).not.toBe(base.model);
  });

  it('merges capabilities from descriptor', () => {
    const base = toOrgGraph(SIMPLE_YAML);
    const agents: Record<string, AgentDescriptor> = {
      alice: { capabilities: [{ name: 'full-stack-code-work' }] },
    };
    const enriched = enrichWithDescriptors(base.model, agents);
    const alice = enriched.nodes.find(n => n.properties['agentId'] === 'alice');
    const caps = alice!.properties['capabilities'] as { name: string }[];
    expect(caps).toHaveLength(1);
    expect(caps[0]!.name).toBe('full-stack-code-work');
  });

  it('merges goals and constraints from descriptor', () => {
    const base = toOrgGraph(SIMPLE_YAML);
    const agents: Record<string, AgentDescriptor> = {
      bob: {
        goals: [{ name: 'patient-safety', priority: 'PRIMARY' }],
        constraints: [{ name: 'hipaa', severity: 'HARD' }],
      },
    };
    const enriched = enrichWithDescriptors(base.model, agents);
    const bob = enriched.nodes.find(n => n.properties['agentId'] === 'bob');
    expect((bob!.properties['goals'] as any[])).toHaveLength(1);
    expect((bob!.properties['constraints'] as any[])).toHaveLength(1);
  });

  it('merges briefing from descriptor', () => {
    const base = toOrgGraph(SIMPLE_YAML);
    const agents: Record<string, AgentDescriptor> = {
      alice: { briefing: 'Handle code reviews' },
    };
    const enriched = enrichWithDescriptors(base.model, agents);
    const alice = enriched.nodes.find(n => n.properties['agentId'] === 'alice');
    expect(alice!.properties['briefing']).toBe('Handle code reviews');
  });

  it('merges avatar from descriptor', () => {
    const base = toOrgGraph(SIMPLE_YAML);
    const agents: Record<string, AgentDescriptor> = {
      alice: { avatar: 'mythic:P15' },
    };
    const enriched = enrichWithDescriptors(base.model, agents);
    const alice = enriched.nodes.find(n => n.properties['agentId'] === 'alice');
    expect(alice!.properties['avatar']).toBe('mythic:P15');
  });

  it('merges profession from descriptor', () => {
    const base = toOrgGraph(SIMPLE_YAML);
    const agents: Record<string, AgentDescriptor> = {
      alice: { profession: 'Software' },
    };
    const enriched = enrichWithDescriptors(base.model, agents);
    const alice = enriched.nodes.find(n => n.properties['agentId'] === 'alice');
    expect(alice!.properties['profession']).toBe('Software');
  });

  it('maps descriptor role to descriptorRole on node data', () => {
    const base = toOrgGraph(SIMPLE_YAML);
    const agents: Record<string, AgentDescriptor> = {
      alice: { role: 'Architect' },
    };
    const enriched = enrichWithDescriptors(base.model, agents);
    const alice = enriched.nodes.find(n => n.properties['agentId'] === 'alice');
    expect(alice!.properties['descriptorRole']).toBe('Architect');
    expect(alice!.properties['role']).toBe('worker');
  });
});
