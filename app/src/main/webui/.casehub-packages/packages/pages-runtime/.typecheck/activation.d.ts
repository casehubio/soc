import type { Component, PermissionContext, LayoutStore, LayoutState } from "@casehubio/pages-component";
import "@casehubio/pages-primitives/dock";
import type { DataSetScope } from "./dataset-scope.js";
import type { ComponentRegistry } from "./registry.js";
import type { PagePathMap } from "./page-paths.js";
import type { PageIndex } from "./navigation.js";
import type { DataScopeRegistry } from "./data-scope-registry.js";
import type { SaveConfigRegistry } from "./save-config-registry.js";
import type { ContextManager } from "./context-wiring.js";
import type { ZoneLayoutEngine } from "./zone-layout-engine.js";
import type { ContainerState } from "@casehubio/pages-component";
import type { Container } from "./frame-sandbox/types.js";
import "@casehubio/pages-ui-components/input";
import "@casehubio/pages-ui-components/select";
import "@casehubio/pages-ui-components/textarea";
import "@casehubio/pages-ui-components/checkbox";
export interface LazyPageOptions {
    readonly fetchFn: typeof globalThis.fetch;
    readonly baseUrl: string | undefined;
    readonly abortSignal: AbortSignal;
    readonly permissions: PermissionContext;
    readonly pageIndex: PageIndex;
    readonly dataSetScope: DataSetScope;
    readonly dataScopeRegistry: DataScopeRegistry;
    readonly saveConfigRegistry: SaveConfigRegistry;
    readonly lazyPageResolutions: Map<Component, Component>;
    readonly zoneEngine?: ZoneLayoutEngine | undefined;
    readonly siteTarget?: HTMLElement | undefined;
    readonly floatingWorkspaceRef?: {
        rootContainer: Container | undefined;
        stash: ContainerState | undefined;
    };
    readonly zoneEngineRef?: {
        current: ZoneLayoutEngine | undefined;
    };
    readonly nestingDepth?: number;
    readonly layoutStore?: LayoutStore | undefined;
    readonly layoutKey?: string | undefined;
    readonly seedLayout?: LayoutState | null | undefined;
}
export declare function createActivationCallback(registry: ComponentRegistry, pagePathMap: PagePathMap, options?: LazyPageOptions, contextManager?: ContextManager): (el: HTMLElement, component: Component) => void;
//# sourceMappingURL=activation.d.ts.map