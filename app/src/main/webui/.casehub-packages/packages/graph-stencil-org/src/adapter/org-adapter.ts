import { parseDocument } from 'yaml';
import type { GraphModel, GraphNode, GraphEdge } from '@casehubio/graph-core';
import type { OrgStructureYaml } from '../types.js';

export interface OrgAdapterResult {
  readonly model: GraphModel;
  readonly yamlPaths: ReadonlyMap<string, readonly (string | number)[]>;
}

const RELATIONSHIP_KIND_TO_EDGE_TYPE: Readonly<Record<string, string>> = {
  SUPERVISES: 'org-supervises',
  DELEGATES_TO: 'org-delegates-to',
  ESCALATES_TO: 'org-escalates-to',
  REPORTS_TO: 'org-reports-to',
  BACKS_UP: 'org-backs-up',
  EXTENDED: 'org-extended',
};

function unitNodeId(unitId: string): string {
  return `unit:${unitId}`;
}

function agentNodeId(unitId: string, agentId: string): string {
  return `agent:${unitId}:${agentId}`;
}

function findSharedUnit(
  sourceAgentId: string,
  targetAgentId: string,
  agentIndex: ReadonlyMap<string, readonly string[]>,
): string | undefined {
  const sourceUnits = agentIndex.get(sourceAgentId) ?? [];
  const targetUnits = new Set(agentIndex.get(targetAgentId) ?? []);
  return sourceUnits.find(u => targetUnits.has(u));
}

function resolveAgentNode(
  agentId: string,
  preferredUnitId: string | undefined,
  agentIndex: ReadonlyMap<string, readonly string[]>,
): string {
  const units = agentIndex.get(agentId);
  if (!units || units.length === 0) {
    return `agent:unknown:${agentId}`;
  }
  if (units.length === 1) return agentNodeId(units[0]!, agentId);
  if (preferredUnitId !== undefined && units.includes(preferredUnitId)) {
    return agentNodeId(preferredUnitId, agentId);
  }
  return agentNodeId(units[0]!, agentId);
}

export function toOrgGraph(yaml: string): OrgAdapterResult {
  const doc = parseDocument(yaml);
  const data = doc.toJS() as OrgStructureYaml;
  const org = data.organization;

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const yamlPaths = new Map<string, readonly (string | number)[]>();

  const agentIndex = new Map<string, string[]>();
  for (const unit of org.units) {
    for (const member of unit.members ?? []) {
      let units = agentIndex.get(member.agentId);
      if (!units) {
        units = [];
        agentIndex.set(member.agentId, units);
      }
      units.push(unit.unitId);
    }
  }

  for (let i = 0; i < org.units.length; i++) {
    const unit = org.units[i]!;
    const nodeId = unitNodeId(unit.unitId);
    const unitProps: Record<string, unknown> = {
        unitId: unit.unitId,
        name: unit.name,
        kind: unit.kind,
        kindVocabulary: unit.kindVocabulary,
        label: unit.name,
        memberCount: (unit.members ?? []).length,
        capabilities: unit.capabilities ?? [],
        goals: unit.goals ?? [],
        constraints: unit.constraints ?? [],
    };
    const unitNode: GraphNode = unit.parentUnitId !== undefined
      ? { id: nodeId, type: 'org-unit', parentId: unitNodeId(unit.parentUnitId), properties: unitProps }
      : { id: nodeId, type: 'org-unit', properties: unitProps };
    nodes.push(unitNode);
    yamlPaths.set(nodeId, ['organization', 'units', i]);

    const members = unit.members ?? [];
    for (let j = 0; j < members.length; j++) {
      const member = members[j]!;
      const aId = agentNodeId(unit.unitId, member.agentId);
      nodes.push({
        id: aId,
        type: 'org-agent',
        parentId: nodeId,
        properties: {
          agentId: member.agentId,
          role: member.role,
          roleVocabulary: member.roleVocabulary,
          unitId: unit.unitId,
          label: member.agentId,
        },
      });
      yamlPaths.set(aId, ['organization', 'units', i, 'members', j]);
    }
  }

  const relationships = org.relationships ?? [];
  for (let i = 0; i < relationships.length; i++) {
    const rel = relationships[i]!;
    const edgeType = RELATIONSHIP_KIND_TO_EDGE_TYPE[rel.kind] ?? 'org-extended';

    const sharedUnit = findSharedUnit(rel.sourceAgentId, rel.targetAgentId, agentIndex);
    const sourceNode = resolveAgentNode(rel.sourceAgentId, sharedUnit, agentIndex);
    const targetNode = resolveAgentNode(rel.targetAgentId, sharedUnit, agentIndex);

    const edgeId = `${sourceNode}--${edgeType}--${targetNode}--${i}`;
    const properties: Record<string, unknown> = {
      kind: rel.kind,
      relIndex: i,
    };
    if (rel.extendedKind !== undefined) properties['extendedKind'] = rel.extendedKind;
    if (rel.scope !== undefined) properties['scope'] = rel.scope;
    if (rel.attestation !== undefined) properties['attestation'] = rel.attestation;
    edges.push({
      id: edgeId,
      type: edgeType,
      source: sourceNode,
      target: targetNode,
      properties,
    });
    yamlPaths.set(edgeId, ['organization', 'relationships', i]);
  }

  const hasDelegateTo = edges.some(e => e.properties?.['kind'] === 'DELEGATES_TO');
  const delegatePairs = new Set<string>();
  for (const edge of edges) {
    if (edge.properties?.['kind'] === 'DELEGATES_TO') {
      delegatePairs.add(`${edge.source}→${edge.target}`);
    }
  }
  for (const edge of edges) {
    const kind = edge.properties?.['kind'] as string | undefined;
    if (kind === 'BACKS_UP' || kind === 'ESCALATES_TO') {
      (edge.properties as Record<string, unknown>)['excludeFromLayout'] = true;
    } else if (hasDelegateTo && kind === 'SUPERVISES') {
      (edge.properties as Record<string, unknown>)['excludeFromLayout'] = true;
    } else if (kind === 'REPORTS_TO' && delegatePairs.has(`${edge.target}→${edge.source}`)) {
      const srcNode = nodes.find(n => n.id === edge.source);
      const tgtNode = nodes.find(n => n.id === edge.target);
      if (srcNode?.parentId && srcNode.parentId === tgtNode?.parentId) {
        (edge.properties as Record<string, unknown>)['excludeFromLayout'] = true;
      }
    }
  }

  return { model: { nodes, edges }, yamlPaths };
}
