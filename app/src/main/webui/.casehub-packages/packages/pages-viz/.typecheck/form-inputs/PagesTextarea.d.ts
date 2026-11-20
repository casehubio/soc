import { type TemplateResult } from "lit";
import { PagesFormInput } from "./PagesFormInput.js";
import type { TextareaProps } from "@casehubio/pages-component";
import type { TypedDataSet } from "@casehubio/pages-data";
import type { DataSetLookup } from "@casehubio/pages-data";
export declare class PagesTextarea extends PagesFormInput<TextareaProps> {
    static styles: import("lit").CSSResult;
    get currentValue(): string;
    protected renderContent(props: TextareaProps & {
        lookup?: DataSetLookup;
    }, dataset: TypedDataSet): TemplateResult;
}
//# sourceMappingURL=PagesTextarea.d.ts.map