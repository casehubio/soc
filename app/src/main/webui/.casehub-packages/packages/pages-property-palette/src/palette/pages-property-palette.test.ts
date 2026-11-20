import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../index.js';
import type { PropertyPaletteSource } from '../types.js';

describe('PagesPropertyPalette', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('pages-property-palette');
    document.body.appendChild(el);
  });

  afterEach(() => { el.remove(); });

  it('registers as a custom element', () => {
    expect(customElements.get('pages-property-palette')).toBeDefined();
  });

  it('renders empty when source is undefined', async () => {
    await (el as any).updateComplete;
    const palette = el.shadowRoot!.querySelector('.palette');
    expect(palette).not.toBeNull();
    expect(palette!.children.length).toBe(0);
  });

  it('renders fields from schema', async () => {
    (el as any).source = {
      schema: {
        properties: {
          name: { type: 'string', title: 'Name' },
          count: { type: 'number', title: 'Count' },
        },
      },
      data: { name: 'hello', count: 5 },
      onChange: () => {},
    } satisfies PropertyPaletteSource;
    await (el as any).updateComplete;
    const inputs = el.shadowRoot!.querySelectorAll('pages-input, pages-number-input');
    expect(inputs.length).toBe(2);
  });

  it('renders groups from x-group', async () => {
    (el as any).source = {
      schema: {
        properties: {
          color: { type: 'string', 'x-group': 'Appearance', title: 'Color' },
          size: { type: 'number', 'x-group': 'Appearance', title: 'Size' },
          name: { type: 'string', title: 'Name' },
        },
      },
      data: {},
      onChange: () => {},
    };
    await (el as any).updateComplete;
    const details = el.shadowRoot!.querySelectorAll('details.group');
    expect(details.length).toBe(1);
    expect(details[0]!.querySelector('summary')!.textContent).toContain('Appearance');
  });

  it('renders ungrouped fields before groups', async () => {
    (el as any).source = {
      schema: {
        properties: {
          color: { type: 'string', 'x-group': 'Appearance', title: 'Color' },
          name: { type: 'string', title: 'Name' },
        },
      },
      data: {},
      onChange: () => {},
    };
    await (el as any).updateComplete;
    const palette = el.shadowRoot!.querySelector('.palette')!;
    const ungrouped = palette.querySelector('.ungrouped-fields');
    const group = palette.querySelector('details.group');
    expect(ungrouped).not.toBeNull();
    expect(group).not.toBeNull();
    const children = [...palette.children].filter(c => c.classList.contains('ungrouped-fields') || c.tagName === 'DETAILS');
    expect(children[0]!.classList.contains('ungrouped-fields')).toBe(true);
    expect(children[1]!.tagName).toBe('DETAILS');
  });

  it('hides advanced fields by default', async () => {
    (el as any).source = {
      schema: {
        properties: {
          name: { type: 'string', title: 'Name' },
          debug: { type: 'boolean', title: 'Debug', 'x-visibility': 'advanced' },
        },
      },
      data: {},
      onChange: () => {},
    };
    await (el as any).updateComplete;
    const checkboxes = el.shadowRoot!.querySelectorAll('pages-checkbox');
    expect(checkboxes.length).toBe(0);
    const toggle = el.shadowRoot!.querySelector('.advanced-toggle');
    expect(toggle).not.toBeNull();
  });

  it('shows advanced fields when toggled', async () => {
    (el as any).source = {
      schema: {
        properties: {
          debug: { type: 'boolean', title: 'Debug', 'x-visibility': 'advanced' },
        },
      },
      data: {},
      onChange: () => {},
    };
    await (el as any).updateComplete;
    const toggle = el.shadowRoot!.querySelector('.advanced-toggle input') as HTMLInputElement;
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    await (el as any).updateComplete;
    const checkboxes = el.shadowRoot!.querySelectorAll('pages-checkbox');
    expect(checkboxes.length).toBe(1);
  });

  it('maps boolean value to pages-checkbox checked property', async () => {
    (el as any).source = {
      schema: { properties: { enabled: { type: 'boolean', title: 'Enabled' } } },
      data: { enabled: true },
      onChange: () => {},
    };
    await (el as any).updateComplete;
    const cb = el.shadowRoot!.querySelector('pages-checkbox') as any;
    expect(cb).not.toBeNull();
    expect(cb.checked).toBe(true);
  });

  it('calls source.onChange on field change', async () => {
    const changes: Array<{ field: (string | number)[]; value: unknown }> = [];
    (el as any).source = {
      schema: { properties: { name: { type: 'string' } } },
      data: { name: 'old' },
      onChange: (f: (string | number)[], v: unknown) => changes.push({ field: f, value: v }),
    };
    await (el as any).updateComplete;
    const input = el.shadowRoot!.querySelector('pages-input') as any;
    input.value = 'new';
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    expect(changes).toEqual([{ field: ['name'], value: 'new' }]);
  });

  it('renders nested object with field paths', async () => {
    const changes: Array<{ field: (string | number)[]; value: unknown }> = [];
    (el as any).source = {
      schema: {
        properties: {
          address: {
            type: 'object',
            title: 'Address',
            properties: {
              city: { type: 'string', title: 'City' },
            },
          },
        },
      },
      data: { address: { city: 'London' } },
      onChange: (f: (string | number)[], v: unknown) => changes.push({ field: f, value: v }),
    };
    await (el as any).updateComplete;
    const details = el.shadowRoot!.querySelectorAll('details');
    expect(details.length).toBeGreaterThanOrEqual(1);
    const input = el.shadowRoot!.querySelector('pages-input') as any;
    expect(input).not.toBeNull();
    input.value = 'Paris';
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    expect(changes).toEqual([{ field: ['address', 'city'], value: 'Paris' }]);
  });

  it('sets all fields readonly when source.readonly is true', async () => {
    (el as any).source = {
      schema: { properties: { name: { type: 'string' } } },
      data: { name: 'test' },
      readonly: true,
      onChange: () => {},
    };
    await (el as any).updateComplete;
    const input = el.shadowRoot!.querySelector('pages-input') as any;
    expect(input.readonly).toBe(true);
  });

  it('renders empty palette when schema has no properties', async () => {
    (el as any).source = {
      schema: {},
      data: {},
      onChange: () => {},
    };
    await (el as any).updateComplete;
    const palette = el.shadowRoot!.querySelector('.palette');
    expect(palette).not.toBeNull();
    expect(palette!.children.length).toBe(0);
  });

  it('renders select for string with enum', async () => {
    (el as any).source = {
      schema: { properties: { status: { type: 'string', enum: ['active', 'inactive'] } } },
      data: { status: 'active' },
      onChange: () => {},
    };
    await (el as any).updateComplete;
    const select = el.shadowRoot!.querySelector('pages-select') as any;
    expect(select).not.toBeNull();
    expect(select.options.length).toBe(2);
  });

  it('uses custom resolver when provided', async () => {
    (el as any).source = {
      schema: { properties: { custom: { type: 'string', title: 'Custom' } } },
      data: {},
      onChange: () => {},
    };
    (el as any).resolver = (_schema: any) => {
      return { kind: 'tag', tag: 'pages-textarea' };
    };
    await (el as any).updateComplete;
    const textarea = el.shadowRoot!.querySelector('pages-textarea');
    expect(textarea).not.toBeNull();
  });

  it('falls through to default resolver when custom returns undefined', async () => {
    (el as any).source = {
      schema: { properties: { name: { type: 'string' } } },
      data: {},
      onChange: () => {},
    };
    (el as any).resolver = () => undefined;
    await (el as any).updateComplete;
    const input = el.shadowRoot!.querySelector('pages-input');
    expect(input).not.toBeNull();
  });

  it('shows required indicator', async () => {
    (el as any).source = {
      schema: {
        properties: { name: { type: 'string', title: 'Name' } },
        required: ['name'],
      },
      data: {},
      onChange: () => {},
    };
    await (el as any).updateComplete;
    const indicator = el.shadowRoot!.querySelector('.required-indicator');
    expect(indicator).not.toBeNull();
    expect(indicator!.textContent).toBe('*');
  });

  it('reuses DOM elements across re-renders', async () => {
    const onChange = () => {};
    (el as any).source = {
      schema: { properties: { name: { type: 'string', title: 'Name' } } },
      data: { name: 'hello' },
      onChange,
    } satisfies PropertyPaletteSource;
    await (el as any).updateComplete;

    const firstInput = (el as any).getFieldElement('name');
    expect(firstInput).toBeDefined();
    expect(firstInput.tagName.toLowerCase()).toBe('pages-input');

    (el as any).source = {
      schema: { properties: { name: { type: 'string', title: 'Name' } } },
      data: { name: 'world' },
      onChange,
    };
    await (el as any).updateComplete;

    const secondInput = (el as any).getFieldElement('name');
    expect(secondInput).toBe(firstInput);
    expect(secondInput.value).toBe('world');
  });

  it('exposes field elements via getFieldElement', async () => {
    (el as any).source = {
      schema: {
        properties: {
          name: { type: 'string', title: 'Name' },
          age: { type: 'number', title: 'Age' },
        },
      },
      data: { name: 'test', age: 25 },
      onChange: () => {},
    } satisfies PropertyPaletteSource;
    await (el as any).updateComplete;

    const nameEl = (el as any).getFieldElement('name');
    expect(nameEl).not.toBeNull();
    expect(nameEl.tagName.toLowerCase()).toBe('pages-input');

    const ageEl = (el as any).getFieldElement('age');
    expect(ageEl).not.toBeNull();
    expect(ageEl.tagName.toLowerCase()).toBe('pages-number-input');

    const missing = (el as any).getFieldElement('nonexistent');
    expect(missing).toBeUndefined();
  });

  it('sets errors on field elements via setFieldErrors', async () => {
    (el as any).source = {
      schema: {
        properties: {
          name: { type: 'string', title: 'Name' },
          age: { type: 'number', title: 'Age' },
        },
      },
      data: { name: '', age: 25 },
      onChange: () => {},
    } satisfies PropertyPaletteSource;
    await (el as any).updateComplete;

    const errors = new Map<string, string | undefined>();
    errors.set('name', 'Required field');
    errors.set('age', undefined);
    (el as any).setFieldErrors(errors);
    await (el as any).updateComplete;

    const nameEl = (el as any).getFieldElement('name');
    expect(nameEl.error).toBe('Required field');

    const ageEl = (el as any).getFieldElement('age');
    expect(ageEl.error).toBeUndefined();
  });

  it('prunes cached elements when fields are removed from schema', async () => {
    (el as any).source = {
      schema: {
        properties: {
          name: { type: 'string', title: 'Name' },
          age: { type: 'number', title: 'Age' },
        },
      },
      data: { name: 'test', age: 25 },
      onChange: () => {},
    } satisfies PropertyPaletteSource;
    await (el as any).updateComplete;
    expect((el as any).getFieldElement('age')).toBeDefined();

    (el as any).source = {
      schema: { properties: { name: { type: 'string', title: 'Name' } } },
      data: { name: 'test' },
      onChange: () => {},
    };
    await (el as any).updateComplete;

    expect((el as any).getFieldElement('age')).toBeUndefined();
    expect((el as any).getFieldElement('name')).toBeDefined();
  });

  it('renders help icon from x-help', async () => {
    (el as any).source = {
      schema: {
        properties: { name: { type: 'string', title: 'Name', 'x-help': 'Enter your full name' } },
      },
      data: {},
      onChange: () => {},
    };
    await (el as any).updateComplete;
    const help = el.shadowRoot!.querySelector('.help-icon');
    expect(help).not.toBeNull();
    expect(help!.getAttribute('title')).toBe('Enter your full name');
  });
});
