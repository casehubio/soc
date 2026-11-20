import type { Component, PermissionContext } from "../model/types.js";
export interface RenderOptions {
    readonly permissions?: PermissionContext;
    readonly document?: Document;
    readonly onNode?: (el: HTMLElement, component: Component) => void;
}
export declare function renderComponent(target: HTMLElement, component: Component, options?: RenderOptions): void;
//# sourceMappingURL=render.d.ts.map