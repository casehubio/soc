import type { SymbolOccurrence, SymbolExtractor, TextEdit, WorkspaceEdit } from './types.js';
import { positionToOffset, isPositionInRange } from '../utils.js';

export interface LocatedSymbol extends SymbolOccurrence {
  uri: string;
}

export interface WorkspaceSymbolIndex {
  update(uri: string, content: string, extractor: SymbolExtractor): void;
  remove(uri: string): void;
  findDefinitions(name: string, kind: string): LocatedSymbol[];
  findReferences(name: string, kind: string): LocatedSymbol[];
  findAll(name: string, kind: string): LocatedSymbol[];
  getSymbolAt(uri: string, line: number, character: number): LocatedSymbol | undefined;
  crossFileRename(name: string, kind: string, newName: string, contents: Map<string, string>): WorkspaceEdit;
}

export function createWorkspaceIndex(): WorkspaceSymbolIndex {
  const documents = new Map<string, SymbolOccurrence[]>();

  function query(name: string, kind: string, role?: 'definition' | 'reference'): LocatedSymbol[] {
    const results: LocatedSymbol[] = [];
    for (const [uri, symbols] of documents) {
      for (const sym of symbols) {
        if (sym.name === name && sym.kind === kind && (!role || sym.role === role)) {
          results.push({ ...sym, uri });
        }
      }
    }
    return results;
  }

  return {
    update(uri: string, content: string, extractor: SymbolExtractor): void {
      documents.set(uri, extractor(content));
    },

    remove(uri: string): void {
      documents.delete(uri);
    },

    findDefinitions(name: string, kind: string): LocatedSymbol[] {
      return query(name, kind, 'definition');
    },

    findReferences(name: string, kind: string): LocatedSymbol[] {
      return query(name, kind, 'reference');
    },

    findAll(name: string, kind: string): LocatedSymbol[] {
      return query(name, kind);
    },

    getSymbolAt(uri: string, line: number, character: number): LocatedSymbol | undefined {
      const symbols = documents.get(uri);
      if (!symbols) return undefined;
      for (const sym of symbols) {
        if (isPositionInRange({ line, character }, sym.range)) {
          return { ...sym, uri };
        }
      }
      return undefined;
    },

    crossFileRename(name: string, kind: string, newName: string, contents: Map<string, string>): WorkspaceEdit {
      const all = query(name, kind);
      const changes: Record<string, TextEdit[]> = {};
      for (const sym of all) {
        const content = contents.get(sym.uri);
        if (!content) continue;
        const startOffset = positionToOffset(content, sym.range.start);
        const firstChar = content[startOffset];
        let replacement: string;
        if (firstChar === '"') replacement = `"${newName}"`;
        else if (firstChar === "'") replacement = `'${newName}'`;
        else replacement = newName;
        if (!changes[sym.uri]) changes[sym.uri] = [];
        changes[sym.uri]!.push({ range: sym.range, newText: replacement });
      }
      return { changes };
    },
  };
}
