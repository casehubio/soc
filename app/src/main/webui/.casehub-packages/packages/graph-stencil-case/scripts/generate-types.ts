import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { compile } from 'json-schema-to-typescript';

const SCHEMA_DEFAULT_PATH = resolve(
  import.meta.dirname,
  '../../../../engine/schema/src/main/resources/schema/CaseDefinition.yaml',
);

const OUTPUT_PATH = resolve(
  import.meta.dirname,
  '../src/types/generated/case-definition.ts',
);

const CODEGEN_PREFIX = '_codegen';

async function main(): Promise<void> {
  const schemaPath = process.argv[2] ?? SCHEMA_DEFAULT_PATH;

  const yamlContent = readFileSync(schemaPath, 'utf-8');
  const schema = parseYaml(yamlContent) as Record<string, unknown>;

  const defs = schema.$defs as Record<string, unknown> | undefined;
  const spec = defs?.['CaseDefinitionSpec'] as
    | { properties?: Record<string, unknown> }
    | undefined;

  if (spec?.properties) {
    for (const key of Object.keys(spec.properties)) {
      if (key.startsWith(CODEGEN_PREFIX)) {
        delete spec.properties[key];
      }
    }
  }

  const ts = await compile(schema, 'CaseHub', {
    bannerComment: [
      '/* eslint-disable */',
      '/**',
      ' * This file was automatically generated from CaseDefinition.yaml.',
      ' * DO NOT MODIFY BY HAND. Run `yarn generate:types` to regenerate.',
      ' */',
    ].join('\n'),
    strictIndexSignatures: true,
    enableConstEnums: false,
    unknownAny: true,
  });

  const fixed = ts.replace(
    /(\s+\[k: string\]: GoalExpression \| undefined;)/,
    '  [k: string]: GoalExpression | string | undefined;',
  );

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, fixed, 'utf-8');
  console.log(`Generated: ${OUTPUT_PATH}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
