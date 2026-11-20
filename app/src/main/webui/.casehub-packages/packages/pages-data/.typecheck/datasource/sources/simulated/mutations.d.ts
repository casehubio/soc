/**
 * Mutation DSL for simulated data sources.
 *
 * Each mutation is a pure descriptor — a data object that declares *what*
 * should change. `evaluateMutations()` is the engine that evaluates all
 * mutations against a snapshot of current rows and collects the resulting
 * DataSetEvents for atomic application.
 *
 * Design invariant: **snapshot semantics** — every mutation within a single
 * tick evaluates against the row state at tick-start. Mutation A's changes
 * are NOT visible to mutation B within the same tick.
 */
import type { Column, ColumnId, TypedRow } from "../../../dataset/types.js";
import type { DataSetEvent } from "../../../dataset/events.js";
import { type MutationTiming, type TransitionTracking } from "./mutation-tracking.js";
export interface TransitionMutation {
    readonly kind: "transition";
    readonly column: string;
    readonly from: string;
    readonly to: string;
    readonly after: readonly [minMs: number, maxMs: number];
    readonly probability: number;
    /** Internal — populated by evaluateMutations on first tick. */
    tracking: TransitionTracking | null;
}
export interface IncrementMutation {
    readonly kind: "increment";
    readonly column: string;
    readonly by: number;
    readonly every: number;
    readonly ceiling?: number;
    /** Internal — populated by evaluateMutations on first tick. */
    timing: MutationTiming | null;
}
export interface DecrementMutation {
    readonly kind: "decrement";
    readonly column: string;
    readonly by: number;
    readonly every: number;
    readonly floor?: number;
    /** Internal — populated by evaluateMutations on first tick. */
    timing: MutationTiming | null;
}
export interface AddRowMutation {
    readonly kind: "addRow";
    readonly probability: number;
    readonly generator: () => Record<string, unknown>;
}
export interface RemoveRowMutation {
    readonly kind: "removeRow";
    readonly predicate: (row: Record<string, unknown>) => boolean;
    readonly probability: number;
}
export interface ConditionalMutation {
    readonly kind: "when";
    readonly predicate: (row: Record<string, unknown>) => boolean;
    readonly mutations: readonly Mutation[];
}
export type Mutation = TransitionMutation | IncrementMutation | DecrementMutation | AddRowMutation | RemoveRowMutation | ConditionalMutation;
export declare function transition(column: string, opts: {
    from: string;
    to: string;
    after: [minMs: number, maxMs: number];
    probability?: number;
}): TransitionMutation;
export declare function increment(column: string, opts: {
    by: number;
    every: number;
    ceiling?: number;
}): IncrementMutation;
export declare function decrement(column: string, opts: {
    by: number;
    every: number;
    floor?: number;
}): DecrementMutation;
export declare function addRow(opts: {
    probability: number;
    generator: () => Record<string, unknown>;
}): AddRowMutation;
export declare function removeRow(opts: {
    predicate: (row: Record<string, unknown>) => boolean;
    probability?: number;
}): RemoveRowMutation;
export declare function when(predicate: (row: Record<string, unknown>) => boolean, ...mutations: Mutation[]): ConditionalMutation;
export interface EvalContext {
    readonly columns: readonly Column[];
    readonly keyColumn: ColumnId;
    readonly elapsed: number;
    /** Random function for testing — defaults to Math.random. */
    readonly random?: () => number;
}
/**
 * Evaluate all mutations against a snapshot of the current rows.
 *
 * Returns the collected DataSetEvents and the new row state (rows array
 * with all changes applied atomically). This is the core of the simulation
 * engine.
 *
 * All mutations evaluate against `snapshotRows` — the rows at tick start.
 * Changes are collected and applied atomically after all evaluations.
 */
export declare function evaluateMutations(snapshotRows: readonly TypedRow[], mutations: readonly Mutation[], ctx: EvalContext): {
    events: DataSetEvent[];
    rows: TypedRow[];
};
//# sourceMappingURL=mutations.d.ts.map