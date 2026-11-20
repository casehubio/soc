import { buildYamlContext, navigateSchema, schemaToCompletions, isArrayField } from './schema-navigation.js';
import type { SchemaRegistry } from './types.js';

export interface CompletionItem {
  label: string;
  kind: number;
  insertText?: string;
  detail?: string;
  textEdit?: {
    range: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
    newText: string;
  };
}

const PROPERTY_KIND = 10;
const ENUM_MEMBER_KIND = 20;

function getWordStart(textBefore: string): number {
  const match = textBefore.match(/([\w][\w-]*)$/);
  return match ? textBefore.length - match[0].length : textBefore.length;
}

export function handleCompletion(
  uri: string,
  content: string,
  position: { line: number; character: number },
  registry: SchemaRegistry,
): CompletionItem[] {
  const format = registry.detect(uri, content);
  if (!format) return [];

  const lines = content.split('\n');
  let offset = 0;
  for (let i = 0; i < position.line; i++) {
    offset += (lines[i]?.length ?? 0) + 1;
  }
  offset += position.character;

  const yamlCtx = buildYamlContext(content, offset);
  const line = lines[position.line] ?? '';
  const textBefore = line.substring(0, position.character);

  const afterValueColon = textBefore.match(/(?:^|\s)-?\s*(\w[\w-]*):\s*(\S*)$/);
  if (afterValueColon) {
    const key = afterValueColon[1] ?? '';
    const partialValue = afterValueColon[2] ?? '';
    const resolved = navigateSchema(
      format.documentSchema,
      [...yamlCtx.path, key],
      yamlCtx.siblings,
    );
    if (resolved) {
      const completions = schemaToCompletions(resolved);
      if (completions.length > 0 && completions[0]?.type === 'enum') {
        const rangeStart = position.character - partialValue.length;
        return completions.map(c => ({
          label: c.label,
          kind: ENUM_MEMBER_KIND,
          ...(c.detail ? { detail: c.detail } : {}),
          textEdit: {
            range: {
              start: { line: position.line, character: rangeStart },
              end: { line: position.line, character: position.character },
            },
            newText: c.label,
          },
        }));
      }
    }
    return [];
  }

  const resolved = navigateSchema(format.documentSchema, yamlCtx.path, yamlCtx.siblings);
  if (!resolved) return [];

  const completions = schemaToCompletions(resolved, yamlCtx.siblings);
  const needsDash = isArrayField(format.documentSchema, yamlCtx.path, yamlCtx.siblings)
    && !textBefore.trimStart().startsWith('-');

  const wordStart = getWordStart(textBefore);

  const siblingKeys = new Set(Object.keys(yamlCtx.siblings));
  return completions
    .filter(c => c.type !== 'property' || !siblingKeys.has(c.label))
    .map(c => {
      const newText = needsDash ? '- ' + (c.apply || c.label) : c.apply || c.label;
      return {
        label: needsDash ? '- ' + c.label : c.label,
        kind: c.type === 'property' ? PROPERTY_KIND : ENUM_MEMBER_KIND,
        insertText: newText,
        ...(c.detail ? { detail: c.detail } : {}),
        textEdit: {
          range: {
            start: { line: position.line, character: wordStart },
            end: { line: position.line, character: position.character },
          },
          newText,
        },
      };
    });
}
