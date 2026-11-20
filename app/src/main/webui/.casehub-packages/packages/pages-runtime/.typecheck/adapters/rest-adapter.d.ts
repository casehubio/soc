import type { SaveAdapter } from "../save-adapter.js";
export interface RestAdapterConfig {
    readonly method?: "PUT" | "PATCH" | "POST";
    readonly headers?: Readonly<Record<string, string>>;
}
export declare function createRestAdapter(config: RestAdapterConfig | undefined, datasetUrl: string, fetchFn: typeof globalThis.fetch): SaveAdapter;
//# sourceMappingURL=rest-adapter.d.ts.map