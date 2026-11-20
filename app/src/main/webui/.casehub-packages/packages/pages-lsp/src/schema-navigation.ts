import { z } from 'zod';

export interface CompletionEntry {
  label: string;
  detail?: string;
  type: 'property' | 'enum';
  apply?: string;
}

export interface YamlContext {
  path: string[];
  siblings: Record<string, string>;
}

function getIndentLevel(line: string): number {
  const match = line.match(/^(\s*)/);
  return match?.[1]?.length ?? 0;
}

function extractKeyValue(line: string): { key: string; value: string } | null {
  const trimmed = line.trim().replace(/^-\s*/, '');
  const match = trimmed.match(/^(\w[\w-]*):\s*(.*)/);
  if (!match) return null;
  return { key: match[1]!, value: (match[2] ?? '').trim() };
}

function effectiveIndent(line: string): number {
  const base = getIndentLevel(line);
  if (line.substring(base).startsWith('- ')) {
    return base + 2;
  }
  return base;
}

export function buildYamlContext(doc: string, pos: number): YamlContext {
  const lines = doc.substring(0, pos).split('\n');
  const currentLine = lines[lines.length - 1] ?? '';
  const currentEI = effectiveIndent(currentLine);
  const path: string[] = [];
  const siblings: Record<string, string> = {};
  let targetEI = currentEI;

  let descendedIntoEmptyKey = false;
  if (currentLine.trim() === '' || currentLine.trim() === '-') {
    for (let j = lines.length - 2; j >= 0; j--) {
      const prev = lines[j] ?? '';
      if (prev.trim() === '') continue;
      const prevEI = effectiveIndent(prev);
      if (prevEI <= currentEI) {
        const kv = extractKeyValue(prev);
        if (kv && kv.value === '') {
          path.unshift(kv.key);
          targetEI = prevEI;
          descendedIntoEmptyKey = true;
        }
      }
      break;
    }
  }

  for (let i = lines.length - 2; i >= 0; i--) {
    const rawLine = lines[i] ?? '';
    if (rawLine.trim() === '') continue;
    const lineEI = effectiveIndent(rawLine);

    if (descendedIntoEmptyKey && lineEI >= targetEI && i === lines.length - 2) {
      descendedIntoEmptyKey = false;
      continue;
    }

    if (lineEI === currentEI || lineEI === targetEI) {
      const kv = extractKeyValue(rawLine);
      if (kv && !(kv.key in siblings)) {
        siblings[kv.key] = kv.value;
      }
    }

    if (lineEI < targetEI) {
      const kv = extractKeyValue(rawLine);
      if (kv) {
        path.unshift(kv.key);
        targetEI = lineEI;
      }
      if (lineEI === 0) break;
    }
  }
  return { path, siblings };
}

function typeName(schema: z.ZodType): string {
  return ((schema as any)._zod?.def?.type as string) ?? '';
}

function getShape(schema: z.ZodType): Record<string, z.ZodType> | null {
  const def = (schema as any)._zod?.def;
  if (!def) return null;
  if (typeof def.shape === 'function') return (def.shape as () => Record<string, z.ZodType>)();
  if (typeof def.shape === 'object' && def.shape) return def.shape as Record<string, z.ZodType>;
  return null;
}

export function unwrap(schema: z.ZodType): z.ZodType {
  const tn = typeName(schema);
  if (tn === 'optional' || tn === 'default' || tn === 'nullable') {
    return unwrap((schema._zod.def as unknown as { innerType: z.ZodType }).innerType);
  }
  if (tn === 'lazy') {
    return unwrap((schema._zod.def as unknown as { getter: () => z.ZodType }).getter());
  }
  return schema;
}

function navigateObjectKey(shape: Record<string, z.ZodType>, key: string): z.ZodType | null {
  if (!(key in shape)) return null;
  let field = unwrap(shape[key] as z.ZodType);
  if (typeName(field) === 'array') {
    field = unwrap((field._zod.def as unknown as { element: z.ZodType }).element);
  }
  return field;
}

export function isArrayField(
  schema: z.ZodType,
  path: string[],
  siblings?: Record<string, string>,
): boolean {
  if (path.length === 0) return false;
  const parentPath = path.slice(0, -1);
  const lastKey = path[path.length - 1]!;
  const parent = navigateSchema(schema, parentPath, siblings);
  if (!parent) return false;
  const parentUnwrapped = unwrap(parent);
  const shape = getShape(parentUnwrapped);
  if (!shape || !(lastKey in shape)) return false;
  const field = unwrap(shape[lastKey] as z.ZodType);
  return typeName(field) === 'array';
}

export function navigateSchema(
  schema: z.ZodType,
  path: string[],
  siblings?: Record<string, string>,
): z.ZodType | null {
  let current = unwrap(schema);

  for (let pi = 0; pi < path.length; pi++) {
    const key = path[pi]!;
    current = unwrap(current);

    const tn = typeName(current);
    if (tn === 'object') {
      const shape = getShape(current);
      if (!shape) return null;
      const result = navigateObjectKey(shape, key);
      if (!result) return null;
      current = result;
    } else if (tn === 'array') {
      current = unwrap((current._zod.def as unknown as { element: z.ZodType }).element);
      const innerShape = getShape(current);
      if (!innerShape) return null;
      const result = navigateObjectKey(innerShape, key);
      if (!result) return null;
      current = result;
    } else if (tn === 'record') {
      const valueType = (current as any)._zod.def.valueType as z.ZodType;
      current = unwrap(valueType);
    } else if (tn === 'union') {
      const def = (current as any)._zod.def;
      if (def.discriminator) {
        if (key === def.discriminator) {
          const literals = (def.options as z.ZodType[]).map((opt: z.ZodType) => {
            const optShape = getShape(unwrap(opt));
            if (!optShape || !(def.discriminator in optShape)) return null;
            const discField = unwrap(optShape[def.discriminator] as z.ZodType);
            const discDef = (discField as any)._zod.def;
            if (discDef.type === 'literal') return String(discDef.values[0]);
            return null;
          }).filter(Boolean) as string[];
          return z.enum(literals as [string, ...string[]]);
        }
        const typeValue = siblings?.[def.discriminator];
        if (!typeValue) return null;
        const branch = (def.options as z.ZodType[]).find((opt: z.ZodType) => {
          const optShape = getShape(unwrap(opt));
          if (!optShape || !(def.discriminator in optShape)) return false;
          const discField = unwrap(optShape[def.discriminator] as z.ZodType);
          const discDef = (discField as any)._zod.def;
          if (discDef.type === 'literal') return String(discDef.values[0]) === typeValue;
          return false;
        });
        if (!branch) return null;
        const branchObj = unwrap(branch);
        const branchShape = getShape(branchObj);
        if (!branchShape) return null;
        const result = navigateObjectKey(branchShape, key);
        if (!result) return null;
        current = result;
      } else {
        let found: z.ZodType | null = null;
        for (const option of def.options as z.ZodType[]) {
          const result = navigateSchema(option, [key], siblings);
          if (result) { found = result; break; }
        }
        if (!found) return null;
        current = found;
      }
    } else if (tn === 'intersection') {
      const def = (current as any)._zod.def;
      const left = navigateSchema(def.left as z.ZodType, [key], siblings);
      if (left) { current = left; continue; }
      const right = navigateSchema(def.right as z.ZodType, [key], siblings);
      if (right) { current = right; continue; }
      return null;
    } else {
      return null;
    }
  }
  return current;
}

function describeType(schema: z.ZodType): string | undefined {
  const tn = typeName(schema);
  if (tn === 'string') return 'string';
  if (tn === 'number') return 'number';
  if (tn === 'boolean') return 'boolean';
  if (tn === 'enum') {
    const entries: unknown = (schema as any)._zod.def.entries;
    if (Array.isArray(entries)) return entries.join(' | ');
    return Object.values(entries as Record<string, unknown>).filter((v: unknown) => typeof v === 'string').join(' | ');
  }
  if (tn === 'array') return 'array';
  if (tn === 'object') return 'object';
  if (tn === 'record') return 'record';
  return undefined;
}

export function schemaToCompletions(schema: z.ZodType, siblings?: Record<string, string>): CompletionEntry[] {
  const unwrapped = unwrap(schema);
  const tn = typeName(unwrapped);

  if (tn === 'object') {
    const shape = getShape(unwrapped);
    if (!shape) return [];
    return Object.entries(shape).map(([key, fieldSchema]) => {
      const detail = fieldSchema.description ?? describeType(unwrap(fieldSchema));
      return {
        label: key,
        ...(detail ? { detail } : {}),
        type: 'property' as const,
        apply: key + ': ',
      };
    });
  }

  if (tn === 'enum') {
    const entries: unknown = (unwrapped as any)._zod.def.entries;
    if (Array.isArray(entries)) {
      return entries.map((v: string) => ({ label: v, type: 'enum' as const }));
    }
    const values = Object.values(entries as Record<string, unknown>).filter((v: unknown): v is string => typeof v === 'string');
    return values.map((v) => ({ label: v, type: 'enum' as const }));
  }

  if (tn === 'literal') {
    const values = (unwrapped as any)._zod.def.values as unknown[];
    return [{
      label: String(values[0]),
      type: 'enum' as const,
    }];
  }

  if (tn === 'boolean') {
    return [
      { label: 'true', type: 'enum' as const },
      { label: 'false', type: 'enum' as const },
    ];
  }

  if (tn === 'union') {
    const def = (unwrapped as any)._zod.def;
    if (def.discriminator) {
      const discKey = def.discriminator as string;
      const typeValues = (def.options as z.ZodType[]).map((opt: z.ZodType) => {
        const optShape = getShape(unwrap(opt));
        if (!optShape || !(discKey in optShape)) return null;
        const discField = unwrap(optShape[discKey] as z.ZodType);
        const discDef = (discField as any)._zod.def;
        if (discDef.type === 'literal') return String(discDef.values[0]);
        return null;
      }).filter(Boolean) as string[];
      const firstBranch = (def.options as z.ZodType[])[0];
      const branchCompletions = firstBranch ? schemaToCompletions(firstBranch) : [];
      const commonKeys = branchCompletions.filter((c) => c.label !== discKey);
      return [
        {
          label: discKey,
          detail: typeValues.join(' | '),
          type: 'property' as const,
          apply: discKey + ': ',
        },
        ...commonKeys,
      ];
    }
    const options = def.options as z.ZodType[];
    if (siblings && Object.keys(siblings).length > 0) {
      const siblingKeys = new Set(Object.keys(siblings));
      const matching = options.filter((opt: z.ZodType) => {
        const optShape = getShape(unwrap(opt));
        if (!optShape) return false;
        return [...siblingKeys].some(k => k in optShape);
      });
      if (matching.length === 1) {
        return schemaToCompletions(matching[0]!, siblings);
      }
    }
    const allCompletions: CompletionEntry[] = [];
    for (const option of options) {
      allCompletions.push(...schemaToCompletions(option, siblings));
    }
    const seen = new Set<string>();
    return allCompletions.filter((c) => {
      if (seen.has(c.label)) return false;
      seen.add(c.label);
      return true;
    });
  }

  if (tn === 'record') {
    const valueType = unwrap((unwrapped as any)._zod.def.valueType as z.ZodType);
    return schemaToCompletions(valueType, siblings);
  }

  if (tn === 'intersection') {
    const def = (unwrapped as any)._zod.def;
    const left = schemaToCompletions(def.left as z.ZodType);
    const right = schemaToCompletions(def.right as z.ZodType);
    const seen = new Set(left.map((c) => c.label));
    return [...left, ...right.filter((c) => !seen.has(c.label))];
  }

  return [];
}
