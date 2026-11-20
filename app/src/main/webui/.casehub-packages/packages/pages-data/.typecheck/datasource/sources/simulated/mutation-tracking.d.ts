/**
 * Internal tracking state for mutations.
 *
 * - TransitionTracking: per-row state for `transition()` — records when a row
 *   entered the "from" state and its randomised delay.
 * - MutationTiming: per-mutation cadence for `increment()` / `decrement()` —
 *   tracks the last scenario-time the mutation fired.
 */
/** Per-row tracking entry for transition mutations. */
export interface TransitionEntry {
    readonly enteredAt: number;
    readonly delay: number;
}
/**
 * Per-row state tracking for a single transition mutation.
 * Keys are stringified row identities (the key column value).
 */
export interface TransitionTracking {
    readonly entries: Map<string, TransitionEntry>;
}
export declare function createTransitionTracking(): TransitionTracking;
/**
 * Record that a row just entered the "from" state.
 * Picks a random delay in [minMs, maxMs].
 */
export declare function trackRowEntry(tracking: TransitionTracking, rowKey: string, enteredAt: number, minMs: number, maxMs: number): void;
/** Remove tracking for a row that left the "from" state. */
export declare function untrackRow(tracking: TransitionTracking, rowKey: string): void;
/** Check whether a row's delay has elapsed at the given scenario time. */
export declare function isDelayElapsed(tracking: TransitionTracking, rowKey: string, currentElapsed: number): boolean;
/** Tracks the last scenario-time a mutation fired (global, not per-row). */
export interface MutationTiming {
    lastFiredAt: number;
}
export declare function createMutationTiming(startAt?: number): MutationTiming;
/**
 * Check whether the mutation's `every` interval has elapsed since its last
 * firing, and if so, reset the timer and return true.
 */
export declare function shouldFire(timing: MutationTiming, every: number, currentElapsed: number): boolean;
//# sourceMappingURL=mutation-tracking.d.ts.map