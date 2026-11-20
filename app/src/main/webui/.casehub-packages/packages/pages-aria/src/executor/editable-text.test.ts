import { describe, it, expect } from 'vitest';
import { EDITABLE_TEXT, findEditableText, isEditableText } from './editable-text.js';
import type { EditableText } from './editable-text.js';

function mockEditor(): EditableText {
  return {
    insertText: () => {},
    replaceRange: () => {},
    deleteRange: () => {},
    setCursor: () => {},
    getCursor: () => ({ line: 1, col: 0 }),
    getText: () => '',
    getLineCount: () => 1,
    setContent: () => {},
    highlight: () => {},
    clearHighlights: () => {},
  };
}

describe('findEditableText', () => {
  it('finds SPI on the element itself', () => {
    const el = document.createElement('div');
    (el as any)[EDITABLE_TEXT] = mockEditor();
    expect(findEditableText(el)).toBeDefined();
  });

  it('returns null when no SPI found', () => {
    const el = document.createElement('div');
    expect(findEditableText(el)).toBeNull();
  });

  it('walks up to parent with SPI', () => {
    const parent = document.createElement('div');
    (parent as any)[EDITABLE_TEXT] = mockEditor();
    const child = document.createElement('span');
    parent.appendChild(child);
    expect(findEditableText(child)).toBeDefined();
  });

  it('isEditableText returns true when symbol present', () => {
    const el = document.createElement('div');
    (el as any)[EDITABLE_TEXT] = mockEditor();
    expect(isEditableText(el)).toBe(true);
  });

  it('isEditableText returns false when symbol absent', () => {
    const el = document.createElement('div');
    expect(isEditableText(el)).toBe(false);
  });
});
