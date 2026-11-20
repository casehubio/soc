import type { TypedDataSet, Column } from "@casehubio/pages-data";
import { ColumnType } from "@casehubio/pages-data";
import type { FieldSchema } from "@casehubio/pages-component";

export function deriveSchemaFromDataSet(dataset: TypedDataSet): FieldSchema {
  const properties: Record<string, FieldSchema> = {};
  for (const col of dataset.columns) {
    properties[col.id] = columnToFieldSchema(col, dataset);
  }
  return { properties };
}

function columnToFieldSchema(col: Column, dataset: TypedDataSet): FieldSchema {
  switch (col.type) {
    case ColumnType.NUMBER:
      return { type: "number" };
    case ColumnType.DATE:
      return { type: "string", format: "date" };
    case ColumnType.LABEL: {
      const seen = new Set<string>();
      for (const row of dataset.rows) {
        try {
          const cell = row.cell(col.id);
          if (cell.type !== "NULL") seen.add(String(cell.value));
        } catch { /* skip */ }
      }
      const values = [...seen].sort();
      return values.length > 0
        ? { type: "string", enum: values }
        : { type: "string" };
    }
    case ColumnType.TEXT:
    default:
      return { type: "string" };
  }
}

export function mapFieldToComponentType(fieldSchema: FieldSchema): string {
  if (fieldSchema["x-renderer"]) return String(fieldSchema["x-renderer"]);
  if (fieldSchema.oneOf) return "variant-group";

  const effectiveType = Array.isArray(fieldSchema.type)
    ? (fieldSchema.type as readonly string[]).find(t => t !== "null")
    : fieldSchema.type;

  if (effectiveType === "array" || fieldSchema.items) return "array-group";
  if (effectiveType === "object" || (fieldSchema.properties && effectiveType !== "string")) return "object-group";
  if (effectiveType === "boolean") return "checkbox";
  if (effectiveType === "number") return "number-input";
  if (effectiveType === "integer") return "number-input";
  if (effectiveType === "string") {
    if (fieldSchema.enum && fieldSchema.enum.length > 0) return "select";
    if (fieldSchema.format === "date") return "date-input";
    if (fieldSchema.format === "datetime-local") return "datetime-input";
    if (fieldSchema.format === "textarea") return "textarea";
    return "input";
  }
  if (fieldSchema.enum && fieldSchema.enum.length > 0) return "select";
  return "input";
}

export { validateField } from "@casehubio/pages-component";
