import { describe, it, expect, vi, beforeEach } from 'vitest';
import './value-editor.js';
import type { PreferenceSchemaDescriptor } from './types.js';

describe('ValueEditor', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  function create(schema: Partial<PreferenceSchemaDescriptor>, value: string) {
    const el = document.createElement('agency-value-editor') as any;
    el.schema = {
      namespace: 'test', name: 'key', qualifiedName: 'test.key',
      type: 'string', label: 'Test', description: null,
      defaultValue: '', multiValue: false, constraints: {}, options: [],
      ...schema,
    };
    el.value = value;
    document.body.appendChild(el);
    return el;
  }

  it('renders text input for string type', async () => {
    const el = create({ type: 'string' }, 'hello');
    await el.updateComplete;
    const input = el.shadowRoot!.querySelector('input[type="text"]');
    expect(input).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe('hello');
  });

  it('renders number input for integer type with step=1', async () => {
    const el = create({ type: 'integer', constraints: { min: 1, max: 100 } }, '42');
    await el.updateComplete;
    const input = el.shadowRoot!.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.step).toBe('1');
    expect(input.min).toBe('1');
    expect(input.max).toBe('100');
  });

  it('renders number input for number type with step=any', async () => {
    const el = create({ type: 'number' }, '3.14');
    await el.updateComplete;
    const input = el.shadowRoot!.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.step).toBe('any');
  });

  it('renders checkbox for boolean type', async () => {
    const el = create({ type: 'boolean' }, 'true');
    await el.updateComplete;
    const input = el.shadowRoot!.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.checked).toBe(true);
  });

  it('renders select for enum type', async () => {
    const el = create({
      type: 'enum',
      options: [{ value: 'A', label: 'Alpha' }, { value: 'B', label: 'Beta' }],
    }, 'A');
    await el.updateComplete;
    const select = el.shadowRoot!.querySelector('select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.value).toBe('A');
    expect(select.options).toHaveLength(2);
  });

  it('renders text input for duration type', async () => {
    const el = create({ type: 'duration' }, 'PT24H');
    await el.updateComplete;
    const input = el.shadowRoot!.querySelector('input');
    expect(input).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe('PT24H');
  });

  it('emits value-changed on input change', async () => {
    const el = create({ type: 'string' }, 'old');
    await el.updateComplete;
    const handler = vi.fn();
    el.addEventListener('value-changed', handler);
    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    input.value = 'new';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0]![0].detail.value).toBe('new');
  });

  it('applies pattern constraint to string input', async () => {
    const el = create({ type: 'string', constraints: { pattern: '^https?://' } }, 'not-a-url');
    await el.updateComplete;
    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    expect(input.pattern).toBe('^https?://');
  });

  it('renders disabled when disabled property set', async () => {
    const el = create({ type: 'string' }, 'hello');
    el.disabled = true;
    await el.updateComplete;
    const input = el.shadowRoot!.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('emits value-changed with boolean string on checkbox toggle', async () => {
    const el = create({ type: 'boolean' }, 'false');
    await el.updateComplete;
    const handler = vi.fn();
    el.addEventListener('value-changed', handler);
    const input = el.shadowRoot!.querySelector('input[type="checkbox"]') as HTMLInputElement;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(handler.mock.calls[0]![0].detail.value).toBe('true');
  });
});
