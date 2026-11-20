import type { FrameTabConfig, ContentFactory } from "@casehubio/pages-component";
export interface AccordionState {
    readonly collapsed: readonly string[];
    readonly heights: Readonly<Record<string, number>>;
}
export interface AccordionHandle {
    dispose(): void;
    getState(): AccordionState;
    onStateChange(cb: (state: AccordionState) => void): void;
    onSectionClose(cb: (key: string) => void): void;
    addSection(tab: FrameTabConfig): void;
    removeSection(key: string): void;
}
export declare function renderAccordion(tabs: readonly FrameTabConfig[], container: HTMLElement, contentFactory: ContentFactory, options?: {
    collapsed?: readonly string[];
    heights?: Readonly<Record<string, number>>;
    signal?: AbortSignal;
}): AccordionHandle;
//# sourceMappingURL=frame-accordion.d.ts.map