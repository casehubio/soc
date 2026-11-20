import type { DataSetId } from "@casehubio/pages-data";
import type { DataSetManager } from "@casehubio/pages-data";
import type { DataSetLookup } from "@casehubio/pages-data";
import type { ResolverContext } from "@casehubio/pages-data";
import type { DataSourceBinding } from "@casehubio/pages-data";
import type { ComponentRegistry } from "./registry.js";
import type { DataSetScope } from "./dataset-scope.js";
import type { FilterState } from "./cross-filter.js";
import type { DataScopeRegistry } from "./data-scope-registry.js";
import type { ComponentViewState } from "./component-view-state.js";
import type { ContextManager } from "./context-wiring.js";
import type { VizTarget } from "@casehubio/pages-component";
export type { VizTarget } from "@casehubio/pages-component";
export interface DataPipeline {
    handleDataRequest(target: VizTarget, lookup: DataSetLookup, componentId: string, binding?: DataSourceBinding): void;
    setResolverCtx(ctx: ResolverContext): void;
    dispose(): void;
    refreshDataSet(dataSetId: DataSetId): void;
    deliverDataSet(dataSetId: DataSetId): void;
    deliverAll(): void;
}
export declare function createDataPipeline(manager: DataSetManager, scope: DataSetScope, registry: ComponentRegistry, filterState: FilterState, dataScopeRegistry: DataScopeRegistry, componentViewState: ComponentViewState, contextManager?: ContextManager, target?: HTMLElement, fetchFn?: typeof globalThis.fetch): DataPipeline;
//# sourceMappingURL=data-pipeline.d.ts.map