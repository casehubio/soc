import type { DataProvider, FetchResult } from "../types.js";
export declare class PostMessageProvider implements DataProvider {
    private readonly dataSetId;
    private readonly timeoutMs;
    constructor(dataSetId: string, timeoutMs?: number);
    fetch(): Promise<FetchResult>;
}
//# sourceMappingURL=post-message.d.ts.map