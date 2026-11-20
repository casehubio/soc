import { LitElement, type TemplateResult } from 'lit';
import type { PaletteContext } from '../catalog/palette-context.js';
export declare class PagesBuilderInlinePicker extends LitElement {
    context: PaletteContext | undefined;
    anchor: HTMLElement | undefined;
    open: boolean;
    private _search;
    private _activeCategory;
    private _filtered;
    private _categories;
    private _outsideClickHandler;
    connectedCallback(): void;
    disconnectedCallback(): void;
    willUpdate(changed: Map<PropertyKey, unknown>): void;
    private _positionNearAnchor;
    private _recompute;
    private _handleOutsideClick;
    private _handleSearch;
    private _handleSelect;
    private _handleKeydown;
    render(): TemplateResult;
    static styles: import("lit").CSSResult;
}
//# sourceMappingURL=inline-picker.d.ts.map