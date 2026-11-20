import type { DataSource } from "../types.js";
import type { DataSetId } from "../../dataset/types.js";
import type { DataSetLookup } from "../../dataset/lookup.js";
export interface ServerQuerySourceOptions {
    readonly tokenFn?: () => string | null;
    readonly operations?: DataSetLookup["operations"];
}
/**
 * Creates a DataSource that fetches data via server-side SQL query.
 *
 * Wraps the existing ServerQueryClient. The server executes the query and
 * returns typed results.
 *
 * @param endpoint - Server query endpoint URL
 * @param dataSetId - Dataset ID to query for
 * @param options - Optional auth token function and operations
 * @param fetchFn - Optional fetch override for testing
 */
export declare function serverQuerySource(endpoint: string, dataSetId: DataSetId, options?: ServerQuerySourceOptions, fetchFn?: typeof globalThis.fetch): DataSource;
//# sourceMappingURL=server-query-source.d.ts.map