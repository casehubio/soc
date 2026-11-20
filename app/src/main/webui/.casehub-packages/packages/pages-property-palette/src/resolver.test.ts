import { describe, it, expect } from 'vitest';
import { resolveEditor } from './resolver.js';

describe('resolveEditor', () => {
  it('resolves string to pages-input', () => {
    expect(resolveEditor({ type: 'string' })).toEqual({ kind: 'tag', tag: 'pages-input' });
  });

  it('resolves string with enum to pages-select', () => {
    const result = resolveEditor({ type: 'string', enum: ['a', 'b'] });
    expect(result.kind).toBe('tag');
    expect((result as any).tag).toBe('pages-select');
  });

  it('resolves string format:color to pages-color-swatch', () => {
    expect(resolveEditor({ type: 'string', format: 'color' })).toEqual({ kind: 'tag', tag: 'pages-color-swatch' });
  });

  it('resolves string format:date to pages-date-input', () => {
    expect(resolveEditor({ type: 'string', format: 'date' })).toEqual({ kind: 'tag', tag: 'pages-date-input' });
  });

  it('resolves string format:date-time to pages-datetime-input', () => {
    expect(resolveEditor({ type: 'string', format: 'date-time' })).toEqual({ kind: 'tag', tag: 'pages-datetime-input' });
  });

  it('resolves string format:uri to pages-input type url', () => {
    expect(resolveEditor({ type: 'string', format: 'uri' })).toEqual({ kind: 'tag', tag: 'pages-input', config: { type: 'url' } });
  });

  it('resolves string x-display-hint:textarea to pages-textarea', () => {
    expect(resolveEditor({ type: 'string', 'x-display-hint': 'textarea' })).toEqual({ kind: 'tag', tag: 'pages-textarea' });
  });

  it('resolves number to pages-number-input', () => {
    expect(resolveEditor({ type: 'number' })).toEqual({ kind: 'tag', tag: 'pages-number-input' });
  });

  it('resolves integer to pages-number-input', () => {
    expect(resolveEditor({ type: 'integer' })).toEqual({ kind: 'tag', tag: 'pages-number-input' });
  });

  it('resolves number x-display-hint:slider to pages-slider', () => {
    expect(resolveEditor({ type: 'number', 'x-display-hint': 'slider' })).toEqual({ kind: 'tag', tag: 'pages-slider' });
  });

  it('resolves boolean to pages-checkbox', () => {
    expect(resolveEditor({ type: 'boolean' })).toEqual({ kind: 'tag', tag: 'pages-checkbox' });
  });

  it('resolves array of strings to pages-tag-editor', () => {
    expect(resolveEditor({ type: 'array', items: { type: 'string' } })).toEqual({ kind: 'tag', tag: 'pages-tag-editor' });
  });

  it('resolves array with items.enum to multi-select render', () => {
    const result = resolveEditor({ type: 'array', items: { type: 'string', enum: ['a', 'b'] } });
    expect(result.kind).toBe('render');
  });

  it('resolves object with properties to nested render', () => {
    const result = resolveEditor({ type: 'object', properties: { name: { type: 'string' } } });
    expect(result.kind).toBe('render');
  });

  it('resolves object without properties to JSON display', () => {
    const result = resolveEditor({ type: 'object' });
    expect(result.kind).toBe('render');
  });

  it('handles nullable type ["string", "null"]', () => {
    expect(resolveEditor({ type: ['string', 'null'] })).toEqual({ kind: 'tag', tag: 'pages-input' });
  });

  it('handles nullable type ["number", "null"]', () => {
    expect(resolveEditor({ type: ['number', 'null'] })).toEqual({ kind: 'tag', tag: 'pages-number-input' });
  });

  it('returns JSON display fallback for unknown type', () => {
    const result = resolveEditor({});
    expect(result.kind).toBe('render');
  });

  it('returns JSON display fallback for missing type', () => {
    const result = resolveEditor({ title: 'unknown' });
    expect(result.kind).toBe('render');
  });

  it('resolves string format:duration to pages-duration-input', () => {
    expect(resolveEditor({ type: 'string', format: 'duration' })).toEqual({ kind: 'tag', tag: 'pages-duration-input' });
  });

  it('enum takes precedence over format for strings', () => {
    const result = resolveEditor({ type: 'string', enum: ['red', 'blue'], format: 'color' });
    expect((result as any).tag).toBe('pages-select');
  });

  it('x-display-hint:textarea takes precedence over format for strings', () => {
    const result = resolveEditor({ type: 'string', 'x-display-hint': 'textarea', format: 'uri' });
    expect((result as any).tag).toBe('pages-textarea');
  });
});
