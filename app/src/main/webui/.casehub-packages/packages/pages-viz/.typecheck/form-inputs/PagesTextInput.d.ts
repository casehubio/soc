import { type TemplateResult } from "lit";
import { PagesFormInput } from "./PagesFormInput.js";
import type { TextInputProps } from "@casehubio/pages-component";
import type { TypedDataSet } from "@casehubio/pages-data";
import type { DataSetLookup } from "@casehubio/pages-data";
export declare class PagesTextInput extends PagesFormInput<TextInputProps> {
    static styles: import("lit").CSSResult;
    get currentValue(): string;
    protected renderContent(props: TextInputProps & {
        lookup?: DataSetLookup;
    }, dataset: TypedDataSet): TemplateResult;
}
//# sourceMappingURL=PagesTextInput.d.ts.map