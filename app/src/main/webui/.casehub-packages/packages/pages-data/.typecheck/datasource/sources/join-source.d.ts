import type { DataSource } from "../types.js";
import type { DataSetId } from "../../dataset/types.js";
import type { DataSetManager } from "../../dataset/manager.js";
/**
 * Creates a DataSource that joins multiple existing datasets by concatenating
 * their rows. Wraps the existing synchronous `joinDataSets()`.
 *
 * All constituent datasets must already be registered in the DataSetManager at
 * connect time. Reactive re-evaluation on constituent changes is a future
 * enhancement — the current system is also non-reactive.
 *
 * @param manager - DataSetManager containing the constituent datasets
 * @param sourceIds - IDs of datasets to join (must share identical schemas)
 */
export declare function joinSource(manager: DataSetManager, ...sourceIds: DataSetId[]): DataSource;
//# sourceMappingURL=join-source.d.ts.map