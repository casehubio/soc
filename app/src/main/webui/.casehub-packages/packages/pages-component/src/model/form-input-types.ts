import type { DataSetId } from "@casehubio/pages-data";
import type { SubmitConfig } from "./action-types.js";

export interface FormInputCommon {
  readonly field: string;
  readonly label?: string;
  readonly required?: boolean;
  readonly readonly?: boolean;
  readonly submit?: SubmitConfig;
}

export interface TextInputProps extends FormInputCommon {
  readonly placeholder?: string;
  readonly maxLength?: number;
}

export interface NumberInputProps extends FormInputCommon {
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}

export interface FixedOptions {
  readonly values: readonly string[];
}

export interface DataSetOptions {
  readonly dataset: DataSetId;
  readonly labelColumn: string;
  readonly valueColumn: string;
  readonly filterField?: string;
  readonly filterColumn?: string;
}

export interface DropdownProps extends FormInputCommon {
  readonly options: FixedOptions | DataSetOptions;
}

export type CheckboxProps = FormInputCommon;

export interface DatePickerProps extends FormInputCommon {
  readonly min?: string;
  readonly max?: string;
}

export interface TextareaProps extends FormInputCommon {
  readonly rows?: number;
  readonly maxLength?: number;
}

export function isFixedOptions(opts: FixedOptions | DataSetOptions): opts is FixedOptions {
  return "values" in opts;
}

export interface FieldSchema {
  readonly type?: string | readonly string[];
  readonly format?: string;
  readonly title?: string;
  readonly description?: string;
  /** @deprecated Use x-placeholder instead */
  readonly placeholder?: string;
  readonly enum?: readonly string[];
  readonly pattern?: string;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly exclusiveMinimum?: number;
  readonly exclusiveMaximum?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minItems?: number;
  readonly maxItems?: number;
  readonly uniqueItems?: boolean;
  readonly multipleOf?: number;
  readonly readOnly?: boolean;
  readonly properties?: Readonly<Record<string, FieldSchema>>;
  readonly required?: readonly string[];
  readonly items?: FieldSchema;
  readonly const?: string | number | boolean | null;
  readonly oneOf?: readonly FieldSchema[];
  readonly $ref?: string;
  readonly $defs?: Readonly<Record<string, FieldSchema>>;
  readonly definitions?: Readonly<Record<string, FieldSchema>>;
  readonly [key: `x-${string}`]: unknown;
}

export interface SchemaFormProps {
  schema?: FieldSchema;
  mode?: "display" | "edit";
  forceCreate?: boolean;
  validateOnBlur?: boolean;
  excludeFields?: string[];
  fieldOrder?: string[];
  fields?: string[];
  labels?: Record<string, string>;
  fieldsOnly?: boolean;
}
