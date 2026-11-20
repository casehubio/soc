import type { Component } from "../model/types.js";
export interface LazyConfig {
    readonly slotChildren: Readonly<Record<string, readonly Component[]>>;
    readonly renderSlot: (parent: HTMLElement, children: readonly Component[], slotName: string) => void;
}
export declare function wireInteractivity(container: HTMLElement, type: string, slotNames: readonly string[], panels: Map<string, HTMLElement>, doc?: Document, lazy?: LazyConfig): void;
//# sourceMappingURL=interactive.d.ts.map