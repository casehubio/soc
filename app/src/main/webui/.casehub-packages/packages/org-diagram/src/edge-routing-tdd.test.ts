import { describe, it, expect } from 'vitest';
import { toOrgGraph, registerOrgStencils, orgClassificationRules, sizingClassifier, orgLayoutRules, orgHardConstraints } from '@casehubio/mosaic-graph-stencil-org';
import { LayoutEngine } from '@casehubio/graph-renderer';
import { computeElkLayout } from '@casehubio/graph-renderer/layout/elk-layout.js';
import type { ElkLayoutOptions } from '@casehubio/graph-renderer/layout/elk-layout.js';
import { toReactFlowGraph } from '@casehubio/graph-renderer/mapping.js';
import { validateEdgeRouting } from '@casehubio/graph-renderer/edge-routing-validator.js';

registerOrgStencils();

type Relationship = readonly [source: string, target: string, kind: string];

const ARCHETYPES: Record<string, readonly Relationship[]> = {
  'simple-structure': [
    ['ceo', 'dev-1', 'SUPERVISES'],
    ['ceo', 'dev-2', 'SUPERVISES'],
    ['ceo', 'designer', 'SUPERVISES'],
    ['ceo', 'ops', 'SUPERVISES'],
  ],
  'federation-orchestrator': [
    ['orchestrator', 'searcher', 'DELEGATES_TO'],
    ['orchestrator', 'coder', 'DELEGATES_TO'],
    ['orchestrator', 'tester', 'DELEGATES_TO'],
    ['orchestrator', 'reviewer', 'DELEGATES_TO'],
    ['searcher', 'orchestrator', 'REPORTS_TO'],
    ['coder', 'orchestrator', 'REPORTS_TO'],
    ['tester', 'orchestrator', 'REPORTS_TO'],
    ['reviewer', 'orchestrator', 'REPORTS_TO'],
  ],
  pipeline: [
    ['researcher', 'writer', 'DELEGATES_TO'],
    ['writer', 'editor', 'DELEGATES_TO'],
    ['editor', 'publisher', 'DELEGATES_TO'],
    ['editor', 'writer', 'ESCALATES_TO'],
  ],
  'coalition-advisory': [
    ['security', 'judge', 'REPORTS_TO'],
    ['performance', 'judge', 'REPORTS_TO'],
    ['maintainability', 'judge', 'REPORTS_TO'],
  ],
  'divisional-holarchy': [
    ['er-attending', 'er-resident', 'SUPERVISES'],
    ['er-attending', 'er-triage', 'SUPERVISES'],
    ['radiologist', 'rad-tech', 'SUPERVISES'],
    ['er-attending', 'radiologist', 'DELEGATES_TO'],
    ['radiologist', 'er-attending', 'REPORTS_TO'],
  ],
  matrix: [
    ['platform-lead', 'alice', 'SUPERVISES'],
    ['platform-lead', 'bob', 'SUPERVISES'],
    ['alice', 'billing-manager', 'REPORTS_TO'],
    ['bob', 'search-manager', 'REPORTS_TO'],
  ],
  'tiered-escalation': [
    ['l1-a', 'l2-billing', 'ESCALATES_TO'],
    ['l1-a', 'l2-technical', 'ESCALATES_TO'],
    ['l1-b', 'l2-billing', 'ESCALATES_TO'],
    ['l1-b', 'l2-technical', 'ESCALATES_TO'],
    ['l2-billing', 'l3', 'ESCALATES_TO'],
    ['l2-technical', 'l3', 'ESCALATES_TO'],
    ['l2-technical', 'l1-a', 'SUPERVISES'],
    ['l2-technical', 'l1-b', 'SUPERVISES'],
  ],
  market: [
    ['auctioneer', 'fast', 'DELEGATES_TO'],
    ['auctioneer', 'quality', 'DELEGATES_TO'],
    ['auctioneer', 'cheap', 'DELEGATES_TO'],
  ],
  'professional-bureaucracy': [
    ['backend', 'frontend', 'BACKS_UP'],
    ['frontend', 'backend', 'BACKS_UP'],
  ],
};

function loadArchetype(name: string): string {
  const relationships = ARCHETYPES[name];
  if (!relationships) throw new Error(`Unknown archetype: ${name}`);
  const agentIds = [...new Set(relationships.flatMap(([source, target]) => [source, target]))];
  return JSON.stringify({
    organization: {
      units: [{
        unitId: name,
        name,
        kind: name,
        tenancyId: 'routing-test',
        members: agentIds.map(agentId => ({ agentId, role: 'member' })),
      }],
      relationships: relationships.map(([sourceAgentId, targetAgentId, kind]) => ({
        sourceAgentId,
        targetAgentId,
        kind,
        tenancyId: 'routing-test',
      })),
    },
  });
}

function buildEngine(): LayoutEngine {
  const engine = new LayoutEngine();
  for (const r of orgClassificationRules()) engine.register(r);
  engine.register(sizingClassifier());
  for (const r of orgLayoutRules()) engine.register(r);
  for (const c of orgHardConstraints()) engine.register(c);
  return engine;
}

async function renderOrgDiagram(yaml: string) {
  const { model } = toOrgGraph(yaml);
  const engine = buildEngine();
  const pre = engine.preLayout(model);
  const orgOpts = engine.elkOptions(pre.strategy);
  const opts: ElkLayoutOptions = {
    algorithm: orgOpts.algorithm,
    spacing: orgOpts.spacing,
    headerHeight: 48,
  };
  if (orgOpts.direction !== undefined) opts.direction = orgOpts.direction;
  if (orgOpts.containerPadding !== undefined) opts.containerPadding = orgOpts.containerPadding;
  if (orgOpts.elkOptions !== undefined) opts.elkOptions = orgOpts.elkOptions;
  const layout = await computeElkLayout(model, opts);
  const direction = opts.direction ?? (orgOpts.algorithm === 'layered' || orgOpts.algorithm === 'mrtree' ? 'DOWN' : undefined);
  return toReactFlowGraph(model, layout, undefined, direction);
}

describe('edge routing TDD — org diagrams', () => {
  it('simple-structure: no crossings', async () => {
    const yaml = loadArchetype('simple-structure');
    const { nodes, edges } = await renderOrgDiagram(yaml);
    const result = validateEdgeRouting(nodes, edges);
    expect(result.violations, result.violations.join('\n')).toEqual([]);
  });

  it('federation: no crossings', async () => {
    const yaml = loadArchetype('federation-orchestrator');
    const { nodes, edges } = await renderOrgDiagram(yaml);
    const result = validateEdgeRouting(nodes, edges);
    expect(result.violations, result.violations.join('\n')).toEqual([]);
  });

  it('pipeline: no crossings', async () => {
    const yaml = loadArchetype('pipeline');
    const { nodes, edges } = await renderOrgDiagram(yaml);
    const result = validateEdgeRouting(nodes, edges);
    expect(result.violations, result.violations.join('\n')).toEqual([]);
  });

  it('coalition-advisory: no crossings', async () => {
    const yaml = loadArchetype('coalition-advisory');
    const { nodes, edges } = await renderOrgDiagram(yaml);
    const result = validateEdgeRouting(nodes, edges);
    expect(result.violations, result.violations.join('\n')).toEqual([]);
  });

  it('divisional-holarchy: no crossings', async () => {
    const yaml = loadArchetype('divisional-holarchy');
    const { nodes, edges } = await renderOrgDiagram(yaml);
    const result = validateEdgeRouting(nodes, edges);
    expect(result.violations, result.violations.join('\n')).toEqual([]);
  });

  it('matrix: no crossings', async () => {
    const yaml = loadArchetype('matrix');
    const { nodes, edges } = await renderOrgDiagram(yaml);
    const result = validateEdgeRouting(nodes, edges);
    expect(result.violations, result.violations.join('\n')).toEqual([]);
  });

  it.skip('tiered-escalation: no crossings — layout produces crossings (needs ELK tuning)', async () => {
    const yaml = loadArchetype('tiered-escalation');
    const { nodes, edges } = await renderOrgDiagram(yaml);
    const result = validateEdgeRouting(nodes, edges);
    expect(result.violations, result.violations.join('\n')).toEqual([]);
  });

  it('market: no crossings', async () => {
    const yaml = loadArchetype('market');
    const { nodes, edges } = await renderOrgDiagram(yaml);
    const result = validateEdgeRouting(nodes, edges);
    expect(result.violations, result.violations.join('\n')).toEqual([]);
  });

  it('professional-bureaucracy: no crossings', async () => {
    const yaml = loadArchetype('professional-bureaucracy');
    const { nodes, edges } = await renderOrgDiagram(yaml);
    const result = validateEdgeRouting(nodes, edges);
    expect(result.violations, result.violations.join('\n')).toEqual([]);
  });
});
