import type { AgentRelationship } from '@casehubio/mosaic-graph-stencil-org';

export interface RelationshipChangeset {
  additions: AgentRelationship[];
  removals: AgentRelationship[];
}

export interface AgentRosterEntry {
  agentId: string;
  name: string;
  unitId?: string;
}
