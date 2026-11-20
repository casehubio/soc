import type { Component } from "@casehubio/pages-component";
import type { DataSetId } from "@casehubio/pages-data";
import type { ExternalDataSetDef } from "@casehubio/pages-data";
import type { DataSourceBinding } from "@casehubio/pages-data";
import type { PagePathMap } from "./page-paths.js";
/**
 * A dataset entry in scope is either a legacy ExternalDataSetDef (from YAML)
 * or a DataSourceBinding (from the programmatic API).
 */
export type DataSetEntry = ExternalDataSetDef | DataSourceBinding;
export type DataSetScope = Map<string, Map<DataSetId, DataSetEntry>>;
/**
 * Type guard: returns true if the entry is a DataSourceBinding (has `source`),
 * false if it is a legacy ExternalDataSetDef (has `uuid`).
 */
export declare function isBinding(entry: DataSetEntry): entry is DataSourceBinding;
/**
 * Type guard: returns true if the entry is a legacy ExternalDataSetDef.
 */
export declare function isDef(entry: DataSetEntry): entry is ExternalDataSetDef;
export declare function buildDataSetScope(root: Component, paths: PagePathMap): DataSetScope;
export declare function extendDataSetScope(root: Component, inherited: Map<DataSetId, DataSetEntry>, paths: PagePathMap, scope: DataSetScope): void;
export declare function resolveDataSetDef(dataSetId: DataSetId, pagePath: string, scope: DataSetScope): ExternalDataSetDef | undefined;
export declare function resolveDataSetEntry(dataSetId: DataSetId, pagePath: string, scope: DataSetScope): DataSetEntry | undefined;
//# sourceMappingURL=dataset-scope.d.ts.map