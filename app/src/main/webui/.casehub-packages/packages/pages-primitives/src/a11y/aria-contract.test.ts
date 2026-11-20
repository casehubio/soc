import { describe, it, expect } from 'vitest';
import type { AriaRole, AriaInteractive, AriaTarget, AriaState } from './aria-contract.js';

describe('ARIA contract types', () => {
  it('AriaInteractive requires role and ariaLabel', () => {
    const component: AriaInteractive = {
      role: 'button',
      ariaLabel: 'Submit form',
    };
    expect(component.role).toBe('button');
    expect(component.ariaLabel).toBe('Submit form');
  });

  it('AriaInteractive accepts optional state properties', () => {
    const component: AriaInteractive = {
      role: 'textbox',
      ariaLabel: 'Name',
      ariaBusy: false,
      ariaDisabled: true,
    };
    expect(component.ariaDisabled).toBe(true);
  });

  it('AriaTarget supports nested within scoping', () => {
    const target: AriaTarget = {
      role: 'button',
      name: 'Delete',
      within: { role: 'row', name: 'Case #42' },
    };
    expect(target.within?.role).toBe('row');
    expect(target.within?.name).toBe('Case #42');
  });

  it('AriaState captures standard ARIA state properties', () => {
    const state: AriaState = {
      busy: false,
      disabled: false,
      expanded: true,
      selected: false,
      checked: 'mixed',
      hidden: false,
    };
    expect(state.expanded).toBe(true);
    expect(state.checked).toBe('mixed');
  });

  it('AriaRole constrains to valid WAI-ARIA roles', () => {
    const roles: AriaRole[] = ['button', 'grid', 'tree', 'meter', 'log', 'alertdialog'];
    expect(roles).toHaveLength(6);
  });
});
