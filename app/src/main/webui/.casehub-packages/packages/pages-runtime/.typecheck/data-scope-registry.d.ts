import type { DataScope } from "@casehubio/pages-ui";
export type DataScopeRegistry = Map<string, DataScope>;
export declare function createDataScopeRegistry(): DataScopeRegistry;
export declare function hasDataScope(registry: DataScopeRegistry, pagePath: string): boolean;
export declare function getDataScope(registry: DataScopeRegistry, pagePath: string): DataScope | undefined;
//# sourceMappingURL=data-scope-registry.d.ts.map