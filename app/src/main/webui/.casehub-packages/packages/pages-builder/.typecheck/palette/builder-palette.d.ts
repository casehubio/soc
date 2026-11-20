import { LitElement, type TemplateResult } from 'lit';
import { type RovingDirection } from '@casehubio/pages-primitives/a11y';
import type { PaletteContext } from '../catalog/palette-context.js';
declare const PagesBuilderPalette_base: (new (...args: any[]) => {
    rovingSelector: string;
    rovingDirection: RovingDirection;
    rovingIndex: number;
    navigateRoving(direction: "next" | "prev" | "first" | "last"): void;
}) & typeof LitElement;
export declare class PagesBuilderPalette extends PagesBuilderPalette_base {
    rovingSelector: string;
    rovingDirection: RovingDirection;
    context: PaletteContext | undefined;
    private _search;
    private _activeCategory;
    private _categories;
    private _filtered;
    willUpdate(changed: Map<PropertyKey, unknown>): void;
    private _recompute;
    private _handleSearch;
    private _handleCategoryClick;
    private _handleSelect;
    private _renderTile;
    render(): TemplateResult;
    static styles: import("lit").CSSResult;
}
export {};
//# sourceMappingURL=builder-palette.d.ts.map