import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { type Extension } from '@codemirror/state';
import { z } from 'zod';
import {
  buildYamlContext,
  navigateSchema,
  schemaToCompletions,
  isArrayField,
  type CompletionEntry,
} from '@casehubio/pages-lsp';

export type { YamlContext } from '@casehubio/pages-lsp';

function schemaCompletionSource(
  schema: z.ZodType,
): (context: CompletionContext) => CompletionResult | null {
  return (context: CompletionContext) => {
    const line = context.state.doc.lineAt(context.pos);
    const textBefore = line.text.substring(0, context.pos - line.from);
    const doc = context.state.doc.toString();
    const yamlCtx = buildYamlContext(doc, context.pos);

    const afterValueColon = textBefore.match(/(?:^|\s)-?\s*(\w[\w-]*):\s*(\S*)$/);
    if (afterValueColon) {
      const key = afterValueColon[1] ?? '';
      const prefix = afterValueColon[2] ?? '';
      const resolved = navigateSchema(schema, [...yamlCtx.path, key], yamlCtx.siblings);
      if (resolved) {
        const completions = schemaToCompletions(resolved);
        if (completions.length > 0 && completions[0]?.type === 'enum') {
          return {
            from: context.pos - prefix.length,
            options: completions.map(c => ({ ...c, type: 'enum' as const })),
          };
        }
      }
      return null;
    }

    const keyMatch = textBefore.match(/(?:^|\s)-?\s*(\w[\w-]*)$/);
    const resolved = navigateSchema(schema, yamlCtx.path, yamlCtx.siblings);
    if (!resolved) return null;
    const completions = schemaToCompletions(resolved);
    if (completions.length === 0) return null;

    const needsDash = isArrayField(schema, yamlCtx.path, yamlCtx.siblings)
      && !textBefore.trimStart().startsWith('-');

    function applyDash(c: CompletionEntry) {
      const apply = needsDash ? '- ' + (c.apply || c.label) : c.apply;
      return {
        label: needsDash ? '- ' + c.label : c.label,
        ...(c.detail ? { detail: c.detail } : {}),
        type: c.type,
        ...(apply ? { apply } : {}),
      };
    }

    if (keyMatch) {
      const prefix = keyMatch[1] ?? '';
      if (!prefix && !context.explicit) return null;
      return {
        from: needsDash ? context.pos - prefix.length : context.pos - prefix.length,
        options: completions.map(applyDash),
      };
    }

    const emptyMatch = textBefore.match(/(?:^|\s)-?\s*$/);
    if (emptyMatch && context.explicit) {
      return {
        from: context.pos,
        options: completions.map(applyDash),
      };
    }

    return null;
  };
}

export function createSchemaCompletion(schema: z.ZodType): Extension {
  return autocompletion({
    override: [schemaCompletionSource(schema)],
    activateOnTyping: true,
  });
}
