import type { FieldSchema } from './validation.js';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'checkbox'
  | 'select'
  | 'string-array'
  | 'object'
  | 'json'
  | 'oneOf';

export function fieldTypeFor(schema: FieldSchema): FieldType {
  if (schema.oneOf) return 'oneOf';

  if (schema.type === 'boolean') return 'checkbox';

  if (schema.type === 'integer' || schema.type === 'number') return 'number';

  if (schema.type === 'string') {
    if (schema.enum && (schema.enum as readonly string[]).length > 0) return 'select';
    const desc = (schema.description ?? '').toLowerCase();
    if (desc.includes('jq') || desc.includes('expression')) return 'textarea';
    return 'text';
  }

  if (schema.type === 'array') {
    const items = schema.items as FieldSchema | undefined;
    if (items?.type === 'string') return 'string-array';
    return 'json';
  }

  if (schema.type === 'object') {
    if (schema.properties && Object.keys(schema.properties as object).length > 0) return 'object';
    return 'json';
  }

  return 'text';
}
