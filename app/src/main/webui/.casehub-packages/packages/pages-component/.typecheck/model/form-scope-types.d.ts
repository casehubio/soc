import type { FieldSchema } from "./form-input-types.js";
export interface FormScopeProps {
    readonly schema?: FieldSchema;
    readonly validateOnBlur?: boolean;
    readonly mode?: "display" | "edit";
    readonly forceCreate?: boolean;
}
//# sourceMappingURL=form-scope-types.d.ts.map