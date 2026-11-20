import type { GraphModel, GraphNode } from '@casehubio/graph-core';
import type { AgentDescriptor } from '../types.js';

export function enrichWithDescriptors(
  model: GraphModel,
  agents: Readonly<Record<string, AgentDescriptor>>,
): GraphModel {
  const nodes = model.nodes.map((node): GraphNode => {
    if (node.type !== 'org-agent') return node;
    const agentId = node.properties['agentId'] as string;
    const desc = agents[agentId];
    if (!desc) return node;
    return {
      ...node,
      properties: {
        ...node.properties,
        ...(desc.slot !== undefined ? { slot: desc.slot } : {}),
        ...(desc.capabilities?.length ? { capabilities: desc.capabilities } : {}),
        ...(desc.disposition ? { disposition: desc.disposition } : {}),
        ...(desc.goals?.length ? { goals: desc.goals } : {}),
        ...(desc.constraints?.length ? { constraints: desc.constraints } : {}),
        ...(desc.briefing !== undefined ? { briefing: desc.briefing } : {}),
        ...(desc.avatar !== undefined ? { avatar: desc.avatar } : {}),
        ...(desc.profession !== undefined ? { profession: desc.profession } : {}),
        ...(desc.role !== undefined ? { descriptorRole: desc.role } : {}),
      },
    };
  });
  return { nodes, edges: model.edges };
}
