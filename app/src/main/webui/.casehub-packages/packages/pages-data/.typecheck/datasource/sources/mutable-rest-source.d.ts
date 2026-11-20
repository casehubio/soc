import type { MutableDataSource, DataAction } from "../types.js";
import type { ExternalColumnDef } from "../../dataset/external/types.js";
export type UrlTemplate = string | ((action: DataAction) => string);
export interface WriteEndpoint {
    readonly url: UrlTemplate;
    readonly method?: string;
}
export interface WriteConfig {
    readonly update?: WriteEndpoint;
    readonly create?: WriteEndpoint;
    readonly delete?: WriteEndpoint;
    readonly headers?: Record<string, string>;
    readonly refreshAfterWrite?: boolean;
    readonly keyColumn?: string;
}
export interface MutableRestSourceOptions {
    readonly columns?: readonly ExternalColumnDef[];
    readonly dataPath?: string;
    readonly fetchFn?: typeof globalThis.fetch;
    readonly writeFetchFn?: typeof globalThis.fetch;
}
export declare function mutableRestSource(readUrl: string, writeConfig: WriteConfig, options?: MutableRestSourceOptions): MutableDataSource;
//# sourceMappingURL=mutable-rest-source.d.ts.map