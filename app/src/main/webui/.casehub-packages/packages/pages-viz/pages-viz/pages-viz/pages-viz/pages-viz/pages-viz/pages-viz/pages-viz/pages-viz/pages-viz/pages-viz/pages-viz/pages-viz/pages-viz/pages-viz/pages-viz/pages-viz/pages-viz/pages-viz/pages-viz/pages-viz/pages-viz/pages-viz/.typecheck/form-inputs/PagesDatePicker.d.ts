import { type TemplateResult } from "lit";
import { PagesFormInput } from "./PagesFormInput.js";
import type { DatePickerProps } from "@casehubio/pages-component";
import type { TypedDataSet } from "@casehubio/pages-data";
import type { DataSetLookup } from "@casehubio/pages-data";
export declare class PagesDatePicker extends PagesFormInput<DatePickerProps> {
    static styles: import("lit").CSSResult;
    get currentValue(): string;
    protected renderContent(props: DatePickerProps & {
        lookup?: DataSetLookup;
    }, dataset: TypedDataSet): TemplateResult;
}
//# sourceMappingURL=PagesDatePicker.d.ts.map