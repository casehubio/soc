import type { Component, LayoutState, PermissionContext } from "@casehubio/pages-component";
import type { LayoutStore } from "./layout-store.js";
import type { ZoneLayoutEngine } from "./zone-layout-engine.js";
import type { DataProviderConfig } from "@casehubio/pages-data";
import type { Site } from "@casehubio/pages-ui/dist/model/page-types.js";
import type { SaveAdapter } from "./save-adapter.js";
import type { DevAuthConfig } from "./dev-auth.js";
export interface LiveSite extends Site {
    navigate(path: string): void;
    setTheme(mode: "light" | "dark"): void;
    dispose(): void;
    readonly layout: LayoutState;
    activateDockPanel(key: string): boolean;
}
export interface SiteOptions {
    readonly permissions?: PermissionContext;
    readonly fetch?: typeof globalThis.fetch;
    readonly baseUrl?: string;
    readonly providerConfig?: DataProviderConfig;
    readonly adapters?: Readonly<Record<string, SaveAdapter>>;
    readonly layout?: LayoutState;
    readonly layoutStore?: LayoutStore;
    readonly layoutKey?: string;
    readonly layoutSaveDelayMs?: number;
    readonly devAuth?: DevAuthConfig;
    readonly themeName?: string;
    readonly zoneEngine?: ZoneLayoutEngine;
    readonly editMode?: boolean;
    readonly onYamlChange?: (yaml: string) => void;
}
export declare function loadSite(target: HTMLElement, source: string | Component, options?: SiteOptions): Promise<LiveSite>;
//# sourceMappingURL=site.d.ts.map