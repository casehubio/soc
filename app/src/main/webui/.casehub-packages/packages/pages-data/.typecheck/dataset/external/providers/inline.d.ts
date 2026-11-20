import type { DataProvider, FetchResult } from "../types.js";
export declare class InlineProvider implements DataProvider {
    private readonly content;
    constructor(content: string);
    fetch(_request: import("../types.js").DataRequest): Promise<FetchResult>;
}
//# sourceMappingURL=inline.d.ts.map