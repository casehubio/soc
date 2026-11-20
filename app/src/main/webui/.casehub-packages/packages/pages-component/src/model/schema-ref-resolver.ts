import type { FieldSchema } from "./form-input-types.js";

export function resolveSchemaRefs(schema: FieldSchema): FieldSchema {
  const defs: Readonly<Record<string, FieldSchema>> = schema.$defs ?? schema.definitions ?? {};
  return resolveNode(schema, defs, new Set());
}

function resolveNode(
  node: FieldSchema,
  defs: Readonly<Record<string, FieldSchema>>,
  visiting: Set<string>,
): FieldSchema {
  const ref = node.$ref;
  if (ref) {
    const defName = ref.replace(/^#\/\$defs\/|^#\/definitions\//, "");
    if (visiting.has(defName)) return {};
    visiting.add(defName);
    const resolved = defs[defName];
    if (!resolved) { visiting.delete(defName); return node; }
    const result = resolveNode(resolved, defs, visiting);
    visiting.delete(defName);
    return result;
  }

  const resolved: Record<string, unknown> = { ...node };
  if (node.properties) {
    const props: Record<string, FieldSchema> = {};
    for (const [key, prop] of Object.entries(node.properties)) {
      props[key] = resolveNode(prop, defs, visiting);
    }
    resolved.properties = props;
  }
  if (node.items) {
    resolved.items = resolveNode(node.items, defs, visiting);
  }
  if (node.oneOf) {
    resolved.oneOf = node.oneOf.map(v => resolveNode(v, defs, visiting));
  }
  return resolved as FieldSchema;
}
