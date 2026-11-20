import type { SchemaRegistry } from './types.js';
import { handleCompletion } from './completion.js';
import { computeDiagnostics } from './diagnostics.js';
import { handleHover } from './hover.js';
import { prepareRename } from './refactoring/rename.js';
import type { TextEdit } from './refactoring/types.js';
import { createWorkspaceIndex } from './refactoring/workspace-index.js';

export interface ServerCapabilities {
  textDocumentSync: number;
  completionProvider: {
    resolveProvider: boolean;
    triggerCharacters: string[];
  };
  hoverProvider: boolean;
  renameProvider?: { prepareProvider: boolean };
  definitionProvider?: boolean;
  referencesProvider?: boolean;
}

export interface Position {
  line: number;
  character: number;
}

export interface TextDocumentIdentifier {
  uri: string;
}

export interface DiagnosticsNotification {
  uri: string;
  diagnostics: Array<{
    range: { start: Position; end: Position };
    severity: number;
    message: string;
    source: string;
  }>;
}

export interface ServerHandler {
  capabilities: ServerCapabilities;
  onDidOpen(uri: string, text: string): DiagnosticsNotification;
  onDidChange(uri: string, text: string): DiagnosticsNotification;
  onDidClose(uri: string): void;
  onCompletion(uri: string, position: Position): Array<{
    label: string;
    kind: number;
    insertText?: string;
    detail?: string;
    textEdit?: {
      range: { start: Position; end: Position };
      newText: string;
    };
  }>;
  onHover(uri: string, position: Position): {
    contents: { kind: string; value: string };
    range?: { start: Position; end: Position };
  } | null;
  onPrepareRename(uri: string, position: Position): { range: { start: Position; end: Position }; placeholder: string } | null;
  onRename(uri: string, position: Position, newName: string): { changes: Record<string, TextEdit[]> } | null;
  onDefinition(uri: string, position: Position): Array<{ uri: string; range: { start: Position; end: Position } }>;
  onReferences(uri: string, position: Position): Array<{ uri: string; range: { start: Position; end: Position } }>;
}

export function initializeServer(_registry: SchemaRegistry): ServerCapabilities {
  return {
    textDocumentSync: 1,
    completionProvider: {
      resolveProvider: false,
      triggerCharacters: [':', ' ', '-'],
    },
    hoverProvider: true,
    renameProvider: { prepareProvider: true },
    definitionProvider: true,
    referencesProvider: true,
  };
}

export function createServerHandler(registry: SchemaRegistry): ServerHandler {
  const documents = new Map<string, string>();
  const index = createWorkspaceIndex();

  function updateIndex(uri: string, content: string): void {
    const format = registry.detect(uri, content);
    if (format?.symbolExtractor) {
      index.update(uri, content, format.symbolExtractor);
    }
  }

  function publishDiagnostics(uri: string, content: string): DiagnosticsNotification {
    const diags = computeDiagnostics(uri, content, registry);
    return {
      uri,
      diagnostics: diags.map(d => ({
        range: d.range,
        severity: d.severity,
        message: d.message,
        source: d.source,
      })),
    };
  }

  return {
    capabilities: initializeServer(registry),

    onDidOpen(uri: string, text: string) {
      documents.set(uri, text);
      updateIndex(uri, text);
      return publishDiagnostics(uri, text);
    },

    onDidChange(uri: string, text: string) {
      documents.set(uri, text);
      updateIndex(uri, text);
      return publishDiagnostics(uri, text);
    },

    onDidClose(uri: string) {
      documents.delete(uri);
      index.remove(uri);
    },

    onCompletion(uri: string, position: Position) {
      const content = documents.get(uri) ?? '';
      return handleCompletion(uri, content, position, registry);
    },

    onHover(uri: string, position: Position) {
      const content = documents.get(uri) ?? '';
      const result = handleHover(uri, content, position, registry);
      if (!result) return null;
      return {
        contents: { kind: 'markdown', value: result.contents },
        ...(result.range ? { range: result.range } : {}),
      };
    },

    onPrepareRename(uri: string, position: Position) {
      const content = documents.get(uri) ?? '';
      const format = registry.detect(uri, content);
      if (!format?.symbolExtractor) return null;
      return prepareRename(content, position, format.symbolExtractor);
    },

    onRename(uri: string, position: Position, newName: string) {
      const sym = index.getSymbolAt(uri, position.line, position.character);
      if (!sym) return null;
      return index.crossFileRename(sym.name, sym.kind, newName, documents);
    },

    onDefinition(uri: string, position: Position) {
      const sym = index.getSymbolAt(uri, position.line, position.character);
      if (!sym) return [];
      return index.findDefinitions(sym.name, sym.kind).map(d => ({
        uri: d.uri,
        range: d.range,
      }));
    },

    onReferences(uri: string, position: Position) {
      const sym = index.getSymbolAt(uri, position.line, position.character);
      if (!sym) return [];
      return index.findAll(sym.name, sym.kind).map(r => ({
        uri: r.uri,
        range: r.range,
      }));
    },
  };
}
