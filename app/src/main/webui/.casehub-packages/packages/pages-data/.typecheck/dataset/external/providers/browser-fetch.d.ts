import type { DataProvider, DataRequest, FetchResult } from "../types.js";
export declare class BrowserFetchProvider implements DataProvider {
    private readonly _fetch;
    private readonly _baseUrl;
    constructor(fetchFn?: typeof globalThis.fetch, baseUrl?: string);
    fetch(request: DataRequest): Promise<FetchResult>;
}
//# sourceMappingURL=browser-fetch.d.ts.map