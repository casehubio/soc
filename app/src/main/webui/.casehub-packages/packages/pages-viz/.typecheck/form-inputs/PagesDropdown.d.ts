import { type TemplateResult, type PropertyValues } from "lit";
import { PagesFormInput } from "./PagesFormInput.js";
import type { DropdownProps } from "@casehubio/pages-component";
import type { TypedDataSet } from "@casehubio/pages-data";
import type { DataSetLookup } from "@casehubio/pages-data";
export declare class PagesDropdown extends PagesFormInput<DropdownProps> {
    static styles: import("lit").CSSResult;
    get currentValue(): string;
    private _optionsDataSet;
    private _optionsRequested;
    private _cascadeListener;
    private _cascadeFilterValue;
    set optionsDataSet(value: TypedDataSet);
    disconnectedCallback(): void;
    updated(changed: PropertyValues): void;
    protected renderContent(props: DropdownProps & {
        lookup?: DataSetLookup;
    }, dataset: TypedDataSet): TemplateResult;
    private getOptionEntries;
    private extractOptionsFromDataSet;
    private requestOptionsData;
    private setupCascadeListener;
    private removeCascadeListener;
}
//# sourceMappingURL=PagesDropdown.d.ts.map