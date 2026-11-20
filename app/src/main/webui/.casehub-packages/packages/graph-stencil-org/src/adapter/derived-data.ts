import type { GraphModel, GraphNode } from '@casehubio/graph-core';
import type { RelationshipScope, AttestationGrant } from '../types.js';

export interface SupervisionEntry {
  readonly supervisor: string;
  readonly targets: readonly string[];
}

export interface DerivedOrgData {
  readonly model: GraphModel;
  readonly escalationChains: readonly { path: string[]; terminal: string }[];
  readonly supervisionSummary: readonly SupervisionEntry[];
  readonly attestationSummary: readonly {
    source: string; target: string;
    scope?: string; dimensions: string[];
    signalTypes?: string[];
  }[];
}

export function computeDerivedData(model: GraphModel): DerivedOrgData {
  const agentNodes = model.nodes.filter(n => n.type === 'org-agent');
  const nodeIdToAgentId = new Map(agentNodes.map(n => [n.id, n.properties['agentId'] as string]));

  const supervisionTargets = new Map<string, string[]>();
  const escalatesTo = new Map<string, string>();
  const backupEdges: { source: string; target: string; scope?: string }[] = [];
  const attestations: DerivedOrgData['attestationSummary'][number][] = [];

  for (const edge of model.edges) {
    const srcAgent = nodeIdToAgentId.get(edge.source);
    const tgtAgent = nodeIdToAgentId.get(edge.target);
    if (!srcAgent || !tgtAgent) continue;
    const kind = edge.properties?.['kind'] as string | undefined;
    const scope = edge.properties?.['scope'] as RelationshipScope | undefined;
    const attestation = edge.properties?.['attestation'] as AttestationGrant | undefined;

    if (kind === 'SUPERVISES') {
      let targets = supervisionTargets.get(srcAgent);
      if (!targets) { targets = []; supervisionTargets.set(srcAgent, targets); }
      targets.push(tgtAgent);
    }
    if (kind === 'ESCALATES_TO') {
      escalatesTo.set(srcAgent, tgtAgent);
    }
    if (kind === 'BACKS_UP') {
      const entry: { source: string; target: string; scope?: string } = { source: srcAgent, target: tgtAgent };
      if (scope?.capabilityName) entry.scope = scope.capabilityName;
      backupEdges.push(entry);
    }
    if (attestation) {
      const attEntry: DerivedOrgData['attestationSummary'][number] = {
        source: srcAgent, target: tgtAgent,
        dimensions: [...attestation.dimensions],
      };
      if (scope?.capabilityName) attEntry.scope = scope.capabilityName;
      if (attestation.signalTypes) attEntry.signalTypes = [...attestation.signalTypes];
      attestations.push(attEntry);
    }
  }

  function walkEscalation(start: string): { chain: string[]; terminal: string } {
    const chain = [start];
    const visited = new Set([start]);
    let current = start;
    while (escalatesTo.has(current)) {
      const next = escalatesTo.get(current)!;
      if (visited.has(next)) {
        return { chain, terminal: `${next} (cycle)` };
      }
      chain.push(next);
      visited.add(next);
      current = next;
    }
    return { chain, terminal: current };
  }

  const escalationTargetSet = new Set(escalatesTo.values());
  const leafEscalators: string[] = [];
  for (const src of escalatesTo.keys()) {
    if (!escalationTargetSet.has(src)) leafEscalators.push(src);
  }
  const escalationChains = leafEscalators.map(leaf => {
    const { chain, terminal } = walkEscalation(leaf);
    return { path: chain, terminal };
  });

  const agentBackups = new Map<string, { agentId: string; scope?: string; direction: 'backs' | 'backed-by' }[]>();
  for (const { source, target, scope } of backupEdges) {
    let srcList = agentBackups.get(source);
    if (!srcList) { srcList = []; agentBackups.set(source, srcList); }
    const srcEntry: { agentId: string; scope?: string; direction: 'backs' | 'backed-by' } = { agentId: target, direction: 'backs' };
    if (scope) srcEntry.scope = scope;
    srcList.push(srcEntry);
    let tgtList = agentBackups.get(target);
    if (!tgtList) { tgtList = []; agentBackups.set(target, tgtList); }
    const tgtEntry: { agentId: string; scope?: string; direction: 'backs' | 'backed-by' } = { agentId: source, direction: 'backed-by' };
    if (scope) tgtEntry.scope = scope;
    tgtList.push(tgtEntry);
  }

  const agentAttestations = new Map<string, { targetAgentId: string; scope?: string; dimensions: string[]; signalTypes?: string[] }[]>();
  for (const att of attestations) {
    let list = agentAttestations.get(att.source);
    if (!list) { list = []; agentAttestations.set(att.source, list); }
    const grantEntry: { targetAgentId: string; scope?: string; dimensions: string[]; signalTypes?: string[] } = { targetAgentId: att.target, dimensions: att.dimensions };
    if (att.scope) grantEntry.scope = att.scope;
    if (att.signalTypes) grantEntry.signalTypes = att.signalTypes;
    list.push(grantEntry);
  }

  const nodes = model.nodes.map((node): GraphNode => {
    if (node.type !== 'org-agent') return node;
    const agentId = node.properties['agentId'] as string;
    const props: Record<string, unknown> = { ...node.properties };
    const targets = supervisionTargets.get(agentId);
    if (targets?.length) props['supervisionTargets'] = targets;
    const { chain } = walkEscalation(agentId);
    if (chain.length > 1) props['escalationChain'] = chain.slice(1);
    const backups = agentBackups.get(agentId);
    if (backups?.length) props['backupAgents'] = backups;
    const grants = agentAttestations.get(agentId);
    if (grants?.length) props['attestationGrants'] = grants;
    return { ...node, properties: props };
  });

  const supervisionSummary: SupervisionEntry[] = [];
  for (const [supervisor, targets] of supervisionTargets) {
    supervisionSummary.push({ supervisor, targets });
  }

  return {
    model: { nodes, edges: model.edges },
    escalationChains,
    supervisionSummary,
    attestationSummary: attestations,
  };
}
