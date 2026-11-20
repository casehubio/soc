import type { StateCategory } from './status.js';
export type { StateCategory };
export declare const COMMITMENT_STATES: readonly ["OPEN", "ACKNOWLEDGED", "FULFILLED", "FAILED", "DECLINED", "DELEGATED", "EXPIRED"];
export type CommitmentState = typeof COMMITMENT_STATES[number];
export declare function commitmentStateCategory(state: CommitmentState): StateCategory;
export declare function isTerminalCommitmentState(state: CommitmentState): boolean;
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
export declare function toCommitmentRecord(raw: RawCommitment): CommitmentRecord;
export interface TransitionRecord {
    readonly from: CommitmentState;
    readonly to: CommitmentState;
    readonly actor?: string;
    readonly timestamp: string;
}
export declare function toCommitmentMap(commitments: RawCommitment[]): Map<string, CommitmentRecord>;
//# sourceMappingURL=commitment.d.ts.map