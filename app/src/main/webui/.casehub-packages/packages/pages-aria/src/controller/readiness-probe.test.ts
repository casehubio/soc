import { describe, it, expect, beforeEach } from 'vitest';
import { probeReadiness } from './readiness-probe.js';

describe('probeReadiness', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns ready when all targets found', () => {
    document.body.innerHTML = '<button aria-label="Submit">Submit</button>';
    const result = probeReadiness([{ role: 'button', name: 'Submit' }]);
    expect(result).toBe('ready');
  });

  it('returns not-ready when targets missing', () => {
    document.body.innerHTML = '<div>nothing here</div>';
    const result = probeReadiness([{ role: 'button', name: 'Submit' }]);
    expect(result).toBe('not-ready');
  });

  it('returns unknown when no targets', () => {
    const result = probeReadiness([]);
    expect(result).toBe('unknown');
  });

  it('returns not-ready when some targets missing', () => {
    document.body.innerHTML = '<button aria-label="Submit">Submit</button>';
    const result = probeReadiness([
      { role: 'button', name: 'Submit' },
      { role: 'textbox', name: 'Name' },
    ]);
    expect(result).toBe('not-ready');
  });

  it('handles within scoping', () => {
    document.body.innerHTML = `
      <div role="form" aria-label="Login">
        <input aria-label="Username" />
      </div>
    `;
    const result = probeReadiness([{
      role: 'textbox', name: 'Username',
      within: { role: 'form', name: 'Login' },
    }]);
    expect(result).toBe('ready');
  });

  it('handles index-based targets', () => {
    document.body.innerHTML = `
      <div role="row">Row 0</div>
      <div role="row">Row 1</div>
    `;
    const result = probeReadiness([{ role: 'row', index: '0' }]);
    expect(result).toBe('ready');
  });
});
