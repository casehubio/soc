import type { ZoneLayoutEngine } from "./zone-layout-engine.js";
import type { DockBarProps } from "@casehubio/pages-component";
export interface DockBarOptions {
    readonly zoneEngine?: ZoneLayoutEngine | undefined;
    readonly siteTarget?: HTMLElement | undefined;
}
export declare function renderDockBar(el: HTMLElement, props: DockBarProps, options?: DockBarOptions): void;
//# sourceMappingURL=dock-bar-renderer.d.ts.map