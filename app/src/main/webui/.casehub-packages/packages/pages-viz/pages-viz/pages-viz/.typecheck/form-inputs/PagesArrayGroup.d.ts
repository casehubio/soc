import { type TemplateResult } from "lit";
import { LitElement } from "lit";
import type { FieldSchema } from "@casehubio/pages-component";
import "@casehubio/pages-ui-components/input";
import "@casehubio/pages-ui-components/select";
import "@casehubio/pages-ui-components/checkbox";
import "@casehubio/pages-ui-components/number-input";
import "@casehubio/pages-ui-components/date-input";
import "@casehubio/pages-ui-components/datetime-input";
import "@casehubio/pages-ui-components/textarea";
import "./PagesObjectGroup.js";
declare const PagesArrayGroup_base: (new (...args: any[]) => import("@casehubio/pages-component").FormValueProvider) & typeof LitElement;
export declare class PagesArrayGroup extends PagesArrayGroup_base {
    schema: FieldSchema;
    label: string;
    fieldName: string;
    editable: boolean;
    required: boolean;
    validateOnBlur: boolean;
    private _items;
    private _nextKey;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private _createItem;
    private _getDefaultValue;
    protected collectValue(): unknown[];
    protected propagateValue(v: unknown): void;
    protected validateSelf(): boolean;
    protected validateChildren(): boolean;
    private _onChildFieldChange;
    private _addItem;
    private _removeItem;
    private _moveUp;
    private _moveDown;
    render(): TemplateResult;
}
export {};
//# sourceMappingURL=PagesArrayGroup.d.ts.map