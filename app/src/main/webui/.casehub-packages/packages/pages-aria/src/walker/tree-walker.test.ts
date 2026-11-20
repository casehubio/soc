import { describe, it, expect, beforeEach } from 'vitest';
import { findByRole, findAllByRole, getAccessibleName, getAriaState } from './tree-walker.js';

describe('ARIA tree walker', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('findByRole', () => {
    it('finds element by explicit role and aria-label', () => {
      document.body.innerHTML = '<div role="button" aria-label="Submit">Submit</div>';
      const el = findByRole('button', 'Submit');
      expect(el).not.toBeNull();
      expect(el?.getAttribute('role')).toBe('button');
    });

    it('finds element by implicit role from tag name', () => {
      document.body.innerHTML = '<button>Submit</button>';
      const el = findByRole('button', 'Submit');
      expect(el).not.toBeNull();
      expect(el?.tagName).toBe('BUTTON');
    });

    it('returns null when no match', () => {
      document.body.innerHTML = '<button aria-label="Submit">Submit</button>';
      expect(findByRole('button', 'Cancel')).toBeNull();
    });

    it('returns null when role does not match', () => {
      document.body.innerHTML = '<div role="textbox" aria-label="Submit">Submit</div>';
      expect(findByRole('button', 'Submit')).toBeNull();
    });

    it('scopes search within a parent element', () => {
      document.body.innerHTML = `
        <div role="row" aria-label="Row A"><button aria-label="Delete">Delete</button></div>
        <div role="row" aria-label="Row B"><button aria-label="Delete">Delete</button></div>
      `;
      const rowB = document.querySelector('[aria-label="Row B"]')!;
      const deleteBtn = findByRole('button', 'Delete', rowB);
      expect(deleteBtn).not.toBeNull();
      expect(deleteBtn?.closest('[aria-label="Row B"]')).not.toBeNull();
    });

    it('matches aria-label over text content when both exist', () => {
      document.body.innerHTML = '<button aria-label="Save changes">Save</button>';
      expect(findByRole('button', 'Save changes')).not.toBeNull();
      expect(findByRole('button', 'Save')).toBeNull();
    });
  });

  describe('findAllByRole', () => {
    it('returns all matching elements', () => {
      document.body.innerHTML = `
        <button aria-label="Delete">Delete</button>
        <button aria-label="Delete">Delete</button>
        <button aria-label="Save">Save</button>
      `;
      expect(findAllByRole('button', 'Delete')).toHaveLength(2);
    });

    it('returns all elements of a role when name not specified', () => {
      document.body.innerHTML = `
        <button aria-label="A">A</button>
        <button aria-label="B">B</button>
      `;
      expect(findAllByRole('button')).toHaveLength(2);
    });

    it('returns empty array when no match', () => {
      document.body.innerHTML = '<div>no buttons</div>';
      expect(findAllByRole('button')).toHaveLength(0);
    });
  });

  describe('getAccessibleName', () => {
    it('returns aria-label when present', () => {
      document.body.innerHTML = '<button aria-label="Submit form">Go</button>';
      expect(getAccessibleName(document.querySelector('button')!)).toBe('Submit form');
    });

    it('falls back to text content when no aria-label', () => {
      document.body.innerHTML = '<button>Submit</button>';
      expect(getAccessibleName(document.querySelector('button')!)).toBe('Submit');
    });

    it('resolves aria-labelledby', () => {
      document.body.innerHTML = `
        <span id="lbl">My Label</span>
        <div role="textbox" aria-labelledby="lbl"></div>
      `;
      expect(getAccessibleName(document.querySelector('[role="textbox"]')!)).toBe('My Label');
    });

    it('returns empty string for unlabelled element', () => {
      document.body.innerHTML = '<div role="button"></div>';
      expect(getAccessibleName(document.querySelector('[role="button"]')!)).toBe('');
    });
  });

  describe('getAriaState', () => {
    it('reads boolean ARIA attributes', () => {
      document.body.innerHTML = '<button aria-busy="true" aria-disabled="false" aria-expanded="true">X</button>';
      const state = getAriaState(document.querySelector('button')!);
      expect(state.busy).toBe(true);
      expect(state.disabled).toBe(false);
      expect(state.expanded).toBe(true);
    });

    it('returns undefined for absent attributes', () => {
      document.body.innerHTML = '<button>X</button>';
      const state = getAriaState(document.querySelector('button')!);
      expect(state.busy).toBeUndefined();
      expect(state.disabled).toBeUndefined();
    });

    it('handles aria-checked mixed', () => {
      document.body.innerHTML = '<div role="checkbox" aria-checked="mixed">X</div>';
      const state = getAriaState(document.querySelector('[role="checkbox"]')!);
      expect(state.checked).toBe('mixed');
    });

    it('reads aria-hidden', () => {
      document.body.innerHTML = '<div aria-hidden="true">X</div>';
      const state = getAriaState(document.querySelector('div')!);
      expect(state.hidden).toBe(true);
    });
  });
});
