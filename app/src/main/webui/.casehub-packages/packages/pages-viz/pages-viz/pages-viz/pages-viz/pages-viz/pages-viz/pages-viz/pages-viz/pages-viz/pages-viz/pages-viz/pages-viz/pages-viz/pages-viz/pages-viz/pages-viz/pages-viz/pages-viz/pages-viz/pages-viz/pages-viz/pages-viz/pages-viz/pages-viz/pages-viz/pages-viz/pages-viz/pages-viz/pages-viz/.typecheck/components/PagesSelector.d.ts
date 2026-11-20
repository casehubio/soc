import { type TemplateResult } from "lit";
import type { TypedDataSet } from "@casehubio/pages-data";
import type { SelectorProps } from "@casehubio/pages-component";
import { PagesElement } from "../base/PagesElement.js";
export declare class PagesSelector extends PagesElement<SelectorProps> {
    private _selectedValue;
    private _initialValues;
    private _initialColumnId;
    set dataSet(value: TypedDataSet | undefined);
    get dataSet(): TypedDataSet | undefined;
    static styles: import("lit").CSSResult;
    protected renderContent(props: SelectorProps, dataset: TypedDataSet): TemplateResult;
    private extractDistinctValues;
    private renderDropdown;
    private _handleDropdownChange;
    private renderSlider;
    private _handleSliderChange;
    private renderLabels;
    private _handleChipClick;
}
//# sourceMappingURL=PagesSelector.d.ts.map