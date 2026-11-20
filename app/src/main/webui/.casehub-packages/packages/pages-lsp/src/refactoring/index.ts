export type { SymbolOccurrence, SymbolExtractor, TextEdit, WorkspaceEdit, Range, Position } from './types.js';
export { pageSymbolExtractor } from './page-symbols.js';
export { prepareRename, computeRename } from './rename.js';
export { createWorkspaceIndex, type WorkspaceSymbolIndex, type LocatedSymbol } from './workspace-index.js';
export { yamlSetOrDelete, yamlSwitchVariant, yamlAppendWithUniqueName, type AppendOptions } from './yaml-edits.js';
