import type { SortColumn } from "@casehubio/pages-data";
export interface ComponentState {
    readonly sort?: SortColumn;
    readonly page?: number;
    readonly textFilter?: string;
}
export type ComponentViewState = Map<string, ComponentState>;
export declare function createComponentViewState(): ComponentViewState;
export declare function updateSort(state: ComponentViewState, componentId: string, sort: SortColumn | undefined): void;
export declare function updatePage(state: ComponentViewState, componentId: string, page: number | undefined): void;
export declare function updateTextFilter(state: ComponentViewState, componentId: string, textFilter: string | undefined): void;
export declare function getComponentState(state: ComponentViewState, componentId: string): ComponentState | undefined;
//# sourceMappingURL=component-view-state.d.ts.map