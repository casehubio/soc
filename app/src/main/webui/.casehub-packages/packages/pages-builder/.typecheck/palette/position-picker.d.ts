import { LitElement, type TemplateResult } from 'lit';
export declare class PagesPositionPicker extends LitElement {
    open: boolean;
    anchor: HTMLElement | undefined;
    private _dismissTimer;
    private _escHandler;
    willUpdate(changed: Map<PropertyKey, unknown>): void;
    disconnectedCallback(): void;
    private _positionNearAnchor;
    private _dismiss;
    private _select;
    private _handleMouseLeave;
    private _handleMouseEnter;
    render(): TemplateResult;
    static styles: import("lit").CSSResult;
}
//# sourceMappingURL=position-picker.d.ts.map