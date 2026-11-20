/**
 * Simulated data source.
 *
 * Takes an initial data source and a set of mutation rules that evolve the
 * data over scenario time. Implements both `DataSource` and `MutableDataSource`
 * — ticks apply mutations automatically, and `dispatch()` allows external
 * actions (e.g. user clicks "Assign").
 *
 * Lifecycle:
 *   1. connect(sink) → connects the initial DataSource with a wrapper sink
 *   2. On first snapshot from initial → captures as internal state,
 *      disconnects initial, starts tick timer via controller.schedule()
 *   3. Each tick → evaluateMutations with snapshot semantics → emit events
 *   4. disconnect() → cancels tick timer
 *
 * Edge cases:
 *   - Initial source error → propagated to sink, no tick timer started
 *   - Non-snapshot events from initial → ignored
 *   - Disconnect before initial snapshot → disconnects initial, no tick timer
 */
import type { DataSource, MutableDataSource } from "../../types.js";
import type { PlaybookController } from "../../controller.js";
import type { Mutation } from "./mutations.js";
export interface SimulatedConfig {
    readonly initial: DataSource;
    readonly controller: PlaybookController;
    readonly interval?: number;
    readonly mutations: readonly Mutation[];
    readonly keyColumn?: string;
}
export declare function simulated(config: SimulatedConfig): DataSource & MutableDataSource;
//# sourceMappingURL=simulated-source.d.ts.map