import { LitElement } from 'lit';
interface ThemeFamily {
    readonly name: string;
    readonly displayName: string;
    readonly hasLight: boolean;
    readonly hasDark: boolean;
}
export declare class PagesThemePickerElement extends LitElement {
    static styles: import("lit").CSSResult;
    static properties: {
        target: {
            attribute: boolean;
        };
        compact: {
            type: BooleanConstructor;
        };
        _family: {
            state: boolean;
        };
        _mode: {
            state: boolean;
        };
        _families: {
            state: boolean;
        };
    };
    target: HTMLElement;
    compact: boolean;
    _family: string;
    _mode: 'light' | 'dark';
    _families: ThemeFamily[];
    constructor();
    connectedCallback(): void;
    render(): import("lit-html").TemplateResult<1>;
    private _renderCompact;
    private _openDesigner;
    private _onFamilyChange;
    private _setMode;
    private _apply;
}
export {};
//# sourceMappingURL=theme-picker.d.ts.map