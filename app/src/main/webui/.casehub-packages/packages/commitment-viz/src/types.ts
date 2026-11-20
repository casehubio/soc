import type { CommitmentState, CommitmentRecord, StateCategory, TransitionRecord } from '@casehubio/mosaic-core';

export type { CommitmentState, CommitmentRecord, StateCategory, TransitionRecord };

export interface DecorableMessage {
  readonly id: string;
  readonly correlationId?: string;
}

export interface RangeDecoration {
  readonly correlationId: string;
  readonly state: CommitmentState;
  readonly category: StateCategory;
  readonly startMessageId: string;
  readonly endMessageId?: string | undefined;
  readonly messageIds: readonly string[];
}
