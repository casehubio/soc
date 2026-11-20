import type { DataProvider, DataRequest, FetchResult } from "../types.js";
export declare class ServerRelayProvider implements DataProvider {
    private readonly endpoint;
    private readonly fetchFn;
    private readonly tokenFn?;
    constructor(endpoint: string, fetchFn: typeof globalThis.fetch, tokenFn?: (() => string | null) | undefined);
    fetch(request: DataRequest): Promise<FetchResult>;
}
//# sourceMappingURL=server-relay.d.ts.map