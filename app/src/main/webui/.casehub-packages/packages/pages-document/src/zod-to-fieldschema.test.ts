import { describe, it, expect } from 'vitest';
import { zodToFieldSchema } from './zod-to-fieldschema.js';
import { z } from 'zod';
import { barChartPropsSchema } from '@casehubio/pages-schema';

describe('zodToFieldSchema', () => {
  it('converts string', () => {
    expect(zodToFieldSchema(z.string())).toEqual({ type: 'string' });
  });

  it('converts number', () => {
    expect(zodToFieldSchema(z.number())).toEqual({ type: 'number' });
  });

  it('converts boolean', () => {
    expect(zodToFieldSchema(z.boolean())).toEqual({ type: 'boolean' });
  });

  it('converts enum', () => {
    const fs = zodToFieldSchema(z.enum(['a', 'b', 'c']));
    expect(fs.type).toBe('string');
    expect(fs.enum).toEqual(['a', 'b', 'c']);
  });

  it('converts object with properties', () => {
    const schema = z.object({ name: z.string(), count: z.number() });
    const fs = zodToFieldSchema(schema);
    expect(fs.type).toBe('object');
    expect(fs.properties).toBeDefined();
    expect(fs.properties!['name']!.type).toBe('string');
    expect(fs.properties!['count']!.type).toBe('number');
    expect(fs.required).toEqual(['name', 'count']);
  });

  it('marks optional fields as not required', () => {
    const schema = z.object({ name: z.string(), tag: z.string().optional() });
    const fs = zodToFieldSchema(schema);
    expect(fs.required).toEqual(['name']);
  });

  it('converts array', () => {
    const fs = zodToFieldSchema(z.array(z.string()));
    expect(fs.type).toBe('array');
    expect(fs.items).toEqual({ type: 'string' });
  });

  it('converts nested objects', () => {
    const schema = z.object({
      margin: z.object({
        top: z.number().optional(),
        left: z.number().optional(),
      }).optional(),
    });
    const fs = zodToFieldSchema(schema);
    expect(fs.properties!['margin']!.type).toBe('object');
    expect(fs.properties!['margin']!.properties!['top']!.type).toBe('number');
  });

  it('unwraps optional/default/nullable', () => {
    const schema = z.object({
      a: z.string().optional(),
      b: z.number().default(0),
      c: z.boolean().nullable(),
    });
    const fs = zodToFieldSchema(schema);
    expect(fs.properties!['a']!.type).toBe('string');
    expect(fs.properties!['b']!.type).toBe('number');
    expect(fs.properties!['c']!.type).toBe('boolean');
  });

  it('converts record to object', () => {
    const fs = zodToFieldSchema(z.record(z.string(), z.string()));
    expect(fs.type).toBe('object');
  });

  it('caches results', () => {
    const schema = z.object({ x: z.string() });
    const a = zodToFieldSchema(schema);
    const b = zodToFieldSchema(schema);
    expect(a).toBe(b);
  });

  it('converts real component schema (bar-chart has subtype enum)', () => {
    if (!barChartPropsSchema) return;
    const fs = zodToFieldSchema(barChartPropsSchema);
    expect(fs.type).toBe('object');
    expect(fs.properties).toBeDefined();
    expect(fs.properties!['subtype']).toBeDefined();
    expect(fs.properties!['subtype']!.enum).toContain('column');
  });
});
