import type { DataSource, DataSink } from '../types.js';
export interface TypedFetchOptions {
    readonly method?: string;
    readonly headers?: Record<string, string>;
}
export declare function createTypedFetchSource<T>(url: string, handler: (data: T, sink: DataSink, signal: AbortSignal) => void, options?: TypedFetchOptions): DataSource;
//# sourceMappingURL=typed-fetch-source.d.ts.map