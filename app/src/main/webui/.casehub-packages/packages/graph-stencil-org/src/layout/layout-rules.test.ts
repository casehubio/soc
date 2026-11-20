import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { toOrgGraph } from '../adapter/org-adapter.js';
import { enrichWithDescriptors } from '../adapter/enrichment.js';
import { computeDerivedData } from '../adapter/derived-data.js';
import { resolveKindColors } from '../adapter/kind-colors.js';
import { OrgLayoutEngine } from './engine.js';
import { orgClassificationRules } from './classification-rules.js';
import { sizingClassifier, orgLayoutRules, orgHardConstraints, AGENT_WIDTH } from './layout-rules.js';
import type { LayoutNode, LayoutEdge } from './types.js';

const GASTOWN_YAML = `organization:
  units:
    - unitId: oversight
      name: Oversight Chain
      kind: supervision-hierarchy
      tenancyId: gastown
      members:
        - agentId: boot
          role: root-watchdog
        - agentId: deacon
          role: cross-rig-watchdog
      capabilities: []
      goals: []
      constraints: []
    - unitId: rig-alpha
      name: Rig Alpha
      kind: rig
      tenancyId: gastown
      members:
        - agentId: witness-alpha
          role: witness
        - agentId: polecat-1
          role: worker
        - agentId: polecat-2
          role: worker
      capabilities:
        - name: full-stack-code-work
    - unitId: rig-beta
      name: Rig Beta
      kind: rig
      tenancyId: gastown
      members:
        - agentId: witness-beta
          role: witness
        - agentId: polecat-3
          role: worker
      capabilities:
        - name: full-stack-code-work
  relationships:
    - sourceAgentId: boot
      targetAgentId: deacon
      kind: SUPERVISES
      tenancyId: gastown
    - sourceAgentId: deacon
      targetAgentId: witness-alpha
      kind: SUPERVISES
      tenancyId: gastown
    - sourceAgentId: deacon
      targetAgentId: witness-beta
      kind: SUPERVISES
      tenancyId: gastown
    - sourceAgentId: witness-alpha
      targetAgentId: polecat-1
      kind: SUPERVISES
      tenancyId: gastown
    - sourceAgentId: witness-alpha
      targetAgentId: polecat-2
      kind: SUPERVISES
      tenancyId: gastown
    - sourceAgentId: witness-beta
      targetAgentId: polecat-3
      kind: SUPERVISES
      tenancyId: gastown
    - sourceAgentId: polecat-1
      targetAgentId: witness-alpha
      kind: ESCALATES_TO
      tenancyId: gastown
    - sourceAgentId: polecat-2
      targetAgentId: witness-alpha
      kind: ESCALATES_TO
      tenancyId: gastown
    - sourceAgentId: polecat-3
      targetAgentId: witness-beta
      kind: ESCALATES_TO
      tenancyId: gastown
    - sourceAgentId: witness-alpha
      targetAgentId: deacon
      kind: ESCALATES_TO
      tenancyId: gastown
    - sourceAgentId: witness-beta
      targetAgentId: deacon
      kind: ESCALATES_TO
      tenancyId: gastown
    - sourceAgentId: deacon
      targetAgentId: boot
      kind: ESCALATES_TO
      tenancyId: gastown
    - sourceAgentId: polecat-1
      targetAgentId: polecat-2
      kind: BACKS_UP
      tenancyId: gastown
`;

const GASTOWN_AGENTS = {
  boot: { slot: 'root-watchdog', disposition: { autonomy: 'high' as const }, capabilities: [{ name: 'system-oversight' }] },
  deacon: { slot: 'cross-rig-watchdog', disposition: { ruleFollowing: 'principled' as const }, capabilities: [{ name: 'rig-monitoring' }] },
  'witness-alpha': { slot: 'witness', disposition: { socialOrient: 'collaborative' as const }, capabilities: [{ name: 'code-review' }] },
  'witness-beta': { slot: 'witness', disposition: { socialOrient: 'collaborative' as const }, capabilities: [{ name: 'code-review' }] },
  'polecat-1': { slot: 'worker', disposition: { autonomy: 'semi-auto' as const }, capabilities: [{ name: 'full-stack-code-work' }] },
  'polecat-2': { slot: 'worker', disposition: { autonomy: 'semi-auto' as const }, capabilities: [{ name: 'full-stack-code-work' }] },
  'polecat-3': { slot: 'worker', disposition: { autonomy: 'semi-auto' as const }, capabilities: [{ name: 'full-stack-code-work' }] },
};

function buildEngine(): OrgLayoutEngine {
  const engine = new OrgLayoutEngine();
  for (const r of orgClassificationRules()) engine.register(r);
  engine.register(sizingClassifier());
  for (const r of orgLayoutRules()) engine.register(r);
  for (const c of orgHardConstraints()) engine.register(c);
  return engine;
}

function buildGastownModel() {
  const base = toOrgGraph(GASTOWN_YAML);
  const enriched = enrichWithDescriptors(base.model, GASTOWN_AGENTS);
  const derived = computeDerivedData(enriched);
  return resolveKindColors(derived.model);
}

function buildGastownNodes(model: ReturnType<typeof buildGastownModel>, sizes: ReadonlyMap<string, { width: number; height: number }>): LayoutNode[] {
  return model.nodes.map(n => {
    const size = sizes.get(n.id);
    return {
      id: n.id,
      type: n.type,
      parentId: n.parentId,
      position: { x: 0, y: 0 },
      width: size?.width ?? 280,
      height: size?.height ?? 50,
      style: n.type === 'org-unit' ? { width: 280, height: 180 } : undefined,
    };
  });
}

describe('sizing classifier', () => {
  it('produces node sizes via engine preLayout', () => {
    const model = buildGastownModel();
    const engine = buildEngine();
    const result = engine.preLayout(model);
    expect(result.nodeSizes.size).toBeGreaterThan(0);
    for (const [, size] of result.nodeSizes) {
      expect(size.width).toBe(AGENT_WIDTH);
      expect(size.height).toBeGreaterThan(0);
    }
  });

  it('returns larger height for enriched agents', () => {
    const model = buildGastownModel();
    const engine = buildEngine();
    const result = engine.preLayout(model);
    const bootId = model.nodes.find(n => n.id.includes('boot'))!.id;
    const boot = result.nodeSizes.get(bootId);
    expect(boot).toBeDefined();
    expect(boot!.height).toBeGreaterThan(40);
  });

  it('does not compute sizes for unit containers', () => {
    const model = buildGastownModel();
    const engine = buildEngine();
    const result = engine.preLayout(model);
    for (const node of model.nodes) {
      if (node.type === 'org-unit') {
        expect(result.nodeSizes.has(node.id)).toBe(false);
      }
    }
  });
});

describe('Gastown composition via engine', () => {
  it('horizontal internal layout produces no agent overlap', () => {
    const model = buildGastownModel();
    const engine = buildEngine();
    const pre = engine.preLayout(model);
    const nodes = buildGastownNodes(model, pre.nodeSizes);
    const result = engine.postLayout(nodes, [], pre.facts);
    expect(result.violations.filter(v => v.rule === 'HR3:no-agent-overlap')).toEqual([]);
  });

  it('agents remain within containers after full pipeline', () => {
    const model = buildGastownModel();
    const engine = buildEngine();
    const pre = engine.preLayout(model);
    const nodes = buildGastownNodes(model, pre.nodeSizes);
    const result = engine.postLayout(nodes, [], pre.facts);
    expect(result.violations.filter(v => v.rule === 'HR2:agent-containment')).toEqual([]);
  });

  it('all hard rules pass after full engine pipeline', () => {
    const model = buildGastownModel();
    const engine = buildEngine();
    const pre = engine.preLayout(model);
    const nodes = buildGastownNodes(model, pre.nodeSizes);
    const result = engine.postLayout(nodes, [], pre.facts);
    expect(result.violations).toEqual([]);
  });

  it('Oversight Chain has agents in horizontal row', () => {
    const model = buildGastownModel();
    const engine = buildEngine();
    const pre = engine.preLayout(model);
    const nodes = buildGastownNodes(model, pre.nodeSizes);
    engine.postLayout(nodes, [], pre.facts);
    const boot = nodes.find(n => n.id.includes('boot'))!;
    const deacon = nodes.find(n => n.id.includes('deacon'))!;
    expect(boot.position.y).toBe(deacon.position.y);
    expect(boot.position.x).not.toBe(deacon.position.x);
  });

  it('Rig Alpha agents are in a horizontal row', () => {
    const model = buildGastownModel();
    const engine = buildEngine();
    const pre = engine.preLayout(model);
    const nodes = buildGastownNodes(model, pre.nodeSizes);
    engine.postLayout(nodes, [], pre.facts);
    const witness = nodes.find(n => n.id.includes('witness-alpha'))!;
    const p1 = nodes.find(n => n.id.includes('polecat-1'))!;
    const p2 = nodes.find(n => n.id.includes('polecat-2'))!;
    expect(witness.position.y).toBe(p1.position.y);
    expect(p1.position.y).toBe(p2.position.y);
  });

  it('containers resize to fit children', () => {
    const model = buildGastownModel();
    const engine = buildEngine();
    const pre = engine.preLayout(model);
    const nodes = buildGastownNodes(model, pre.nodeSizes);
    engine.postLayout(nodes, [], pre.facts);
    for (const container of nodes.filter(n => n.type === 'org-unit')) {
      const children = nodes.filter(n => n.parentId === container.id);
      if (children.length < 2) continue;
      const cw = container.width ?? (container.style?.['width'] as number) ?? 0;
      const ch = container.height ?? (container.style?.['height'] as number) ?? 0;
      for (const child of children) {
        expect(child.position.x + (child.width ?? 280)).toBeLessThanOrEqual(cw as number);
        expect(child.position.y + (child.height ?? 50)).toBeLessThanOrEqual(ch as number);
      }
    }
  });
});

describe('edge routing rule', () => {
  it('assigns forward handles for SUPERVISES edges within same container', () => {
    const engine = buildEngine();
    const facts = engine.preLayout({ nodes: [], edges: [] }).facts;
    const nodes: LayoutNode[] = [
      { id: 'u1', type: 'org-unit', position: { x: 0, y: 0 }, width: 800, height: 400 },
      { id: 'a1', type: 'org-agent', parentId: 'u1', position: { x: 10, y: 68 }, width: 280, height: 50 },
      { id: 'a2', type: 'org-agent', parentId: 'u1', position: { x: 320, y: 68 }, width: 280, height: 50 },
    ];
    const edges: LayoutEdge[] = [
      { id: 'e1', type: 'org-supervises', source: 'a1', target: 'a2' },
    ];
    engine.postLayout(nodes, edges, facts);
    expect(edges[0]!.sourceHandle).toBeDefined();
    expect(edges[0]!.targetHandle).toBeDefined();
  });

  it('assigns reverse handles for ESCALATES_TO edges', () => {
    const engine = buildEngine();
    const facts = engine.preLayout({ nodes: [], edges: [] }).facts;
    const nodes: LayoutNode[] = [
      { id: 'u1', type: 'org-unit', position: { x: 0, y: 0 }, width: 800, height: 400 },
      { id: 'a1', type: 'org-agent', parentId: 'u1', position: { x: 10, y: 68 }, width: 280, height: 50 },
      { id: 'a2', type: 'org-agent', parentId: 'u1', position: { x: 320, y: 68 }, width: 280, height: 50 },
    ];
    const edges: LayoutEdge[] = [
      { id: 'e1', type: 'org-escalates-to', source: 'a1', target: 'a2' },
    ];
    engine.postLayout(nodes, edges, facts);
    expect(edges[0]!.sourceHandle).toBe('source-top');
    expect(edges[0]!.targetHandle).toBe('target-top');
  });
});

describe('hard constraint rules (isolated — no layout rules)', () => {
  function constraintOnlyEngine(): OrgLayoutEngine {
    const engine = new OrgLayoutEngine();
    for (const c of orgHardConstraints()) engine.register(c);
    return engine;
  }

  it('detects overlapping containers', () => {
    const engine = constraintOnlyEngine();
    const facts = engine.preLayout({ nodes: [], edges: [] }).facts;
    const nodes: LayoutNode[] = [
      { id: 'u1', type: 'org-unit', position: { x: 0, y: 0 }, width: 150, height: 100 },
      { id: 'u2', type: 'org-unit', position: { x: 100, y: 0 }, width: 150, height: 100 },
    ];
    const result = engine.postLayout(nodes, [], facts);
    expect(result.violations.some(v => v.rule === 'HR1:no-container-overlap')).toBe(true);
  });

  it('detects agent exceeding container', () => {
    const engine = constraintOnlyEngine();
    const facts = engine.preLayout({ nodes: [], edges: [] }).facts;
    const nodes: LayoutNode[] = [
      { id: 'u1', type: 'org-unit', position: { x: 0, y: 0 }, width: 200, height: 200 },
      { id: 'a1', type: 'org-agent', parentId: 'u1', position: { x: 10, y: 68 }, width: 280, height: 100 },
    ];
    const result = engine.postLayout(nodes, [], facts);
    expect(result.violations.some(v => v.rule === 'HR2:agent-containment')).toBe(true);
  });

  it('detects overlapping agents', () => {
    const engine = constraintOnlyEngine();
    const facts = engine.preLayout({ nodes: [], edges: [] }).facts;
    const nodes: LayoutNode[] = [
      { id: 'u1', type: 'org-unit', position: { x: 0, y: 0 }, width: 800, height: 200 },
      { id: 'a1', type: 'org-agent', parentId: 'u1', position: { x: 10, y: 68 }, width: 280, height: 100 },
      { id: 'a2', type: 'org-agent', parentId: 'u1', position: { x: 100, y: 68 }, width: 280, height: 100 },
    ];
    const result = engine.postLayout(nodes, [], facts);
    expect(result.violations.some(v => v.rule === 'HR3:no-agent-overlap')).toBe(true);
  });

  it('passes when containers do not overlap', () => {
    const engine = constraintOnlyEngine();
    const facts = engine.preLayout({ nodes: [], edges: [] }).facts;
    const nodes: LayoutNode[] = [
      { id: 'u1', type: 'org-unit', position: { x: 0, y: 0 }, width: 100, height: 100 },
      { id: 'u2', type: 'org-unit', position: { x: 200, y: 0 }, width: 100, height: 100 },
    ];
    const result = engine.postLayout(nodes, [], facts);
    expect(result.violations.filter(v => v.rule === 'HR1:no-container-overlap')).toEqual([]);
  });
});

// ─── Archetype Composition Tests ────────────────────────────────────

const ARCHETYPES_DIR = resolve(
  __dirname,
  '../test-fixtures/archetypes',
);

function loadArchetypeYaml(name: string): string {
  return readFileSync(resolve(ARCHETYPES_DIR, `${name}.yaml`), 'utf-8');
}

function runFullPipeline(yaml: string) {
  const { model } = toOrgGraph(yaml);
  const engine = buildEngine();
  const pre = engine.preLayout(model);
  const nodes: LayoutNode[] = model.nodes.map(n => {
    const size = pre.nodeSizes.get(n.id);
    return {
      id: n.id, type: n.type, parentId: n.parentId,
      position: { x: 0, y: 0 },
      width: size?.width ?? 280, height: size?.height ?? 50,
      style: n.type === 'org-unit' ? { width: 280, height: 180 } : undefined,
    };
  });
  return engine.postLayout(nodes, [], pre.facts);
}

describe('archetype composition — no hard rule violations', () => {
  const archetypes = [
    'simple-structure',
    'federation-orchestrator',
    'pipeline',
    'coalition-advisory',
    'tiered-escalation',
    'professional-bureaucracy',
  ];

  for (const name of archetypes) {
    it(`${name}: passes all hard rules after engine pipeline`, () => {
      const result = runFullPipeline(loadArchetypeYaml(name));
      expect(result.violations).toEqual([]);
    });
  }
});
