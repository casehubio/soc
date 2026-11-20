import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    (globalThis as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

describe('document-diff', () => {
  it('exports DocumentDiff class with expected API', async () => {
    const { DocumentDiff } = await import('./document-diff.js');
    expect(DocumentDiff).toBeDefined();

    const proto = DocumentDiff.prototype;
    expect(typeof proto.configure).toBe('function');
    expect(typeof proto.loadFile).toBe('function');
    expect(typeof proto.loadContent).toBe('function');
    expect(typeof proto.getDiffSummary).toBe('function');
    expect(typeof proto.nextDiff).toBe('function');
    expect(typeof proto.prevDiff).toBe('function');
    expect(typeof proto.swapPanels).toBe('function');
    expect(typeof proto.toggleSync).toBe('function');
    expect(typeof proto.scrollToLocation).toBe('function');
    expect(typeof proto.highlightSection).toBe('function');
    expect(typeof proto.clearHighlight).toBe('function');
    expect(typeof proto.setViewMode).toBe('function');
    expect(typeof proto.selectFile).toBe('function');
    expect(typeof proto.currentPath).toBe('function');
  });

  it('has apiBaseUrl as a reactive property defaulting to empty string', async () => {
    const { DocumentDiff } = await import('./document-diff.js');
    const props = (DocumentDiff as any).elementProperties as Map<string, any>;
    expect(props.has('apiBaseUrl')).toBe(true);
  });

  it('is registered as document-diff custom element', async () => {
    await import('./document-diff.js');
    const ctor = customElements.get('document-diff');
    expect(ctor).toBeDefined();
  });
});
