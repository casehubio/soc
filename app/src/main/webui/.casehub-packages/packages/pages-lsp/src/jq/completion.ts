export interface JqCompletionItem {
  label: string;
  kind: number;
  insertText: string;
}

const FIELD_KIND = 5;

export function completeJqPath(
  expr: string,
  cursorOffset: number,
  columns: string[],
): JqCompletionItem[] {
  const before = expr.substring(0, cursorOffset);
  const dotMatch = before.match(/\.(\w*)$/);
  if (!dotMatch) return [];

  const prefix = dotMatch[1] ?? '';
  return columns
    .filter(col => col.startsWith(prefix))
    .map(col => ({
      label: col,
      kind: FIELD_KIND,
      insertText: col,
    }));
}
