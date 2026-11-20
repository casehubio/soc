export type DesiredStateNodeStatus =
  | 'CONVERGED'
  | 'PENDING'
  | 'DRIFTED'
  | 'FAULTED'
  | 'PROVISIONING'
  | 'ABSENT';

export interface DesiredStateNode {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly status: DesiredStateNodeStatus;
  readonly desired: string;
  readonly actual: string | null;
  readonly convergencePercent: number | null;
  readonly dependsOn: readonly string[];
  readonly forEach: string | null;
  readonly forEachSource: string | null;
  readonly driftDetectedAt: string | null;
}

export interface DesiredStateSnapshot {
  readonly nodes: readonly DesiredStateNode[];
  readonly lastReconciled: string | null;
}
