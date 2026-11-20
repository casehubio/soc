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
import "./PagesArrayGroup.js";
declare const PagesVariantGroup_base: (new (...args: any[]) => import("@casehubio/pages-component").FormValueProvider) & typeof LitElement;
export declare class PagesVariantGroup extends PagesVariantGroup_base {
    schema: FieldSchema;
    label: string;
    fieldName: string;
    editable: boolean;
    private _activeVariantIndex;
    private _discriminatorField;
    private _activeChildren;
    private _activeChildTypes;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    disconnectedCallback(): void;
    updated(changed: Map<string, unknown>): void;
    private _detectDiscriminator;
    private _getVariantOptions;
    private _onVariantSwitch;
    private _onChildFieldChange;
    protected collectValue(): Record<string, unknown>;
    protected propagateValue(v: unknown): void;
    protected validateSelf(): boolean;
    protected validateChildren(): boolean;
    render(): TemplateResult;
}
export {};
//# sourceMappingURL=PagesVariantGroup.d.ts.map