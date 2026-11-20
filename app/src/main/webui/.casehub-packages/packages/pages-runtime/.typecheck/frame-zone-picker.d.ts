import type { SnapZone } from "@casehubio/pages-component";
export declare const ZONES: Array<{
    zone: SnapZone;
    label: string;
    col: number;
    row: number;
    colSpan?: number;
    rowSpan?: number;
}>;
export declare function createZoneGrid(onSnap: (zone: SnapZone) => void, currentZone?: SnapZone): HTMLElement;
//# sourceMappingURL=frame-zone-picker.d.ts.map