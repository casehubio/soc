import { describe, it, expect } from 'vitest';
import { parse } from 'yaml';
import {
  applyOrgPropertyEdit, addOrgUnit, removeOrgUnit,
  addMember, removeMember, addRelationship, removeRelationship,
} from './yaml-editor.js';

const MINIMAL_YAML = `organization:
  units:
    - unitId: team
      name: My Team
      kind: simple-structure
      tenancyId: t1
      members:
        - agentId: alice
          role: engineer
        - agentId: bob
          role: designer
      capabilities: []
      goals: []
      constraints: []
  relationships:
    - sourceAgentId: alice
      targetAgentId: bob
      kind: SUPERVISES
      tenancyId: t1
`;

describe('applyOrgPropertyEdit', () => {
  it('edits a unit name', () => {
    const result = applyOrgPropertyEdit(
      MINIMAL_YAML, ['organization', 'units', 0], ['name'], 'Renamed Team',
    );
    const parsed = parse(result);
    expect(parsed.organization.units[0].name).toBe('Renamed Team');
  });

  it('edits a member role', () => {
    const result = applyOrgPropertyEdit(
      MINIMAL_YAML, ['organization', 'units', 0, 'members', 0], ['role'], 'lead',
    );
    const parsed = parse(result);
    expect(parsed.organization.units[0].members[0].role).toBe('lead');
  });

  it('preserves comments', () => {
    const yamlWithComment = `# My org\norganization:\n  units:\n    - unitId: team\n      name: My Team\n      tenancyId: t1\n      members: []\n      capabilities: []\n      goals: []\n      constraints: []\n  relationships: []\n`;
    const result = applyOrgPropertyEdit(
      yamlWithComment, ['organization', 'units', 0], ['name'], 'New',
    );
    expect(result).toContain('# My org');
  });
});

describe('addOrgUnit', () => {
  it('adds a unit with defaults', () => {
    const result = addOrgUnit(MINIMAL_YAML);
    const parsed = parse(result);
    expect(parsed.organization.units).toHaveLength(2);
    expect(parsed.organization.units[1].unitId).toBeDefined();
    expect(parsed.organization.units[1].name).toBe('New Unit');
    expect(parsed.organization.units[1].tenancyId).toBe('t1');
  });

  it('adds a unit with custom defaults', () => {
    const result = addOrgUnit(MINIMAL_YAML, { unitId: 'custom', name: 'Custom Unit' });
    const parsed = parse(result);
    expect(parsed.organization.units[1].unitId).toBe('custom');
    expect(parsed.organization.units[1].name).toBe('Custom Unit');
  });
});

describe('removeOrgUnit', () => {
  it('removes a unit by path', () => {
    const result = removeOrgUnit(MINIMAL_YAML, ['organization', 'units', 0]);
    const parsed = parse(result);
    expect(parsed.organization.units).toHaveLength(0);
  });
});

describe('addMember', () => {
  it('adds a member to a unit', () => {
    const result = addMember(
      MINIMAL_YAML, ['organization', 'units', 0],
      { agentId: 'charlie', role: 'tester' },
    );
    const parsed = parse(result);
    expect(parsed.organization.units[0].members).toHaveLength(3);
    expect(parsed.organization.units[0].members[2].agentId).toBe('charlie');
    expect(parsed.organization.units[0].members[2].role).toBe('tester');
  });

  it('adds a member without role', () => {
    const result = addMember(
      MINIMAL_YAML, ['organization', 'units', 0], { agentId: 'eve' },
    );
    const parsed = parse(result);
    expect(parsed.organization.units[0].members[2].agentId).toBe('eve');
  });
});

describe('removeMember', () => {
  it('removes a member by index', () => {
    const result = removeMember(MINIMAL_YAML, ['organization', 'units', 0], 1);
    const parsed = parse(result);
    expect(parsed.organization.units[0].members).toHaveLength(1);
    expect(parsed.organization.units[0].members[0].agentId).toBe('alice');
  });

  it('removes first member', () => {
    const result = removeMember(MINIMAL_YAML, ['organization', 'units', 0], 0);
    const parsed = parse(result);
    expect(parsed.organization.units[0].members).toHaveLength(1);
    expect(parsed.organization.units[0].members[0].agentId).toBe('bob');
  });
});

describe('addRelationship', () => {
  it('adds a relationship', () => {
    const result = addRelationship(MINIMAL_YAML, {
      sourceAgentId: 'bob',
      targetAgentId: 'alice',
      kind: 'REPORTS_TO',
      tenancyId: 't1',
    });
    const parsed = parse(result);
    expect(parsed.organization.relationships).toHaveLength(2);
    expect(parsed.organization.relationships[1].kind).toBe('REPORTS_TO');
  });
});

describe('removeRelationship', () => {
  it('removes a relationship by path', () => {
    const result = removeRelationship(MINIMAL_YAML, ['organization', 'relationships', 0]);
    const parsed = parse(result);
    expect(parsed.organization.relationships).toHaveLength(0);
  });
});
