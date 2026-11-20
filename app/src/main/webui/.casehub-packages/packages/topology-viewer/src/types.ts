export type TopologyNodeStatus = 'RUNNING' | 'DEGRADED' | 'DEPLOYING' | 'FAULTED' | 'ABSENT';

export interface TopologyNode {
  readonly id: string;
  readonly name: string;
  readonly status: TopologyNodeStatus;
  readonly replicas?: number;
  readonly image?: string;
  readonly type?: string;
}

export interface TopologyEdge {
  readonly source: string;
  readonly target: string;
  readonly label?: string;
}

export interface TopologySnapshot {
  readonly services: TopologyNode[];
  readonly edges: TopologyEdge[];
}
