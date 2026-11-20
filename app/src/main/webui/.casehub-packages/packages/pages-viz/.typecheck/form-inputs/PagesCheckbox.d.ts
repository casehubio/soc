import { type TemplateResult } from "lit";
import { PagesFormInput } from "./PagesFormInput.js";
import type { CheckboxProps } from "@casehubio/pages-component";
import type { TypedDataSet } from "@casehubio/pages-data";
import type { DataSetLookup } from "@casehubio/pages-data";
export declare class PagesCheckbox extends PagesFormInput<CheckboxProps> {
    static styles: import("lit").CSSResult;
    get currentValue(): boolean;
    protected renderContent(props: CheckboxProps & {
        lookup?: DataSetLookup;
    }, dataset: TypedDataSet): TemplateResult;
}
//# sourceMappingURL=PagesCheckbox.d.ts.map