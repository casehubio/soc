import type { DataSetId, ServerPaginationConfig } from "@casehubio/pages-data";
import type { CachedPage } from "@casehubio/pages-data";
export interface FetchPageOptions {
    sort?: string;
    order?: string;
    filter?: string;
}
export declare class ServerPaginationManager {
    private readonly _datasets;
    private readonly _fetchFn;
    constructor(fetchFn?: typeof globalThis.fetch);
    register(id: DataSetId, config: ServerPaginationConfig, urlTemplate: string, totalPath: string | undefined, dataPath?: string): void;
    has(id: DataSetId): boolean;
    clearCache(id: DataSetId): void;
    fetchPage(id: DataSetId, offset: number, limit: number, options?: FetchPageOptions): Promise<CachedPage | undefined>;
    dispose(): void;
    private _buildUrl;
}
//# sourceMappingURL=server-pagination.d.ts.map