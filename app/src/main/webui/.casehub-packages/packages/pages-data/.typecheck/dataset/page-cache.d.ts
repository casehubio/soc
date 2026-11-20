import type { TypedDataSet } from "./types.js";
export interface PageCacheKey {
    readonly offset: number;
    readonly limit: number;
    readonly sort?: string | undefined;
    readonly order?: string | undefined;
    readonly filter?: string | undefined;
}
export interface CachedPage {
    readonly dataset: TypedDataSet;
    readonly totalRows: number;
}
export declare class PageCache {
    private readonly _maxSize;
    private readonly _entries;
    private readonly _accessOrder;
    constructor(maxSize: number);
    get(key: PageCacheKey): CachedPage | undefined;
    store(key: PageCacheKey, page: CachedPage): void;
    clear(): void;
    get size(): number;
}
//# sourceMappingURL=page-cache.d.ts.map