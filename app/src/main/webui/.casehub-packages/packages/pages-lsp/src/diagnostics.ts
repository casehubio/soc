import { parseDocument } from 'yaml';
import type { SchemaRegistry } from './types.js';
import { offsetToPosition } from './utils.js';

export interface Diagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity: 1 | 2 | 3 | 4;
  message: string;
  source: string;
}

export function computeDiagnostics(
  uri: string,
  content: string,
  registry: SchemaRegistry,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const doc = parseDocument(content, { prettyErrors: false });

  for (const error of doc.errors) {
    const start = offsetToPosition(content, error.pos[0]);
    const end = offsetToPosition(content, error.pos[1]);
    diagnostics.push({
      range: { start, end },
      severity: 1,
      message: error.message,
      source: 'casehub-yaml',
    });
  }

  if (diagnostics.length > 0) return diagnostics;

  const format = registry.detect(uri, content);
  if (!format) return [];

  const parsed = doc.toJSON();
  const result = format.documentSchema.safeParse(parsed);
  if (result.success) return [];

  for (const issue of result.error.issues) {
    diagnostics.push({
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      },
      severity: 2,
      message: `${issue.path.join('.')}: ${issue.message}`,
      source: 'casehub-schema',
    });
  }

  return diagnostics;
}
