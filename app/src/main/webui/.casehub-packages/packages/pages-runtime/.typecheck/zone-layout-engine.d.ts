import type { Component, DockZone, DockWorkbenchConfig } from "@casehubio/pages-component";
export interface ZoneLayoutEngine {
    readonly config: DockWorkbenchConfig;
    readonly zoneMap: ReadonlyMap<string, DockZone>;
    buildTree(): Component;
    movePanel(panelKey: string, targetZone: DockZone, insertIndex?: number): Component;
    getConstraints(panelKey: string): {
        allowedZones: readonly DockZone[];
        fixed: boolean;
    };
    getValidDropZones(panelKey: string): readonly DockZone[];
    getZoneOrder(zone: DockZone): readonly string[];
}
export declare function createZoneLayoutEngine(config: DockWorkbenchConfig, savedZones?: Readonly<Record<string, DockZone>>): ZoneLayoutEngine;
//# sourceMappingURL=zone-layout-engine.d.ts.map