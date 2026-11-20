import type { DataSource } from "../types.js";
import type { ExternalColumnDef } from "../../dataset/external/types.js";
export interface FetchSourceOptions {
    readonly method?: string;
    readonly headers?: Record<string, string> | (() => Record<string, string>);
    readonly body?: string;
    readonly fetchFn?: typeof globalThis.fetch;
    readonly columns?: readonly ExternalColumnDef[];
    readonly dataPath?: string;
    readonly totalPath?: string;
}
export declare function fetchSource(url: string, options?: FetchSourceOptions): DataSource;
//# sourceMappingURL=fetch-source.d.ts.map