import { type PropertyValues } from "lit";
import { PagesElement } from "../base/PagesElement.js";
import type { FormInputCommon } from "@casehubio/pages-component";
import type { TypedDataSet } from "@casehubio/pages-data";
import type { DataSetLookup } from "@casehubio/pages-data";
import type { ActionRequest, ActionCallbacks } from "@casehubio/pages-component";
export interface PagesFieldChangeDetail {
    readonly field: string;
    readonly value: unknown;
    readonly committed: boolean;
}
export interface PagesActionRequestDetail {
    readonly config: ActionRequest & {
        readonly callbacks: ActionCallbacks;
    };
    readonly resolve: (result: {
        readonly success: boolean;
        readonly error?: string;
    }) => void;
}
export declare abstract class PagesFormInput<P extends FormInputCommon> extends PagesElement<P & {
    lookup?: DataSetLookup;
}> {
    protected _editable: boolean;
    protected inputElement: HTMLInputElement | HTMLTextAreaElement | null;
    errorMessage: string | undefined;
    required: boolean;
    describedBy: string | undefined;
    set editable(value: boolean);
    get editable(): boolean;
    updated(changed: PropertyValues): void;
    disconnectedCallback(): void;
    protected setupSubmitListener(): void;
    protected cleanupSubmitListener(): void;
    private handleKeydown;
    protected extractFieldValue(dataset: TypedDataSet): unknown;
    protected asFormProps(props: P & {
        lookup?: DataSetLookup;
    }): P;
    abstract get currentValue(): unknown;
    protected emitFieldChange(value: unknown, committed: boolean): void;
}
//# sourceMappingURL=PagesFormInput.d.ts.map