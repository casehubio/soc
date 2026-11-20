export type {
  FormatRegistration,
  DocumentInspector,
  VariantDispatch,
  SchemaRegistry,
} from './types.js';
export { createSchemaRegistry } from './schema-registry.js';
export { detectFormat } from './detection.js';
export {
  buildYamlContext,
  navigateSchema,
  schemaToCompletions,
  isArrayField,
  unwrap,
  type CompletionEntry,
  type YamlContext,
} from './schema-navigation.js';
export { handleCompletion, type CompletionItem } from './completion.js';
export { computeDiagnostics, type Diagnostic } from './diagnostics.js';
export { handleHover, type HoverResult } from './hover.js';
export { initializeServer, createServerHandler, type ServerCapabilities, type ServerHandler } from './server.js';
export type { SymbolOccurrence, SymbolExtractor, TextEdit, WorkspaceEdit, LocatedSymbol } from './refactoring/index.js';
export { pageSymbolExtractor, prepareRename, computeRename, createWorkspaceIndex, type WorkspaceSymbolIndex } from './refactoring/index.js';
export { yamlSetOrDelete, yamlSwitchVariant, yamlAppendWithUniqueName, type AppendOptions } from './refactoring/index.js';
