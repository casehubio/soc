import type { Layout } from "./types.js";
export interface ContainerToolbarCallbacks {
    onAdd: () => void;
    onLayoutChange: (type: Layout) => void;
    onArrange?: (preset: string) => void;
}
export interface ContainerToolbar {
    readonly element: HTMLElement;
    setActive(type: Layout): void;
    dispose(): void;
}
export declare function createContainerToolbar(allowedOrganisers: readonly Layout[], activeOrganiser: Layout, callbacks: ContainerToolbarCallbacks): ContainerToolbar;
//# sourceMappingURL=container-toolbar.d.ts.map