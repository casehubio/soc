import type { DataSetLookup } from "../../lookup.js";
import type { DataSetOp } from "../../ops.js";
import type { TypedDataSet } from "../../types.js";
export declare class ServerQueryClient {
    private readonly endpoint;
    private readonly fetchFn;
    private readonly tokenFn?;
    constructor(endpoint: string, fetchFn: typeof globalThis.fetch, tokenFn?: (() => string | null) | undefined);
    query(lookup: DataSetLookup): Promise<{
        dataset: TypedDataSet;
        remainingOps: DataSetOp[];
    }>;
}
//# sourceMappingURL=server-query.d.ts.map