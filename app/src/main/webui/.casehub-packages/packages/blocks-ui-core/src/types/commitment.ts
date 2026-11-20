import type { StateCategory } from './status.js';
export type { StateCategory };

export const COMMITMENT_STATES = [
  'OPEN', 'ACKNOWLEDGED', 'FULFILLED', 'FAILED',
  'DECLINED', 'DELEGATED', 'EXPIRED',
] as const;
export type CommitmentState = typeof COMMITMENT_STATES[number];

export function commitmentStateCategory(state: CommitmentState): StateCategory {
  switch (state) {
    case 'OPEN': return 'active';
    case 'ACKNOWLEDGED': return 'info';
    case 'FULFILLED': return 'success';
    case 'FAILED': return 'danger';
    case 'DECLINED': return 'neutral';
    case 'DELEGATED': return 'transfer';
    case 'EXPIRED': return 'warning';
  }
}

const TERMINAL_STATES: ReadonlySet<CommitmentState> = new Set([
  'FULFILLED', 'FAILED', 'DECLINED', 'DELEGATED', 'EXPIRED',
]);

export function isTerminalCommitmentState(state: CommitmentState): boolean {
  return TERMINAL_STATES.has(state);
}

export interface RawCommitment {
  readonly id: string;
  readonly correlationId: string;
  readonly state: string;
  readonly requester?: string;
  readonly obligor?: string;
  readonly expiresAt?: string | null;
  readonly acknowledgedAt?: string | null;
  readonly resolvedAt?: string | null;
  readonly createdAt?: string | null;
}

export interface CommitmentRecord {
  readonly state: CommitmentState;
  readonly deadline?: string;
  readonly acknowledgedAt?: string;
  readonly resolvedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toCommitmentRecord(raw: RawCommitment): CommitmentRecord {
  const timestamps = [raw.resolvedAt, raw.acknowledgedAt, raw.createdAt]
    .filter((t): t is string => t != null);
  const updatedAt = timestamps.length > 0
    ? timestamps.reduce((a, b) => a > b ? a : b)
    : raw.createdAt ?? new Date().toISOString();

  return {
    state: raw.state as CommitmentState,
    ...(raw.expiresAt != null ? { deadline: raw.expiresAt } : {}),
    ...(raw.acknowledgedAt != null ? { acknowledgedAt: raw.acknowledgedAt } : {}),
    ...(raw.resolvedAt != null ? { resolvedAt: raw.resolvedAt } : {}),
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt,
  };
}

export interface TransitionRecord {
  readonly from: CommitmentState;
  readonly to: CommitmentState;
  readonly actor?: string;
  readonly timestamp: string;
}

export function toCommitmentMap(
  commitments: RawCommitment[],
): Map<string, CommitmentRecord> {
  const map = new Map<string, CommitmentRecord>();
  for (const c of commitments) {
    map.set(c.correlationId, toCommitmentRecord(c));
  }
  return map;
}
