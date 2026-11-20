import { describe, it, expect } from 'vitest';
import type { NodeDecoration, PropertySchema } from './model.js';

describe('NodeDecoration', () => {
  it('accepts a full decoration', () => {
    const decoration: NodeDecoration = {
      badge: { icon: 'play', color: 'green', pulse: true, count: 3 },
      border: { style: 'dashed', color: 'red' },
      overlay: { type: 'heatmap', intensity: 0.7 },
      tooltip: 'Running: 3 of 5 complete',
    };
    expect(decoration.badge?.icon).toBe('play');
    expect(decoration.badge?.pulse).toBe(true);
    expect(decoration.badge?.count).toBe(3);
    expect(decoration.border?.style).toBe('dashed');
    expect(decoration.overlay?.type).toBe('heatmap');
    expect(decoration.overlay?.intensity).toBe(0.7);
    expect(decoration.tooltip).toBe('Running: 3 of 5 complete');
  });

  it('accepts an empty decoration', () => {
    const decoration: NodeDecoration = {};
    expect(decoration.badge).toBeUndefined();
    expect(decoration.border).toBeUndefined();
    expect(decoration.overlay).toBeUndefined();
    expect(decoration.tooltip).toBeUndefined();
  });

  it('accepts badge-only decoration', () => {
    const decoration: NodeDecoration = {
      badge: { icon: 'check', color: 'blue' },
    };
    expect(decoration.badge?.icon).toBe('check');
    expect(decoration.badge?.pulse).toBeUndefined();
    expect(decoration.badge?.count).toBeUndefined();
  });

  it('accepts decoration with pills', () => {
    const decoration: NodeDecoration = {
      pills: [
        { text: '0.92', color: '#16a34a', icon: '✓' },
        { text: '45ms', color: '#2563eb' },
      ],
    };
    expect(decoration.pills).toHaveLength(2);
    expect(decoration.pills![0]!.text).toBe('0.92');
    expect(decoration.pills![0]!.icon).toBe('✓');
    expect(decoration.pills![1]!.icon).toBeUndefined();
  });

  it('accepts decoration with pills and badge together', () => {
    const decoration: NodeDecoration = {
      badge: { icon: 'play', color: 'green' },
      pills: [{ text: 'SLA: 2h', color: '#dc2626' }],
    };
    expect(decoration.badge?.icon).toBe('play');
    expect(decoration.pills).toHaveLength(1);
  });

  it('accepts highlight overlay', () => {
    const decoration: NodeDecoration = {
      overlay: { type: 'highlight', intensity: 1.0 },
    };
    expect(decoration.overlay?.type).toBe('highlight');
  });
});

describe('PropertySchema', () => {
  it('accepts a JSON Schema object', () => {
    const schema: PropertySchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        timeout: { type: 'number', minimum: 0 },
      },
      required: ['name'],
    };
    expect(schema.type).toBe('object');
    expect(schema.required).toContain('name');
  });

  it('accepts schema with $defs', () => {
    const schema: PropertySchema = {
      type: 'object',
      $defs: {
        Binding: {
          type: 'object',
          properties: { workName: { type: 'string' } },
        },
      },
      $ref: '#/$defs/Binding',
    };
    expect(schema.$defs).toBeDefined();
    expect(schema.$ref).toBe('#/$defs/Binding');
  });

  it('accepts schema with oneOf for complex types', () => {
    const schema: PropertySchema = {
      oneOf: [
        { type: 'object', properties: { kind: { const: 'manual' } } },
        { type: 'object', properties: { kind: { const: 'automatic' } } },
      ],
    };
    expect(schema.oneOf).toHaveLength(2);
  });
});
