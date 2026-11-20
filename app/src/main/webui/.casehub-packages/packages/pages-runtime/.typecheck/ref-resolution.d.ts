import type { DataSetOp } from "@casehubio/pages-data";
import type { DataSetManager } from "@casehubio/pages-data";
import type { DataScope } from "@casehubio/pages-ui";
import type { FilterState } from "./cross-filter.js";
import type { DataScopeRegistry } from "./data-scope-registry.js";
export declare function resolveRefBindings(dataScope: DataScope, dataScopeRegistry: DataScopeRegistry, filterState: FilterState, manager: DataSetManager, pagePath: string, visited?: Set<string>): DataSetOp[];
//# sourceMappingURL=ref-resolution.d.ts.map