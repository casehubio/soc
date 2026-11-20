import type { SymbolExtractor, TextEdit } from './types.js';
import type { Position, Range } from '../utils.js';
import { positionToOffset, isPositionInRange } from '../utils.js';

export function prepareRename(
  content: string,
  position: Position,
  extractor: SymbolExtractor,
): { range: Range; placeholder: string } | null {
  const symbols = extractor(content);
  for (const sym of symbols) {
    if (isPositionInRange(position, sym.range)) {
      return { range: sym.range, placeholder: sym.name };
    }
  }
  return null;
}

export function computeRename(
  content: string,
  position: Position,
  newName: string,
  extractor: SymbolExtractor,
): TextEdit[] | null {
  const symbols = extractor(content);
  const target = symbols.find(s => isPositionInRange(position, s.range));
  if (!target) return null;

  const matches = symbols.filter(s => s.name === target.name && s.kind === target.kind);
  return matches.map(sym => {
    const startOffset = positionToOffset(content, sym.range.start);
    const firstChar = content[startOffset];
    let replacement: string;
    if (firstChar === '"') replacement = `"${newName}"`;
    else if (firstChar === "'") replacement = `'${newName}'`;
    else replacement = newName;
    return { range: sym.range, newText: replacement };
  });
}
