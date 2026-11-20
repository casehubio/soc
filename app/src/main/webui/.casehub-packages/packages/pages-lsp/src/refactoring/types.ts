export type { Range, Position } from '../utils.js';

export interface SymbolOccurrence {
  name: string;
  kind: string;
  role: 'definition' | 'reference';
  range: import('../utils.js').Range;
}

export type SymbolExtractor = (content: string) => SymbolOccurrence[];

export interface TextEdit {
  range: import('../utils.js').Range;
  newText: string;
}

export interface WorkspaceEdit {
  changes: Record<string, TextEdit[]>;
}
