import type { LitElement } from "lit";
import { DataSourceAdapter } from "./data-source-adapter.js";
import type { TypedDataSet, SourceFactory } from "@casehubio/pages-data";
type Constructor<T = Record<string, unknown>> = new (...args: any[]) => T;
export declare function DataSourceMixin<T extends Constructor<LitElement>>(Base: T): Constructor<{
    endpoint?: string;
    loading: boolean;
    error: string;
    dataSet: TypedDataSet | undefined;
    dataSource: DataSourceAdapter;
    createSourceFactory(): SourceFactory;
    resolveEndpoint(): string | undefined;
    syncEndpoint(): void;
    configure(props: Record<string, unknown>): void;
}> & T;
export {};
//# sourceMappingURL=data-source-mixin.d.ts.map