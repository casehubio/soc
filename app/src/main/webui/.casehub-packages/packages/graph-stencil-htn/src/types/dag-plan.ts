export type JoinType = 'ALL_OF' | 'ANY_OF';
export type DagDispatchMode = 'STREAMING' | 'BARRIER';

export interface DagNodeSnapshot {
  readonly id: string;
  readonly taskId: string;
  readonly taskDescription?: string;
  readonly executorName?: string;
  readonly dependsOn: readonly string[];
  readonly joinType: JoinType;
}

export interface DagPlanSnapshot {
  readonly nodes: Readonly<Record<string, DagNodeSnapshot>>;
  readonly timestamp: string;
}
