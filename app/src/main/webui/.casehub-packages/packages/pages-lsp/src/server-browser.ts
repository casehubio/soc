import {
  createConnection,
  BrowserMessageReader,
  BrowserMessageWriter,
  TextDocumentSyncKind,
  DiagnosticSeverity,
  CompletionItemKind,
  MarkupKind,
  type PublishDiagnosticsParams,
  type CompletionItem,
  type Hover,
} from 'vscode-languageserver/browser';
import { createSchemaRegistry } from './schema-registry.js';
import { createServerHandler } from './server.js';
import { pageFormat } from './formats/page.js';

const reader = new BrowserMessageReader(self as unknown as Worker);
const writer = new BrowserMessageWriter(self as unknown as Worker);
const connection = createConnection(reader, writer);
const registry = createSchemaRegistry();
registry.register(pageFormat);
const handler = createServerHandler(registry);

connection.onInitialize(() => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Full,
    completionProvider: handler.capabilities.completionProvider,
    hoverProvider: handler.capabilities.hoverProvider,
    renameProvider: { prepareProvider: true },
    definitionProvider: true,
    referencesProvider: true,
  },
}));

function toLspDiagnostics(notification: ReturnType<typeof handler.onDidOpen>): PublishDiagnosticsParams {
  return {
    uri: notification.uri,
    diagnostics: notification.diagnostics.map(d => ({
      range: d.range,
      severity: d.severity as DiagnosticSeverity,
      message: d.message,
      source: d.source,
    })),
  };
}

connection.onDidOpenTextDocument((params) => {
  void connection.sendDiagnostics(toLspDiagnostics(handler.onDidOpen(params.textDocument.uri, params.textDocument.text)));
});

connection.onDidChangeTextDocument((params) => {
  const content = params.contentChanges[0]?.text;
  if (content === undefined) return;
  void connection.sendDiagnostics(toLspDiagnostics(handler.onDidChange(params.textDocument.uri, content)));
});

connection.onDidCloseTextDocument((params) => {
  handler.onDidClose(params.textDocument.uri);
});

connection.onCompletion((params): CompletionItem[] => {
  return handler.onCompletion(params.textDocument.uri, params.position).map(c => ({
    label: c.label,
    kind: c.kind as CompletionItemKind,
    ...(c.textEdit
      ? { textEdit: { range: c.textEdit.range, newText: c.textEdit.newText } }
      : c.insertText ? { insertText: c.insertText } : {}),
    ...(c.detail ? { detail: c.detail } : {}),
  }));
});

connection.onHover((params): Hover | null => {
  const result = handler.onHover(params.textDocument.uri, params.position);
  if (!result) return null;
  return {
    contents: { kind: MarkupKind.Markdown, value: result.contents.value },
    ...(result.range ? { range: result.range } : {}),
  };
});

connection.onPrepareRename((params) => {
  const result = handler.onPrepareRename(params.textDocument.uri, params.position);
  if (!result) return null;
  return { range: result.range, placeholder: result.placeholder };
});

connection.onRenameRequest((params) => {
  const result = handler.onRename(params.textDocument.uri, params.position, params.newName);
  if (!result) return null;
  return { changes: result.changes };
});

connection.onDefinition((params) => {
  return handler.onDefinition(params.textDocument.uri, params.position).map(d => ({
    uri: d.uri,
    range: d.range,
  }));
});

connection.onReferences((params) => {
  return handler.onReferences(params.textDocument.uri, params.position).map(r => ({
    uri: r.uri,
    range: r.range,
  }));
});

connection.listen();
