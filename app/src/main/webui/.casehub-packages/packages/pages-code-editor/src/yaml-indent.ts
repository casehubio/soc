import { keymap, type KeyBinding } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

export function computeNewlineIndent(line: string, tabSize: number): string {
  const leadingMatch = line.match(/^(\s*)/);
  const baseIndent = leadingMatch?.[1] ?? '';
  const trimmed = line.trim();
  const dashPrefix = trimmed.startsWith('- ');
  const contentIndent = dashPrefix ? baseIndent + '  ' : baseIndent;
  if (trimmed.endsWith(':')) {
    return contentIndent + ' '.repeat(tabSize);
  }
  if (dashPrefix) {
    const afterDash = trimmed.slice(2);
    if (afterDash.includes(': ')) return contentIndent;
    return baseIndent;
  }
  return baseIndent;
}

export function computeBackspaceIndent(
  lineText: string,
  cursorCol: number,
  tabSize: number,
): number | null {
  const beforeCursor = lineText.substring(0, cursorCol);
  if (beforeCursor.length === 0) return null;
  if (beforeCursor.trim().length > 0) return null;
  const targetCol = Math.max(0, Math.floor((cursorCol - 1) / tabSize) * tabSize);
  return targetCol;
}

export function yamlIndentBindings(tabSize = 2): KeyBinding[] {
  return [
    {
      key: 'Enter',
      run(view) {
        const { state } = view;
        const pos = state.selection.main.head;
        const line = state.doc.lineAt(pos);
        const indent = computeNewlineIndent(line.text, tabSize);
        view.dispatch(state.update({
          changes: { from: pos, insert: '\n' + indent },
          selection: { anchor: pos + 1 + indent.length },
          scrollIntoView: true,
          userEvent: 'input',
        }));
        return true;
      },
    },
    {
      key: 'Backspace',
      run(view) {
        const { state } = view;
        const sel = state.selection.main;
        if (!sel.empty) return false;
        const pos = sel.head;
        const line = state.doc.lineAt(pos);
        const col = pos - line.from;
        const target = computeBackspaceIndent(line.text, col, tabSize);
        if (target === null) return false;
        view.dispatch(state.update({
          changes: { from: line.from + target, to: pos },
          userEvent: 'delete',
        }));
        return true;
      },
    },
  ];
}

export function yamlIndentKeymap(tabSize = 2): Extension {
  return keymap.of(yamlIndentBindings(tabSize));
}
