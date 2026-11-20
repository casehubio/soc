import type { DataSetManager } from "../manager.js";
import type { ExternalDataSetDef, DataProvider, DataProviderConfig, PresetRegistry, ResolveResult, ServiceCapabilities } from "./types.js";
import type { DataSetLookup } from "../lookup.js";
export interface ResolverContext {
    readonly manager: DataSetManager;
    readonly providerFactory: {
        create(def: ExternalDataSetDef, config: DataProviderConfig): DataProvider | undefined;
    };
    readonly providerConfig: DataProviderConfig;
    readonly presetRegistry: PresetRegistry;
    readonly capabilities: ServiceCapabilities;
}
export declare function resolveExternalDataSet(def: ExternalDataSetDef, ctx: ResolverContext, lookup?: DataSetLookup, fetchFn?: typeof globalThis.fetch): Promise<ResolveResult>;
//# sourceMappingURL=resolver.d.ts.map