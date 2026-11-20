import type { FieldSchema } from "./form-input-types.js";

export interface FormScopeProps {
  readonly schema?: FieldSchema;
  readonly validateOnBlur?: boolean;
  readonly mode?: "display" | "edit";
  readonly forceCreate?: boolean;
}
