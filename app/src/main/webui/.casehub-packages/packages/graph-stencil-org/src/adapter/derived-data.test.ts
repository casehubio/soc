import { describe, it, expect } from 'vitest';
import { computeDerivedData } from './derived-data.js';
import { toOrgGraph } from './org-adapter.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const GASTOWN_YAML = readFileSync(
  resolve(__dirname, '../test-fixtures/gastown-org.yaml'),
  'utf-8',
);

describe('computeDerivedData', () => {
  it('computes supervision targets', () => {
    const base = toOrgGraph(GASTOWN_YAML);
    const { model } = computeDerivedData(base.model);
    const witnessAlpha = model.nodes.find(n => n.properties['agentId'] === 'witness-alpha');
    const targets = witnessAlpha!.properties['supervisionTargets'] as string[];
    expect(targets).toEqual(expect.arrayContaining(['polecat-1', 'polecat-2']));
  });

  it('computes backup agents with scope', () => {
    const base = toOrgGraph(GASTOWN_YAML);
    const { model } = computeDerivedData(base.model);
    const polecat1 = model.nodes.find(n => n.properties['agentId'] === 'polecat-1');
    const backups = polecat1!.properties['backupAgents'] as any[];
    expect(backups).toHaveLength(1);
    expect(backups[0]).toMatchObject({
      agentId: 'polecat-2',
      scope: 'code-analysis',
      direction: 'backs',
    });
  });

  it('computes backup as backed-by on target side', () => {
    const base = toOrgGraph(GASTOWN_YAML);
    const { model } = computeDerivedData(base.model);
    const polecat2 = model.nodes.find(n => n.properties['agentId'] === 'polecat-2');
    const backups = polecat2!.properties['backupAgents'] as any[];
    expect(backups).toHaveLength(1);
    expect(backups[0]).toMatchObject({
      agentId: 'polecat-1',
      scope: 'code-analysis',
      direction: 'backed-by',
    });
  });

  it('computes attestation grants from edges with attestation', () => {
    const base = toOrgGraph(GASTOWN_YAML);
    const { attestationSummary } = computeDerivedData(base.model);
    expect(attestationSummary.length).toBeGreaterThan(0);
    expect(attestationSummary[0]).toMatchObject({
      source: 'deacon',
      target: 'witness-alpha',
      scope: 'rig-monitoring',
      dimensions: ['LATENCY', 'ATTESTATION_RATE'],
    });
  });

  it('computes per-agent attestation grants', () => {
    const base = toOrgGraph(GASTOWN_YAML);
    const { model } = computeDerivedData(base.model);
    const deacon = model.nodes.find(n => n.properties['agentId'] === 'deacon');
    const grants = deacon!.properties['attestationGrants'] as any[];
    expect(grants).toBeDefined();
    expect(grants.length).toBeGreaterThan(0);
    expect(grants[0]).toMatchObject({
      targetAgentId: 'witness-alpha',
      scope: 'rig-monitoring',
      dimensions: ['LATENCY', 'ATTESTATION_RATE'],
    });
  });

  it('detects escalation cycle without infinite loop', () => {
    const cycleYaml = `
organization:
  units:
    - unitId: u1
      name: U1
      tenancyId: t1
      members:
        - agentId: a1
        - agentId: a2
        - agentId: a3
      capabilities: []
      goals: []
      constraints: []
  relationships:
    - sourceAgentId: a1
      targetAgentId: a2
      kind: ESCALATES_TO
      tenancyId: t1
    - sourceAgentId: a2
      targetAgentId: a3
      kind: ESCALATES_TO
      tenancyId: t1
    - sourceAgentId: a3
      targetAgentId: a1
      kind: ESCALATES_TO
      tenancyId: t1
`;
    const base = toOrgGraph(cycleYaml);
    const { model, escalationChains } = computeDerivedData(base.model);
    const a1 = model.nodes.find(n => n.properties['agentId'] === 'a1');
    const chain = a1!.properties['escalationChain'] as string[];
    expect(chain.length).toBeLessThanOrEqual(3);
    expect(escalationChains.length).toBe(0);
  });

  it('returns escalation chains for panel', () => {
    const escYaml = `
organization:
  units:
    - unitId: u1
      name: U1
      tenancyId: t1
      members:
        - agentId: worker1
        - agentId: supervisor
        - agentId: boss
      capabilities: []
      goals: []
      constraints: []
  relationships:
    - sourceAgentId: worker1
      targetAgentId: supervisor
      kind: ESCALATES_TO
      tenancyId: t1
    - sourceAgentId: supervisor
      targetAgentId: boss
      kind: ESCALATES_TO
      tenancyId: t1
`;
    const base = toOrgGraph(escYaml);
    const { escalationChains } = computeDerivedData(base.model);
    expect(escalationChains.length).toBeGreaterThan(0);
    const chain = escalationChains.find(c => c.path[0] === 'worker1');
    expect(chain).toBeDefined();
    expect(chain!.path).toEqual(['worker1', 'supervisor', 'boss']);
    expect(chain!.terminal).toBe('boss');
  });

  it('sets escalation chain on agent node (excluding self)', () => {
    const escYaml = `
organization:
  units:
    - unitId: u1
      name: U1
      tenancyId: t1
      members:
        - agentId: worker1
        - agentId: supervisor
        - agentId: boss
      capabilities: []
      goals: []
      constraints: []
  relationships:
    - sourceAgentId: worker1
      targetAgentId: supervisor
      kind: ESCALATES_TO
      tenancyId: t1
    - sourceAgentId: supervisor
      targetAgentId: boss
      kind: ESCALATES_TO
      tenancyId: t1
`;
    const base = toOrgGraph(escYaml);
    const { model } = computeDerivedData(base.model);
    const worker = model.nodes.find(n => n.properties['agentId'] === 'worker1');
    const chain = worker!.properties['escalationChain'] as string[];
    expect(chain).toEqual(['supervisor', 'boss']);
  });

  it('preserves original model', () => {
    const base = toOrgGraph(GASTOWN_YAML);
    const { model } = computeDerivedData(base.model);
    expect(model).not.toBe(base.model);
    const origWitness = base.model.nodes.find(n => n.properties['agentId'] === 'witness-alpha');
    expect(origWitness!.properties['supervisionTargets']).toBeUndefined();
  });
});
