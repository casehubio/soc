import type { ColumnId, ColumnType, DataSetId, TypedDataSet } from "../types.js";
export declare enum HttpMethod {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    DELETE = "DELETE"
}
export interface ExternalColumnDef {
    readonly id: ColumnId;
    readonly name?: string;
    readonly type: ColumnType;
}
export interface ExtractionDef {
    readonly url?: string;
    readonly content?: string;
    readonly dataPath?: string;
    readonly type?: string;
    readonly expression?: string;
    readonly columns?: readonly ExternalColumnDef[];
    readonly accumulate?: boolean;
}
export interface ServerPaginationConfig {
    readonly offsetParam: string;
    readonly limitParam: string;
    readonly sortParam?: string | undefined;
    readonly orderParam?: string | undefined;
    readonly filterParam?: string | undefined;
    readonly defaultPageSize: number;
    readonly maxCachedPages?: number | undefined;
    readonly totalPath?: string | undefined;
}
export interface ExternalDataSetDef extends ExtractionDef {
    readonly uuid: DataSetId;
    readonly name?: string;
    readonly join?: readonly DataSetId[];
    readonly serverQuery?: boolean;
    readonly serverPagination?: ServerPaginationConfig;
    readonly method?: HttpMethod;
    readonly headers?: Readonly<Record<string, string>>;
    readonly query?: Readonly<Record<string, string>>;
    readonly form?: Readonly<Record<string, string>>;
    readonly body?: string;
    readonly cacheEnabled?: boolean;
    readonly cacheMaxRows?: number;
    readonly refreshTime?: string;
    readonly cacheTtl?: string;
    readonly keyColumn?: string;
}
export interface DataRequest {
    readonly url: string;
    readonly method: HttpMethod;
    readonly headers: Readonly<Record<string, string>>;
    readonly query: Readonly<Record<string, string>>;
    readonly form?: Readonly<Record<string, string>>;
    readonly body?: string;
    readonly signal?: AbortSignal;
    readonly refreshTimeSeconds?: number;
}
export interface FetchResult {
    readonly data: unknown;
    readonly contentType?: string;
}
export interface PagesDataMessage {
    readonly type: "casehub-pages-dataset";
    readonly dataSetId: string;
    readonly data: unknown;
    readonly contentType?: string;
}
export interface ExtractionPreset {
    readonly id: string;
    readonly expression: string;
}
export interface PresetRegistry {
    get(id: string): ExtractionPreset | undefined;
    has(id: string): boolean;
}
export interface DataProvider {
    fetch(request: DataRequest): Promise<FetchResult>;
}
export interface WebSocketAuthConfig {
    readonly type: "query-param";
    readonly paramName?: string;
    readonly token: string;
}
export interface ServiceCapabilities {
    readonly serverSideQuery: boolean;
    readonly dataProviders: readonly string[];
    readonly dataProxy: boolean;
    readonly serverSideCache: boolean;
}
export declare const LOCAL_CAPABILITIES: ServiceCapabilities;
export declare function isServiceCapabilities(obj: unknown): obj is ServiceCapabilities;
export interface DataProviderConfig {
    readonly defaultProvider?: "browser" | "server-relay";
    readonly corsProxy?: {
        readonly url: string;
        readonly enabled: boolean;
    };
    readonly serverRelay?: {
        readonly endpoint: string;
        readonly tokenFn?: () => string | null;
    };
    readonly webSocket?: {
        readonly relay?: {
            readonly endpoint: string;
        };
        readonly auth?: WebSocketAuthConfig;
    };
    readonly sse?: {
        readonly auth?: {
            readonly type: "query-param";
            readonly paramName?: string;
            readonly token: string;
        };
    };
    readonly serverQuery?: {
        readonly endpoint: string;
        readonly tokenFn?: () => string | null;
    };
    readonly capabilities?: {
        readonly endpoint: string;
    };
}
export interface ExtractionResult {
    readonly dataset: TypedDataSet;
    readonly inferredColumns: boolean;
}
export interface ResolveResult {
    readonly dataset: TypedDataSet;
    readonly inferredColumns: boolean;
    readonly source: "url" | "content" | "join" | "serverQuery";
}
export declare function parseRefreshTime(str: string): number;
//# sourceMappingURL=types.d.ts.map