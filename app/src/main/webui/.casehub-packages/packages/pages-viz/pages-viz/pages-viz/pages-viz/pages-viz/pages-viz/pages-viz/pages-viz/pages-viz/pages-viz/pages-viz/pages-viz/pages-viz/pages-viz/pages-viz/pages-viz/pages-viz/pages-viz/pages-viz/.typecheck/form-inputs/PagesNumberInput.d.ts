import { type TemplateResult } from "lit";
import { PagesFormInput } from "./PagesFormInput.js";
import type { NumberInputProps } from "@casehubio/pages-component";
import type { TypedDataSet } from "@casehubio/pages-data";
import type { DataSetLookup } from "@casehubio/pages-data";
export declare class PagesNumberInput extends PagesFormInput<NumberInputProps> {
    static styles: import("lit").CSSResult;
    get currentValue(): number | null;
    protected renderContent(props: NumberInputProps & {
        lookup?: DataSetLookup;
    }, dataset: TypedDataSet): TemplateResult;
}
//# sourceMappingURL=PagesNumberInput.d.ts.map