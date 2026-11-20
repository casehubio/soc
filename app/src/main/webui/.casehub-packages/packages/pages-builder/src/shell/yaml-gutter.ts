import { StateEffect, StateField, type Extension } from '@codemirror/state';
import { EditorView, Decoration, type DecorationSet, gutter, GutterMarker } from '@codemirror/view';

export const setHighlightRange = StateEffect.define<{ from: number; to: number } | null>();

class SelectionMarker extends GutterMarker {
  override toDOM(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'cm-builder-gutter-mark';
    return el;
  }
}

const marker = new SelectionMarker();

const highlightRangeField = StateField.define<{ from: number; to: number } | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setHighlightRange)) return e.value;
    }
    return value;
  },
});

const lineHighlightField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(_, tr) {
    const range = tr.state.field(highlightRangeField);
    if (!range) return Decoration.none;
    const decos: any[] = [];
    const doc = tr.state.doc;
    const startLine = doc.lineAt(range.from).number;
    const endLine = doc.lineAt(Math.min(range.to, doc.length)).number;
    for (let ln = startLine; ln <= endLine; ln++) {
      const line = doc.line(ln);
      decos.push(Decoration.line({ class: 'cm-builder-active-line' }).range(line.from));
    }
    return Decoration.set(decos);
  },
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  provide: f => EditorView.decorations.from(f as any),
});

const builderGutter = gutter({
  class: 'cm-builder-gutter',
  lineMarker(view, line) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const range = view.state.field(highlightRangeField as any) as { from: number; to: number } | null;
    if (!range) return null;
    const startLine = view.state.doc.lineAt(range.from).from;
    if (line.from >= startLine && line.from <= range.to) return marker;
    return null;
  },
  lineMarkerChange(update) {
    return update.transactions.some(tr => tr.effects.some(e => e.is(setHighlightRange)));
  },
});

const builderGutterTheme = EditorView.baseTheme({
  '.cm-builder-gutter': {
    width: '4px',
    minWidth: '4px',
    background: 'transparent',
  },
  '.cm-builder-gutter-mark': {
    width: '4px',
    height: '100%',
    backgroundColor: '#4285f4',
    borderRadius: '0',
  },
  '.cm-builder-active-line': {
    backgroundColor: 'rgba(66, 133, 244, 0.12)',
  },
});

export const builderHighlightExtension: Extension = [
  highlightRangeField,
  lineHighlightField,
  builderGutter,
  builderGutterTheme,
];
