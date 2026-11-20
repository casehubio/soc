import { describe, it, expect } from 'vitest';
import type { FullAgentDescriptor } from './agent.js';

describe('FullAgentDescriptor', () => {
  it('supports required fields', () => {
    const descriptor: FullAgentDescriptor = {
      agentId: 'test-1',
      name: 'Inspector',
      tenancyId: 'tenant-1',
    };
    expect(descriptor.agentId).toBe('test-1');
  });

  it('supports archetype fields', () => {
    const descriptor: FullAgentDescriptor = {
      agentId: 'test-1',
      name: 'Inspector',
      tenancyId: 'tenant-1',
      archetypeFamily: 'Sage',
      subArchetype: 'Detective',
      archetypeAdjectives: ['meticulous', 'persistent'],
      avatar: 'mythic:P1B',
    };
    expect(descriptor.archetypeFamily).toBe('Sage');
    expect(descriptor.subArchetype).toBe('Detective');
    expect(descriptor.archetypeAdjectives).toEqual(['meticulous', 'persistent']);
    expect(descriptor.avatar).toBe('mythic:P1B');
  });

  it('archetype fields are optional', () => {
    const descriptor: FullAgentDescriptor = {
      agentId: 'test-2',
      name: 'Worker',
      tenancyId: 'tenant-1',
    };
    expect(descriptor.archetypeFamily).toBeUndefined();
    expect(descriptor.avatar).toBeUndefined();
  });

  it('accepts optional personality and manifest fields', () => {
    const descriptor: FullAgentDescriptor = {
      agentId: 'test-3',
      name: 'Catalog Agent',
      tenancyId: 'tenant-1',
      archetypeFamily: 'Sage',
      subArchetype: 'Mentor',
      description: 'A test agent for catalog',
      profession: 'Software',
      role: 'Architect',
      preferredAlias: 'reasoning-heavy',
      personality: { mbti: 'INTJ', disc: 'C' },
    };
    expect(descriptor.description).toBe('A test agent for catalog');
    expect(descriptor.profession).toBe('Software');
    expect(descriptor.role).toBe('Architect');
    expect(descriptor.preferredAlias).toBe('reasoning-heavy');
    expect(descriptor.personality?.mbti).toBe('INTJ');
  });

  it('remains backward compatible — new fields are optional', () => {
    const descriptor: FullAgentDescriptor = {
      agentId: 'test-4',
      name: 'Minimal Agent',
      tenancyId: 'tenant-1',
    };
    expect(descriptor.description).toBeUndefined();
    expect(descriptor.personality).toBeUndefined();
    expect(descriptor.manifest).toBeUndefined();
    expect(descriptor.preferredAlias).toBeUndefined();
    expect(descriptor.profession).toBeUndefined();
    expect(descriptor.role).toBeUndefined();
  });
});
