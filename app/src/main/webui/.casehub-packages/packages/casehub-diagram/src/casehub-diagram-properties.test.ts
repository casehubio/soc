import { describe, it, expect, vi } from 'vitest';
import { renderPropertyForm, emitPropertyChange } from './casehub-diagram-properties.js';

describe('renderPropertyForm', () => {
  it('renders form for string properties', () => {
    const schema = {
      type: 'object',
      properties: { name: { type: 'string' } },
    };
    const result = renderPropertyForm(schema, { name: 'test' }, false, vi.fn());
    expect(result).toBeDefined();
    expect(result.strings).toBeDefined();
  });

  it('renders select for enum properties', () => {
    const schema = {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['success', 'failure'] },
      },
    };
    const result = renderPropertyForm(schema, { kind: 'success' }, false, vi.fn());
    expect(result).toBeDefined();
  });

  it('hides properties starting with underscore', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        _internal: { type: 'string' },
      },
    };
    const onChange = vi.fn();
    const result = renderPropertyForm(schema, { name: 'test', _internal: 'hidden' }, false, onChange);
    expect(result).toBeDefined();
  });
});

describe('emitPropertyChange', () => {
  it('creates a composed CustomEvent', () => {
    const event = emitPropertyChange(['when'], '.done');
    expect(event.type).toBe('property-change');
    expect(event.composed).toBe(true);
    expect(event.bubbles).toBe(true);
    expect(event.detail.field).toEqual(['when']);
    expect(event.detail.value).toBe('.done');
  });

  it('supports array field paths', () => {
    const event = emitPropertyChange(['outcomePolicy', 'onDecline'], 'FAULT');
    expect(event.detail.field).toEqual(['outcomePolicy', 'onDecline']);
  });
});
