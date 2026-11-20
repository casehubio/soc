import { describe, it, expect } from 'vitest';
import { toOrgYaml } from './to-org-yaml.js';
import type { AgentRelationship } from '../types.js';
import { parse } from 'yaml';

interface RosterEntry {
  agentId: string;
  name: string;
  unitId?: string;
}

describe('toOrgYaml', () => {
  const tenancyId = 'tenant-1';

  it('groups roster entries by unitId into units with members', () => {
    const roster: RosterEntry[] = [
      { agentId: 'a1', name: 'Alpha', unitId: 'u1' },
      { agentId: 'a2', name: 'Beta', unitId: 'u1' },
      { agentId: 'a3', name: 'Gamma', unitId: 'u2' },
    ];
    const relationships: AgentRelationship[] = [];

    const result = parse(toOrgYaml(roster, relationships, tenancyId));

    expect(result.organization.units).toHaveLength(2);
    const u1 = result.organization.units.find((u: any) => u.unitId === 'u1');
    expect(u1.members).toHaveLength(2);
    expect(u1.members.map((m: any) => m.agentId)).toContain('a1');
    expect(u1.members.map((m: any) => m.agentId)).toContain('a2');
    expect(u1.tenancyId).toBe(tenancyId);
    const u2 = result.organization.units.find((u: any) => u.unitId === 'u2');
    expect(u2.members).toHaveLength(1);
    expect(u2.members[0].agentId).toBe('a3');
  });

  it('places agents without unitId into synthetic unassigned unit', () => {
    const roster: RosterEntry[] = [
      { agentId: 'a1', name: 'Alpha' },
      { agentId: 'a2', name: 'Beta' },
    ];
    const relationships: AgentRelationship[] = [];

    const result = parse(toOrgYaml(roster, relationships, tenancyId));

    expect(result.organization.units).toHaveLength(1);
    expect(result.organization.units[0].unitId).toBe('unassigned');
    expect(result.organization.units[0].name).toBe('Unassigned');
    expect(result.organization.units[0].members).toHaveLength(2);
  });

  it('passes relationships through to YAML output', () => {
    const roster: RosterEntry[] = [
      { agentId: 'a1', name: 'Alpha', unitId: 'u1' },
      { agentId: 'a2', name: 'Beta', unitId: 'u1' },
    ];
    const relationships: AgentRelationship[] = [
      { sourceAgentId: 'a1', targetAgentId: 'a2', kind: 'SUPERVISES', tenancyId },
    ];

    const result = parse(toOrgYaml(roster, relationships, tenancyId));

    expect(result.organization.relationships).toHaveLength(1);
    expect(result.organization.relationships[0].sourceAgentId).toBe('a1');
    expect(result.organization.relationships[0].targetAgentId).toBe('a2');
    expect(result.organization.relationships[0].kind).toBe('SUPERVISES');
  });

  it('produces valid minimal YAML for empty roster', () => {
    const result = parse(toOrgYaml([], [], tenancyId));

    expect(result.organization.units).toEqual([]);
    expect(result.organization.relationships).toEqual([]);
  });

  it('preserves tenancyId on relationships as-is', () => {
    const roster: RosterEntry[] = [
      { agentId: 'a1', name: 'Alpha', unitId: 'u1' },
    ];
    const relationships: AgentRelationship[] = [
      { sourceAgentId: 'a1', targetAgentId: 'a1', kind: 'BACKS_UP', tenancyId: 'other' },
    ];

    const result = parse(toOrgYaml(roster, relationships, tenancyId));

    expect(result.organization.units[0].tenancyId).toBe(tenancyId);
    expect(result.organization.relationships[0].tenancyId).toBe('other');
  });

  it('uses unit name from unitId', () => {
    const roster: RosterEntry[] = [
      { agentId: 'a1', name: 'Alpha', unitId: 'risk-management' },
    ];

    const result = parse(toOrgYaml(roster, [], tenancyId));

    expect(result.organization.units[0].unitId).toBe('risk-management');
    expect(result.organization.units[0].name).toBe('risk-management');
  });
});
