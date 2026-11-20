import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  buildYamlContext,
  navigateSchema,
  schemaToCompletions,
  isArrayField,
} from './schema-navigation.js';
import { dashboardSchema } from '@casehubio/pages-schema';
import { yamlCoreDocumentSchema } from '@casehubio/yaml-core/schema';

const realPageSchema = z.intersection(yamlCoreDocumentSchema, dashboardSchema);

const componentBase = z.object({
  type: z.string(),
  id: z.string().optional(),
});

const barChartProps = componentBase.extend({
  type: z.literal('bar-chart'),
  width: z.number().optional(),
  height: z.number().optional(),
});

const tableProps = componentBase.extend({
  type: z.literal('data-table'),
  columns: z.array(z.string()).optional(),
});

const componentSchema = z.discriminatedUnion('type', [barChartProps, tableProps]);

const pageSchema = z.object({
  pages: z.array(
    z.object({
      name: z.string(),
      components: z.array(componentSchema),
    }),
  ),
  datasets: z
    .array(z.object({ uuid: z.string() }))
    .optional(),
});

describe('buildYamlContext', () => {
  it('returns empty path at root', () => {
    const ctx = buildYamlContext('', 0);
    expect(ctx.path).toEqual([]);
    expect(ctx.siblings).toEqual({});
  });

  it('tracks path through nesting', () => {
    const doc = 'pages:\n  - name: Home\n    components:\n      - type: bar-chart\n        ';
    const ctx = buildYamlContext(doc, doc.length);
    expect(ctx.path).toEqual(['pages', 'components']);
    expect(ctx.siblings.type).toBe('bar-chart');
  });

  it('descends into empty key block', () => {
    const doc = 'pages:\n  ';
    const ctx = buildYamlContext(doc, doc.length);
    expect(ctx.path).toEqual(['pages']);
  });

  it('descends into components: after Enter with trailing content', () => {
    const doc = '    - span: 4\n      components:\n        \n  - columns:\n    - span: 8\n';
    const cursorLine = 2;
    const lines = doc.split('\n');
    let pos = 0;
    for (let i = 0; i < cursorLine; i++) pos += lines[i]!.length + 1;
    pos += 8;
    const ctx = buildYamlContext(doc, pos);
    expect(ctx.path).toContain('components');
  });

  it('descends into components: on indented blank line', () => {
    const doc = 'pages:\n- name: Dashboard\n  rows:\n  - columns:\n    - span: 4\n      components:\n        \n      - type: metric\n';
    const cursorLine = 6;
    const lines = doc.split('\n');
    let pos = 0;
    for (let i = 0; i < cursorLine; i++) pos += lines[i]!.length + 1;
    pos += 8;
    const ctx = buildYamlContext(doc, pos);
    expect(ctx.path).toContain('components');
  });

  it('full path after Enter on components: resolves to component schema', () => {
    const doc = 'pages:\n- name: Dashboard\n  rows:\n  - columns:\n    - span: 4\n      components:\n        \n    - span: 8\n';
    const cursorLine = 6;
    const lines = doc.split('\n');
    let pos = 0;
    for (let i = 0; i < cursorLine; i++) pos += lines[i]!.length + 1;
    pos += 8;
    const ctx = buildYamlContext(doc, pos);
    const result = navigateSchema(realPageSchema, ctx.path, ctx.siblings);
    expect(result).not.toBeNull();
    const completions = schemaToCompletions(result!);
    const labels = completions.map(c => c.label);
    expect(labels).toContain('type');
  });
});

describe('navigateSchema', () => {
  it('navigates to a top-level key', () => {
    const result = navigateSchema(pageSchema, ['pages']);
    expect(result).toBeTruthy();
  });

  it('navigates through array into object', () => {
    const result = navigateSchema(pageSchema, ['pages', 'name']);
    expect(result).toBeTruthy();
  });

  it('resolves discriminated union with sibling', () => {
    const result = navigateSchema(
      pageSchema,
      ['pages', 'components', 'width'],
      { type: 'bar-chart' },
    );
    expect(result).toBeTruthy();
  });

  it('returns null for unknown key in wrong branch', () => {
    const result = navigateSchema(
      pageSchema,
      ['pages', 'components', 'columns'],
      { type: 'bar-chart' },
    );
    expect(result).toBeNull();
  });

  it('returns enum values for discriminator field', () => {
    const result = navigateSchema(
      pageSchema,
      ['pages', 'components', 'type'],
      {},
    );
    expect(result).toBeTruthy();
    const completions = schemaToCompletions(result!);
    const labels = completions.map((c) => c.label);
    expect(labels).toContain('bar-chart');
    expect(labels).toContain('data-table');
  });

  it('handles ZodRecord by returning value schema', () => {
    const recordSchema = z.object({
      properties: z.record(z.string(), z.string()),
    });
    const result = navigateSchema(recordSchema, ['properties', 'anyKey']);
    expect(result).toBeTruthy();
  });
});

describe('schemaToCompletions', () => {
  it('returns property completions for object schema', () => {
    const completions = schemaToCompletions(pageSchema);
    const labels = completions.map((c) => c.label);
    expect(labels).toContain('pages');
    expect(labels).toContain('datasets');
  });

  it('returns enum completions for enum schema', () => {
    const enumSchema = z.enum(['red', 'green', 'blue']);
    const completions = schemaToCompletions(enumSchema);
    expect(completions).toEqual([
      { label: 'red', type: 'enum' },
      { label: 'green', type: 'enum' },
      { label: 'blue', type: 'enum' },
    ]);
  });

  it('returns boolean completions', () => {
    const completions = schemaToCompletions(z.boolean());
    expect(completions).toHaveLength(2);
    expect(completions.map((c) => c.label)).toEqual(['true', 'false']);
  });
});

describe('isArrayField', () => {
  it('identifies array fields', () => {
    expect(isArrayField(pageSchema, ['pages'])).toBe(true);
  });

  it('rejects non-array fields', () => {
    expect(isArrayField(pageSchema, ['pages', 'name'])).toBe(false);
  });
});

describe('ZodRecord support', () => {
  const taskDef = z.object({
    call: z.string().optional(),
    set: z.record(z.string(), z.unknown()).optional(),
    switch: z.array(z.unknown()).optional(),
  });
  const workflowSchema = z.object({
    do: z.array(z.record(z.string(), taskDef)),
  });

  it('navigateSchema walks through ZodRecord value type', () => {
    const result = navigateSchema(workflowSchema, ['do', 'myTask']);
    expect(result).not.toBeNull();
    const completions = schemaToCompletions(result!);
    const labels = completions.map(c => c.label);
    expect(labels).toContain('call');
    expect(labels).toContain('set');
    expect(labels).toContain('switch');
  });

  it('schemaToCompletions descends into ZodRecord value type', () => {
    const recordSchema = z.record(z.string(), taskDef);
    const completions = schemaToCompletions(recordSchema);
    const labels = completions.map(c => c.label);
    expect(labels).toContain('call');
    expect(labels).toContain('set');
    expect(labels).toContain('switch');
  });

  it('returns empty completions for ZodRecord with z.unknown() value', () => {
    const emptyRecord = z.record(z.string(), z.unknown());
    const completions = schemaToCompletions(emptyRecord);
    expect(completions).toEqual([]);
  });
});
