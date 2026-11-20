import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './index.js';

describe('PagesDurationInput', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('pages-duration-input');
    document.body.appendChild(el);
  });

  afterEach(() => { el.remove(); });

  it('registers as a custom element', () => {
    expect(customElements.get('pages-duration-input')).toBeDefined();
  });

  it('renders 3 number inputs for default fields (h/m/s)', async () => {
    await (el as any).updateComplete;
    const inputs = el.shadowRoot!.querySelectorAll('input[type="number"]');
    expect(inputs.length).toBe(3);
  });

  it('renders unit labels for default fields', async () => {
    await (el as any).updateComplete;
    const labels = el.shadowRoot!.querySelectorAll('.unit-label');
    expect(labels.length).toBe(3);
    expect(labels[0].textContent).toBe('h');
    expect(labels[1].textContent).toBe('m');
    expect(labels[2].textContent).toBe('s');
  });

  it('renders custom fields', async () => {
    (el as any).fields = ['days', 'hours', 'minutes'];
    await (el as any).updateComplete;
    const labels = el.shadowRoot!.querySelectorAll('.unit-label');
    expect(labels.length).toBe(3);
    expect(labels[0].textContent).toBe('d');
    expect(labels[1].textContent).toBe('h');
    expect(labels[2].textContent).toBe('m');
  });

  it('parses ISO 8601 duration string', async () => {
    (el as any).value = 'PT1H30M15S';
    await (el as any).updateComplete;
    const inputs = el.shadowRoot!.querySelectorAll('input[type="number"]');
    expect((inputs[0] as HTMLInputElement).value).toBe('1');
    expect((inputs[1] as HTMLInputElement).value).toBe('30');
    expect((inputs[2] as HTMLInputElement).value).toBe('15');
  });

  it('parses duration with days when field is visible', async () => {
    (el as any).fields = ['days', 'hours', 'minutes', 'seconds'];
    (el as any).value = 'P2DT4H';
    await (el as any).updateComplete;
    const inputs = el.shadowRoot!.querySelectorAll('input[type="number"]');
    expect((inputs[0] as HTMLInputElement).value).toBe('2');
    expect((inputs[1] as HTMLInputElement).value).toBe('4');
    expect((inputs[2] as HTMLInputElement).value).toBe('0');
    expect((inputs[3] as HTMLInputElement).value).toBe('0');
  });

  it('defaults to all zeros for invalid string', async () => {
    (el as any).value = 'not-a-duration';
    await (el as any).updateComplete;
    const inputs = el.shadowRoot!.querySelectorAll('input[type="number"]');
    expect((inputs[0] as HTMLInputElement).value).toBe('0');
    expect((inputs[1] as HTMLInputElement).value).toBe('0');
    expect((inputs[2] as HTMLInputElement).value).toBe('0');
  });

  it('defaults to all zeros for empty string', async () => {
    (el as any).value = '';
    await (el as any).updateComplete;
    const inputs = el.shadowRoot!.querySelectorAll('input[type="number"]');
    expect((inputs[0] as HTMLInputElement).value).toBe('0');
    expect((inputs[1] as HTMLInputElement).value).toBe('0');
    expect((inputs[2] as HTMLInputElement).value).toBe('0');
  });

  it('drops hidden units from parsed value', async () => {
    (el as any).fields = ['hours'];
    (el as any).value = 'P1YT2H30M';
    await (el as any).updateComplete;
    const inputs = el.shadowRoot!.querySelectorAll('input[type="number"]');
    expect(inputs.length).toBe(1);
    expect((inputs[0] as HTMLInputElement).value).toBe('2');
  });

  it('serializes with zeros omitted', async () => {
    (el as any).value = 'PT1H0M0S';
    await (el as any).updateComplete;
    const inputs = el.shadowRoot!.querySelectorAll('input[type="number"]');
    (inputs[1] as HTMLInputElement).value = '30';
    inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
    await (el as any).updateComplete;
    expect((el as any).value).toBe('PT1H30M');
  });

  it('serializes all-zero as PT0S', async () => {
    (el as any).value = 'PT0S';
    await (el as any).updateComplete;
    expect((el as any).value).toBe('PT0S');
  });

  it('fires change event on sub-input change', async () => {
    await (el as any).updateComplete;
    let fired = false;
    el.addEventListener('change', () => { fired = true; });
    const inputs = el.shadowRoot!.querySelectorAll('input[type="number"]');
    (inputs[0] as HTMLInputElement).value = '5';
    inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    expect(fired).toBe(true);
  });

  it('sets readonly on all inputs', async () => {
    (el as any).readonly = true;
    await (el as any).updateComplete;
    const inputs = el.shadowRoot!.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
      expect((input as HTMLInputElement).readOnly).toBe(true);
    });
  });

  it('sets disabled on all inputs', async () => {
    (el as any).disabled = true;
    await (el as any).updateComplete;
    const inputs = el.shadowRoot!.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
      expect((input as HTMLInputElement).disabled).toBe(true);
    });
  });

  it('renders label when provided', async () => {
    (el as any).label = 'Timeout';
    await (el as any).updateComplete;
    const label = el.shadowRoot!.querySelector('label');
    expect(label).not.toBeNull();
    expect(label!.textContent).toBe('Timeout');
  });

  it('shows error message', async () => {
    (el as any).error = 'Required';
    await (el as any).updateComplete;
    const err = el.shadowRoot!.querySelector('[role="alert"]');
    expect(err).not.toBeNull();
    expect(err!.textContent).toBe('Required');
  });

  it('sets aria attributes on group', async () => {
    (el as any).label = 'Duration';
    (el as any).required = true;
    (el as any).error = 'Required';
    await (el as any).updateComplete;
    const group = el.shadowRoot!.querySelector('[role="group"]');
    expect(group).not.toBeNull();
    expect(group!.getAttribute('aria-label')).toBe('Duration');
    expect(group!.getAttribute('aria-required')).toBe('true');
    expect(group!.getAttribute('aria-invalid')).toBe('true');
  });

  it('sets aria-label on individual inputs', async () => {
    (el as any).label = 'Duration';
    await (el as any).updateComplete;
    const inputs = el.shadowRoot!.querySelectorAll('input[type="number"]');
    expect((inputs[0] as HTMLInputElement).getAttribute('aria-label')).toBe('Duration hours');
    expect((inputs[1] as HTMLInputElement).getAttribute('aria-label')).toBe('Duration minutes');
    expect((inputs[2] as HTMLInputElement).getAttribute('aria-label')).toBe('Duration seconds');
  });

  it('enforces min=0 on all inputs', async () => {
    await (el as any).updateComplete;
    const inputs = el.shadowRoot!.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
      expect((input as HTMLInputElement).min).toBe('0');
    });
  });
});
