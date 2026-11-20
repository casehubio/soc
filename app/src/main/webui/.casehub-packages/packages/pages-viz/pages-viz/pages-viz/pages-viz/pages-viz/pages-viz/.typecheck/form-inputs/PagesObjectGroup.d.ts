import { type TemplateResult } from "lit";
import { LitElement } from "lit";
import type { FieldSchema } from "@casehubio/pages-component";
import "@casehubio/pages-ui-components/input";
import "@casehubio/pages-ui-components/select";
import "@casehubio/pages-ui-components/checkbox";
import "@casehubio/pages-ui-components/textarea";
import "@casehubio/pages-ui-components/number-input";
import "@casehubio/pages-ui-components/date-input";
import "@casehubio/pages-ui-components/datetime-input";
declare const PagesObjectGroup_base: (new (...args: any[]) => import("@casehubio/pages-component").FormValueProvider) & typeof LitElement;
export declare class PagesObjectGroup extends PagesObjectGroup_base {
    schema: FieldSchema;
    label: string;
    fieldName: string;
    editable: boolean;
    required: boolean;
    collapsible: boolean;
    validateOnBlur: boolean;
    private _collapsed;
    private _children;
    private _childTypes;
    private _valuePending;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    disconnectedCallback(): void;
    protected collectValue(): Record<string, unknown>;
    protected propagateValue(_v: unknown): void;
    protected validateSelf(): boolean;
    protected validateChildren(): boolean;
    private _onChildFieldChange;
    private _deriveLabel;
    render(): TemplateResult;
}
export {};
//# sourceMappingURL=PagesObjectGroup.d.ts.map