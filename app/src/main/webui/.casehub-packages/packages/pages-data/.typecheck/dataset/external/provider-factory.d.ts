import type { DataProvider, DataProviderConfig, ExternalDataSetDef } from "./types.js";
export interface DataProviderFactory {
    create(def: ExternalDataSetDef, config: DataProviderConfig): DataProvider | undefined;
}
export declare function createDataProviderFactory(fetchFn?: typeof globalThis.fetch, baseUrl?: string): DataProviderFactory;
//# sourceMappingURL=provider-factory.d.ts.map