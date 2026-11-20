export type NodeStateKind = 'Pending' | 'Dispatched' | 'Completed'
  | 'Failed' | 'Skipped' | 'Cancelled';

export interface NodeStateSnapshot {
  readonly kind: NodeStateKind;
  readonly reason?: string;
}

export interface DagResultSnapshot {
  readonly nodeStates: Readonly<Record<string, NodeStateSnapshot>>;
  readonly completedResults?: Readonly<Record<string, unknown>>;
  readonly allSucceeded: boolean;
  readonly elapsed: string;
  readonly timestamp: string;
}
