import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PageDocument } from '@casehubio/pages-document';
import { YamlSync, type EditorAdapter } from './yaml-sync.js';

const MINIMAL = `pages:
- name: Overview
  components:
  - type: title
    properties:
      text: Hello
`;

function createMockEditor(): EditorAdapter & { _value: string; _handler: ((v: string) => void) | null; simulateInput(v: string): void } {
  const mock = {
    _value: '',
    _handler: null as ((v: string) => void) | null,
    getValue() { return this._value; },
    setValue(v: string) { this._value = v; },
    onInput(handler: (v: string) => void) {
      this._handler = handler;
      return () => { this._handler = null; };
    },
    simulateInput(v: string) {
      this._value = v;
      this._handler?.(v);
    },
  };
  return mock;
}

describe('YamlSync', () => {
  let doc: PageDocument;
  let editor: ReturnType<typeof createMockEditor>;
  let sync: YamlSync;

  beforeEach(() => {
    vi.useFakeTimers();
    doc = PageDocument.parse(MINIMAL);
    editor = createMockEditor();
    sync = new YamlSync(doc, editor);
  });

  afterEach(() => {
    sync.disconnect();
    vi.useRealTimers();
  });

  it('pushes facade changes to editor', () => {
    sync.connect();
    doc.addPage('Dashboard');
    expect(editor._value).toContain('Dashboard');
  });

  it('parses editor input back to document after debounce', () => {
    sync.connect();
    const changes: PageDocument[] = [];
    sync.onDocumentChange(d => changes.push(d));

    const newYaml = `pages:\n- name: Updated\n  components:\n  - type: title\n`;
    editor.simulateInput(newYaml);

    expect(changes).toHaveLength(0);
    vi.advanceTimersByTime(150);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.getPages()[0]!.name).toBe('Updated');
  });

  it('suppresses echo: facade change does not re-trigger editor→facade', () => {
    sync.connect();
    const changes: PageDocument[] = [];
    sync.onDocumentChange(d => changes.push(d));

    doc.addPage('Dashboard');
    vi.advanceTimersByTime(200);

    expect(changes).toHaveLength(0);
  });

  it('suppresses echo: editor input does not re-trigger facade→editor', () => {
    sync.connect();
    const setValueSpy = vi.spyOn(editor, 'setValue');

    const newYaml = `pages:\n- name: Updated\n`;
    editor.simulateInput(newYaml);
    vi.advanceTimersByTime(150);

    // setValue should not be called by the onChange triggered from the re-parse
    // It will be called 0 times because the echo suppression prevents it
    const callsAfterInput = setValueSpy.mock.calls.length;
    expect(callsAfterInput).toBe(0);
  });

  it('debounces rapid editor inputs', () => {
    sync.connect();
    const changes: PageDocument[] = [];
    sync.onDocumentChange(d => changes.push(d));

    editor.simulateInput(`pages:\n- name: A\n`);
    vi.advanceTimersByTime(50);
    editor.simulateInput(`pages:\n- name: AB\n`);
    vi.advanceTimersByTime(50);
    editor.simulateInput(`pages:\n- name: ABC\n`);
    vi.advanceTimersByTime(150);

    expect(changes).toHaveLength(1);
    expect(changes[0]!.getPages()[0]!.name).toBe('ABC');
  });

  it('handles invalid YAML from editor gracefully', () => {
    sync.connect();
    const changes: PageDocument[] = [];
    sync.onDocumentChange(d => changes.push(d));

    editor.simulateInput('pages:\n  - [invalid yaml');
    vi.advanceTimersByTime(150);

    expect(changes).toHaveLength(1);
    expect(changes[0]!.diagnostics.length).toBeGreaterThan(0);
  });

  it('disconnect stops listening', () => {
    sync.connect();
    sync.disconnect();

    doc.addPage('Dashboard');
    expect(editor._value).not.toContain('Dashboard');
  });

  it('setting document property updates editor', () => {
    sync.connect();
    const newDoc = PageDocument.parse(`pages:\n- name: New\n`);
    sync.document = newDoc;
    expect(editor._value).toContain('New');
  });
});
