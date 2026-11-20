export type NodeStatus = 'CONVERGED' | 'DRIFTED' | 'FAULTED' | 'PROVISIONING' | 'ABSENT';

export interface NodeReconciliationStatus {
  readonly nodeId: string;
  readonly nodeType: string;
  readonly desired: string;
  readonly actual: string;
  readonly status: NodeStatus;
}

export interface ClusterReconciliationStatus {
  readonly clusterId: string;
  readonly clusterName: string;
  readonly nodeCount: number;
  readonly convergedCount: number;
  readonly driftedCount: number;
  readonly faultedCount: number;
  readonly nodes: NodeReconciliationStatus[];
}

export interface ReconciliationSnapshot {
  readonly clusters: ClusterReconciliationStatus[];
  readonly lastReconciled?: string;
}
