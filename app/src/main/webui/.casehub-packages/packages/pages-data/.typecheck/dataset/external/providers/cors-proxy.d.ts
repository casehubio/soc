import type { DataProvider, DataRequest, FetchResult } from "../types.js";
export declare class CorsProxyProvider implements DataProvider {
    private readonly inner;
    private readonly proxyUrl;
    constructor(inner: DataProvider, proxyUrl: string);
    fetch(request: DataRequest): Promise<FetchResult>;
}
//# sourceMappingURL=cors-proxy.d.ts.map