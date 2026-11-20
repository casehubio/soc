import { parseDocument } from 'yaml';
import type {
  DocumentInspector,
  FormatRegistration,
  SchemaRegistry,
} from './types.js';

function createDocumentInspector(content: string): DocumentInspector {
  const doc = parseDocument(content, { prettyErrors: false });
  const root = doc.toJSON() as Record<string, unknown> | null;

  return {
    hasKey(path: string[]): boolean {
      let current: unknown = root;
      for (const key of path) {
        if (current == null || typeof current !== 'object') return false;
        if (!(key in (current as Record<string, unknown>))) return false;
        current = (current as Record<string, unknown>)[key];
      }
      return true;
    },
    getKeys(path?: string[]): string[] {
      let current: unknown = root;
      if (path) {
        for (const key of path) {
          if (current == null || typeof current !== 'object') return [];
          current = (current as Record<string, unknown>)[key];
        }
      }
      if (current == null || typeof current !== 'object') return [];
      return Object.keys(current as Record<string, unknown>);
    },
  };
}

function extractExtension(uri: string): string | undefined {
  const path = uri.replace(/^file:\/\//, '');
  const parts = path.split('/');
  const filename = parts[parts.length - 1] ?? '';
  const dotParts = filename.split('.');
  if (dotParts.length >= 3) {
    return '.' + dotParts.slice(-2).join('.');
  }
  if (dotParts.length >= 2) {
    return '.' + dotParts[dotParts.length - 1];
  }
  return undefined;
}

export function createSchemaRegistry(): SchemaRegistry {
  const formats = new Map<string, FormatRegistration>();

  return {
    register(format: FormatRegistration): void {
      formats.set(format.formatId, format);
    },

    detect(uri: string, content: string): FormatRegistration | undefined {
      const ext = extractExtension(uri);

      if (ext) {
        for (const format of formats.values()) {
          if (format.extensions.includes(ext)) return format;
        }
      }

      if (!ext || ext === '.yaml' || ext === '.yml') {
        if (!content.trim()) return undefined;
        const inspector = createDocumentInspector(content);
        for (const format of formats.values()) {
          if (format.contentDetector?.(inspector)) return format;
        }
      }

      return undefined;
    },

    getSchema(formatId: string) {
      const format = formats.get(formatId);
      if (!format) throw new Error(`Unknown format: ${formatId}`);
      return format.documentSchema;
    },

    getVariantSchema(formatId, path, variantKey) {
      const format = formats.get(formatId);
      if (!format) return undefined;
      const dispatcher = format.variantDispatchers?.get(path);
      if (!dispatcher) return undefined;
      return dispatcher.variants.get(variantKey);
    },
  };
}
