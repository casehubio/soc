import { type TemplateResult } from "lit";
import { PagesElement } from "../base/PagesElement.js";
import type { TypedDataSet } from "@casehubio/pages-data";
import type { DataSetLookup } from "@casehubio/pages-data";
import type { SchemaFormProps } from "@casehubio/pages-component";
import "@casehubio/pages-property-palette";
import "./PagesObjectGroup.js";
import "./PagesArrayGroup.js";
import "./PagesVariantGroup.js";
export declare class PagesSchemaForm extends PagesElement<SchemaFormProps & {
    lookup?: DataSetLookup;
}> {
    private _dataMirror;
    private _resolvedSchema;
    private _editable;
    private _fieldsOnly;
    private _liveRegion;
    private _compositeRefs;
    static styles: import("lit").CSSResult;
    private _resolver;
    set editable(value: boolean);
    get editable(): boolean;
    set fieldsOnly(value: boolean);
    get fieldsOnly(): boolean;
    disconnectedCallback(): void;
    private announce;
    get currentValue(): Record<string, unknown>;
    private get _palette();
    protected renderContent(props: SchemaFormProps & {
        lookup?: DataSetLookup;
    }, dataset: TypedDataSet): TemplateResult;
    private _enrichSchema;
    private _extractData;
    private _extractDistinctValues;
    private _renderComposite;
    validate(): boolean;
    submit(): Record<string, unknown> | null;
}
//# sourceMappingURL=PagesSchemaForm.d.ts.map