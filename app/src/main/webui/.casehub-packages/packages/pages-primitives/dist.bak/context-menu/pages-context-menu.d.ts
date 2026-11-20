import { LitElement, type TemplateResult } from 'lit';
export interface MenuItem {
    label: string;
    action?: string;
    shortcut?: string;
    disabled?: boolean;
    separator?: boolean;
    children?: MenuItem[];
}
declare const PagesContextMenu_base: (new (...args: any[]) => {
    trapFocus(container: HTMLElement): void;
    releaseFocus(): void;
}) & typeof LitElement;
export declare class PagesContextMenu extends PagesContextMenu_base {
    items: MenuItem[];
    open: boolean;
    anchor: HTMLElement | undefined;
    private _activeSubmenu;
    private _outsideClickHandler;
    connectedCallback(): void;
    disconnectedCallback(): void;
    updated(changed: Map<PropertyKey, unknown>): void;
    private _handleOutsideClick;
    private _close;
    private _handleAction;
    private _handleKeydown;
    private _handleSubmenuEnter;
    private _handleSubmenuLeave;
    private _renderItem;
    render(): TemplateResult;
    static styles: import("lit").CSSResult;
}
export {};
//# sourceMappingURL=pages-context-menu.d.ts.map