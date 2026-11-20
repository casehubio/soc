import { z } from 'zod';
import type { FieldSchema } from '@casehubio/pages-component';

const cache = new WeakMap<z.ZodType, FieldSchema>();
const visiting = new WeakSet<z.ZodType>();

function typeName(schema: z.ZodType): string {
  return ((schema as any)._zod?.def?.type as string) ?? '';
}

function unwrap(schema: z.ZodType, seen = new WeakSet<z.ZodType>()): z.ZodType {
  if (seen.has(schema)) return schema;
  seen.add(schema);
  const tn = typeName(schema);
  if (tn === 'optional' || tn === 'default' || tn === 'nullable') {
    const innerType = (schema._zod.def as unknown as { innerType: z.ZodType }).innerType;
    return unwrap(innerType, seen);
  }
  if (tn === 'lazy') {
    const getter = (schema._zod.def as unknown as { getter: () => z.ZodType }).getter;
    return unwrap(getter(), seen);
  }
  return schema;
}

function getShape(schema: z.ZodType): Record<string, z.ZodType> | null {
  const def = (schema as any)._zod?.def;
  if (!def) return null;
  if (typeof def.shape === 'function') return (def.shape as () => Record<string, z.ZodType>)();
  if (typeof def.shape === 'object' && def.shape) return def.shape as Record<string, z.ZodType>;
  return null;
}

function isOptional(schema: z.ZodType): boolean {
  const tn = typeName(schema);
  return tn === 'optional' || tn === 'default' || tn === 'nullable';
}

function convertInner(schema: z.ZodType): FieldSchema {
  if (visiting.has(schema)) return { type: 'object' };
  visiting.add(schema);
  const unwrapped = unwrap(schema);
  if (unwrapped !== schema) {
    if (visiting.has(unwrapped)) { visiting.delete(schema); return { type: 'object' }; }
    visiting.add(unwrapped);
  }
  try {
  const tn = typeName(unwrapped);

  if (tn === 'string') {
    return { type: 'string' };
  }

  if (tn === 'number') {
    const checks = ((unwrapped as any)._zod.def.checks ?? []) as Array<{ kind: string; value: number }>;
    const result: FieldSchema = { type: 'number' };
    const mutable = result as Record<string, unknown>;
    for (const check of checks) {
      if (check.kind === 'min') mutable['minimum'] = check.value;
      if (check.kind === 'max') mutable['maximum'] = check.value;
    }
    return result;
  }

  if (tn === 'boolean') {
    return { type: 'boolean' };
  }

  if (tn === 'enum') {
    const entries: unknown = (unwrapped as any)._zod.def.entries;
    if (Array.isArray(entries)) return { type: 'string', enum: entries };
    const values = Object.values(entries as Record<string, unknown>).filter((v: unknown): v is string => typeof v === 'string');
    return { type: 'string', enum: values };
  }

  if (tn === 'literal') {
    const values = (unwrapped as any)._zod.def.values as unknown[];
    const value = values[0];
    if (typeof value === 'string') return { type: 'string', enum: [value] };
    if (typeof value === 'number') return { type: 'number' };
    if (typeof value === 'boolean') return { type: 'boolean' };
    return { type: 'string' };
  }

  if (tn === 'array') {
    const itemType = (unwrapped as any)._zod.def.element as z.ZodType;
    return { type: 'array', items: convertInner(itemType) };
  }

  if (tn === 'record') {
    return { type: 'object' };
  }

  if (tn === 'object') {
    return convertObject(unwrapped);
  }

  if (tn === 'union') {
    const options = (unwrapped as any)._zod.def.options as z.ZodType[];
    const converted = options.map((o: z.ZodType) => convertInner(o));
    return { oneOf: converted };
  }

  if (tn === 'intersection') {
    const def = (unwrapped as any)._zod.def;
    const left = convertInner(def.left as z.ZodType);
    const right = convertInner(def.right as z.ZodType);
    return mergeFieldSchemas(left, right);
  }

  if (tn === 'any' || tn === 'unknown') return {};
  return {};
  } finally {
    visiting.delete(schema);
    if (unwrapped !== schema) visiting.delete(unwrapped);
  }
}

function convertObject(schema: z.ZodType): FieldSchema {
  const shape = getShape(schema);
  if (!shape) return { type: 'object' };

  const properties: Record<string, FieldSchema> = {};
  const required: string[] = [];

  for (const [key, fieldSchema] of Object.entries(shape)) {
    properties[key] = convertInner(fieldSchema);
    if (!isOptional(fieldSchema)) {
      required.push(key);
    }
  }

  const result: FieldSchema = {
    type: 'object',
    properties,
  };
  if (required.length > 0) {
    (result as Record<string, unknown>)['required'] = required;
  }
  return result;
}

function mergeFieldSchemas(a: FieldSchema, b: FieldSchema): FieldSchema {
  if (a.type !== 'object' && b.type !== 'object') return a;
  const merged: FieldSchema = {
    type: 'object',
    properties: {
      ...a.properties,
      ...b.properties,
    },
  };
  const req = [...(a.required ?? []), ...(b.required ?? [])];
  if (req.length > 0) {
    (merged as Record<string, unknown>)['required'] = req;
  }
  return merged;
}

export function zodToFieldSchema(schema: z.ZodType): FieldSchema {
  const cached = cache.get(schema);
  if (cached) return cached;
  const result = convertInner(schema);
  cache.set(schema, result);
  return result;
}
