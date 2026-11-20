import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { toOrgGraph } from '../adapter/org-adapter.js';
import { OrgLayoutEngine } from './engine.js';
import { orgClassificationRules } from './classification-rules.js';
import type { ArchetypeName, OrgLayoutStrategy } from './types.js';

const ARCHETYPES_DIR = resolve(
  __dirname,
  '../test-fixtures/archetypes',
);

function classifyFile(name: string): { archetype: ArchetypeName; strategy: OrgLayoutStrategy; confidence: string } {
  const yaml = readFileSync(resolve(ARCHETYPES_DIR, `${name}.yaml`), 'utf-8');
  return classifyYaml(yaml);
}

function classifyYaml(yaml: string): { archetype: ArchetypeName; strategy: OrgLayoutStrategy; confidence: string } {
  const { model } = toOrgGraph(yaml);
  const engine = new OrgLayoutEngine();
  for (const rule of orgClassificationRules()) engine.register(rule);
  const result = engine.preLayout(model);
  return {
    archetype: result.archetype.archetype,
    strategy: result.strategy,
    confidence: result.archetype.confidence,
  };
}

describe('classification rules — archetype detection', () => {
  it('detects simple-structure archetype', () => {
    const r = classifyFile('simple-structure');
    expect(r.archetype).toBe('simple-structure');
    expect(r.strategy).toBe('star');
  });

  it('detects divisional-holarchy archetype', () => {
    const r = classifyFile('divisional-holarchy');
    expect(r.archetype).toBe('divisional-holarchy');
    expect(r.strategy).toBe('nested');
  });

  it('detects federation archetype', () => {
    const r = classifyFile('federation-orchestrator');
    expect(r.archetype).toBe('federation');
    expect(r.strategy).toBe('hub-spoke');
  });

  it('detects pipeline archetype', () => {
    const r = classifyFile('pipeline');
    expect(r.archetype).toBe('pipeline');
    expect(r.strategy).toBe('flow');
  });

  it('detects market archetype', () => {
    const r = classifyFile('market');
    expect(r.archetype).toBe('market');
    expect(r.strategy).toBe('radial');
  });

  it('detects matrix archetype', () => {
    const r = classifyFile('matrix');
    expect(r.archetype).toBe('matrix');
    expect(r.strategy).toBe('grid');
  });

  it('detects tiered-escalation archetype', () => {
    const r = classifyFile('tiered-escalation');
    expect(r.archetype).toBe('tiered-escalation');
    expect(r.strategy).toBe('layered');
  });

  it('detects professional-bureaucracy archetype', () => {
    const r = classifyFile('professional-bureaucracy');
    expect(r.archetype).toBe('professional-bureaucracy');
    expect(r.strategy).toBe('circular');
  });

  it('detects coalition archetype', () => {
    const r = classifyFile('coalition-advisory');
    expect(r.archetype).toBe('coalition');
    expect(r.strategy).toBe('radial');
  });

  it('detects hierarchy from inline fixture (depth > 2)', () => {
    const yaml = `organization:
  units:
    - unitId: org
      name: Organization
      tenancyId: t1
      members:
        - agentId: ceo
        - agentId: vp1
        - agentId: vp2
        - agentId: mgr1
        - agentId: mgr2
        - agentId: eng1
        - agentId: eng2
      capabilities: []
      goals: []
      constraints: []
  relationships:
    - sourceAgentId: ceo
      targetAgentId: vp1
      kind: SUPERVISES
      tenancyId: t1
    - sourceAgentId: ceo
      targetAgentId: vp2
      kind: SUPERVISES
      tenancyId: t1
    - sourceAgentId: vp1
      targetAgentId: mgr1
      kind: SUPERVISES
      tenancyId: t1
    - sourceAgentId: vp1
      targetAgentId: mgr2
      kind: SUPERVISES
      tenancyId: t1
    - sourceAgentId: mgr1
      targetAgentId: eng1
      kind: SUPERVISES
      tenancyId: t1
    - sourceAgentId: mgr2
      targetAgentId: eng2
      kind: SUPERVISES
      tenancyId: t1
`;
    const r = classifyYaml(yaml);
    expect(r.archetype).toBe('hierarchy');
    expect(r.strategy).toBe('tree');
  });

  it('falls back to force for empty graph', () => {
    const r = classifyYaml('organization:\n  units: []\n  relationships: []');
    expect(r.strategy).toBe('force');
    expect(r.confidence).toBe('low');
  });

  it('falls back to force for no relationships', () => {
    const yaml = `organization:
  units:
    - unitId: team
      name: Team
      tenancyId: t1
      members:
        - agentId: alice
      capabilities: []
      goals: []
      constraints: []
  relationships: []
`;
    const r = classifyYaml(yaml);
    expect(r.strategy).toBe('force');
    expect(r.confidence).toBe('low');
  });
});

describe('classification rules — structural facts', () => {
  it('asserts escalation-count for tiered-escalation', () => {
    const yaml = readFileSync(resolve(ARCHETYPES_DIR, 'tiered-escalation.yaml'), 'utf-8');
    const { model } = toOrgGraph(yaml);
    const engine = new OrgLayoutEngine();
    for (const rule of orgClassificationRules()) engine.register(rule);
    const result = engine.preLayout(model);
    expect(result.facts.has('graph', 'has-escalation-chains')).toBe(true);
    expect(result.facts.get('graph', 'escalation-count')).toBeGreaterThanOrEqual(2);
  });

  it('asserts supervision-depth for hierarchy', () => {
    const yaml = `organization:
  units:
    - unitId: org
      name: Org
      tenancyId: t1
      members:
        - agentId: a
        - agentId: b
        - agentId: c
        - agentId: d
      capabilities: []
      goals: []
      constraints: []
  relationships:
    - sourceAgentId: a
      targetAgentId: b
      kind: SUPERVISES
      tenancyId: t1
    - sourceAgentId: b
      targetAgentId: c
      kind: SUPERVISES
      tenancyId: t1
    - sourceAgentId: c
      targetAgentId: d
      kind: SUPERVISES
      tenancyId: t1
`;
    const { model } = toOrgGraph(yaml);
    const engine = new OrgLayoutEngine();
    for (const rule of orgClassificationRules()) engine.register(rule);
    const result = engine.preLayout(model);
    expect(result.facts.get('graph', 'supervision-depth')).toBeGreaterThan(2);
  });

  it('asserts has-nested-units for holarchy', () => {
    const yaml = readFileSync(resolve(ARCHETYPES_DIR, 'divisional-holarchy.yaml'), 'utf-8');
    const { model } = toOrgGraph(yaml);
    const engine = new OrgLayoutEngine();
    for (const rule of orgClassificationRules()) engine.register(rule);
    const result = engine.preLayout(model);
    expect(result.facts.has('graph', 'has-nested-containers')).toBe(true);
  });
});
