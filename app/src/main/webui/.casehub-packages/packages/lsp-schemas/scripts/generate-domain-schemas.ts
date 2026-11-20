import { Project, Type, Symbol as MorphSymbol, SyntaxKind } from 'ts-morph';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface FormatConfig {
  formatId: string;
  rootTypeName: string;
  sourceFile: string;
  outputFile: string;
  exportName: string;
  discriminatorManifest?: string;
}

import type { DiscriminatorRule } from './discriminators/case-definition.js';

const FUNCTION_PROPS = new Set<string>();

function isFunction(type: Type): boolean {
  return type.getCallSignatures().length > 0;
}

function isIndexSignature(prop: MorphSymbol): boolean {
  const decl = prop.getValueDeclaration();
  if (!decl) return false;
  return decl.getKind() === SyntaxKind.IndexSignature;
}

const lazyRefs = new Map<string, Type>();

function getSchemaVarName(symbolName: string): string {
  const base = symbolName.charAt(0).toLowerCase() + symbolName.slice(1);
  return `${base}Schema`;
}

function tryBuildDiscriminatedUnion(
  type: Type,
  nonIndexProps: MorphSymbol[],
  depth: number,
  visited: Set<string>,
  discriminatorConfig?: Record<string, DiscriminatorRule>,
): string | null {
  if (!discriminatorConfig) return null;

  const aliasSymbol = type.getAliasSymbol();
  const symbol = aliasSymbol || type.getSymbol();
  const symbolName = symbol?.getName() ?? '';
  if (!symbolName || symbolName.startsWith('__')) return null;

  const rule = discriminatorConfig[symbolName];
  if (!rule) return null;

  const discKeys = new Set(rule.discriminatorKeys);
  const commonProps = nonIndexProps.filter(p => !discKeys.has(p.getName()));
  const variantProps = nonIndexProps.filter(p => discKeys.has(p.getName()));

  if (variantProps.length === 0) return null;

  const indent = '  '.repeat(depth + 2);
  const closingIndent = '  '.repeat(depth + 1);

  const commonFields = commonProps
    .map(p => propToZodField(p, depth + 1, visited, discriminatorConfig))
    .filter(Boolean);

  const commonSchema = commonFields.length > 0
    ? `z.object({\n${indent}${commonFields.join(`,\n${indent}`)},\n${closingIndent}})`
    : 'z.object({})';

  const branches = variantProps.map(p => {
    const field = propToZodField(p, depth + 1, visited, discriminatorConfig);
    return `${commonSchema}.extend({ ${field} })`;
  });

  return `z.union([\n${indent}${branches.join(`,\n${indent}`)},\n${closingIndent}])`;
}

export function typeToZod(type: Type, depth: number, visited: Set<string>, discriminatorConfig?: Record<string, DiscriminatorRule>): string {
  if (depth > 15) return 'z.unknown()';

  const text = type.getText();

  if (type.isString() || type.isStringLiteral()) return 'z.string()';
  if (type.isNumber() || type.isNumberLiteral()) return 'z.number()';
  if (type.isBoolean() || type.isBooleanLiteral()) return 'z.boolean()';
  if (type.isNull()) return 'z.null()';
  if (type.isUndefined()) return 'z.undefined()';
  if (text === 'unknown') return 'z.unknown()';
  if (text === 'never') return 'z.never()';

  if (type.isUnion()) {
    const members = type.getUnionTypes().filter(t => !t.isUndefined());
    if (members.length === 0) return 'z.undefined()';
    if (members.every(m => m.isStringLiteral())) {
      const values = members.map(m => JSON.stringify(m.getLiteralValue()));
      return `z.enum([${values.join(', ')}])`;
    }
    if (members.every(m => m.isBooleanLiteral())) return 'z.boolean()';
    if (members.length === 1) return typeToZod(members[0], depth + 1, visited, discriminatorConfig);
    const zodMembers = members.map(m => typeToZod(m, depth + 1, visited, discriminatorConfig));
    return `z.union([${zodMembers.join(', ')}])`;
  }

  if (type.isArray()) {
    const elem = type.getArrayElementType();
    if (!elem) return 'z.array(z.unknown())';
    return `z.array(${typeToZod(elem, depth + 1, visited, discriminatorConfig)})`;
  }

  if (text.startsWith('readonly ') && text.endsWith('[]')) {
    const inner = type.getTypeArguments()[0];
    if (inner) return `z.array(${typeToZod(inner, depth + 1, visited, discriminatorConfig)})`;
    return 'z.array(z.unknown())';
  }

  if (type.isTuple()) {
    const elements = type.getTupleElements();
    if (elements.length >= 2) {
      const allSame = elements.every(e => e.getText() === elements[0].getText());
      if (allSame) {
        return `z.array(${typeToZod(elements[0], depth + 1, visited, discriminatorConfig)})`;
      }
    }
    if (elements.length === 1) {
      return `z.array(${typeToZod(elements[0], depth + 1, visited, discriminatorConfig)})`;
    }
    const zodElements = elements.map(e => typeToZod(e, depth + 1, visited, discriminatorConfig));
    return `z.tuple([${zodElements.join(', ')}])`;
  }

  if (text.startsWith('Record<') || text.startsWith('Readonly<Record<')
      || text.includes('Record<string,')) {
    const typeArgs = type.getAliasTypeArguments();
    if (typeArgs.length === 2) {
      return `z.record(z.string(), ${typeToZod(typeArgs[1], depth + 1, visited, discriminatorConfig)})`;
    }
    const indexType = type.getStringIndexType();
    if (indexType) return `z.record(z.string(), ${typeToZod(indexType, depth + 1, visited, discriminatorConfig)})`;
    return 'z.record(z.string(), z.unknown())';
  }

  if (type.isIntersection()) {
    const intersectionTypes = type.getIntersectionTypes();
    const objectTypes = intersectionTypes.filter(t => t.isObject());
    if (objectTypes.length > 0) {
      const allProps = new Map<string, MorphSymbol>();
      for (const prop of type.getProperties()) {
        allProps.set(prop.getName(), prop);
      }
      const nonIndexProps = [...allProps.values()].filter(
        p => !isIndexSignature(p) && !p.getName().startsWith('__@'),
      );
      if (nonIndexProps.length === 0) return 'z.object({})';
      const unionResult = tryBuildDiscriminatedUnion(type, nonIndexProps, depth, visited, discriminatorConfig);
      if (unionResult) return unionResult;
      const fields = nonIndexProps
        .map(p => propToZodField(p, depth + 1, visited, discriminatorConfig))
        .filter(Boolean);
      if (fields.length === 0) return 'z.object({})';
      const indent = '  '.repeat(depth + 2);
      const closingIndent = '  '.repeat(depth + 1);
      return `z.object({\n${indent}${fields.join(`,\n${indent}`)},\n${closingIndent}})`;
    }
  }

  if (type.isObject() && !type.isArray()) {
    const stringIndexType = type.getStringIndexType();
    const props = type.getProperties();
    const nonIndexProps = props.filter(p => !isIndexSignature(p) && !p.getName().startsWith('__@'));
    if (stringIndexType && nonIndexProps.length === 0) {
      return `z.record(z.string(), ${typeToZod(stringIndexType, depth + 1, visited, discriminatorConfig)})`;
    }

    const symbol = type.getSymbol() || type.getAliasSymbol();
    const symbolName = symbol?.getName() ?? '';
    const isAnonymous = !symbolName || symbolName.startsWith('__');
    const symbolId = isAnonymous ? '' : (symbol?.getFullyQualifiedName() ?? '');

    if (symbolId && visited.has(symbolId)) {
      lazyRefs.set(symbolName, type);
      return `z.lazy(() => ${getSchemaVarName(symbolName)})`;
    }

    if (symbolId) visited.add(symbolId);

    if (props.length === 0) {
      if (symbolId) visited.delete(symbolId);
      return 'z.object({})';
    }

    const unionResult = tryBuildDiscriminatedUnion(type, nonIndexProps, depth, visited, discriminatorConfig);
    if (unionResult) {
      if (symbolId) visited.delete(symbolId);
      return unionResult;
    }

    const fields = props
      .map(p => propToZodField(p, depth + 1, visited, discriminatorConfig))
      .filter(Boolean);

    if (symbolId) visited.delete(symbolId);

    if (fields.length === 0) return 'z.object({})';
    const indent = '  '.repeat(depth + 2);
    const closingIndent = '  '.repeat(depth + 1);
    return `z.object({\n${indent}${fields.join(`,\n${indent}`)},\n${closingIndent}})`;
  }

  return 'z.unknown()';
}

export function propToZodField(
  prop: MorphSymbol,
  depth: number,
  visited: Set<string>,
  discriminatorConfig?: Record<string, DiscriminatorRule>,
): string {
  const name = prop.getName();
  if (isIndexSignature(prop)) return '';
  if (name.startsWith('__@')) return '';

  const decl = prop.getValueDeclaration();
  if (!decl) return '';

  const type = prop.getTypeAtLocation(decl);
  if (isFunction(type)) return '';

  const typeText = type.getText();
  if (typeText === 'unknown' || typeText === 'unknown | undefined') {
    const suffix = prop.isOptional() ? '.optional()' : '';
    const safeName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name) ? name : `"${name}"`;
    return `${safeName}: z.unknown()${suffix}`;
  }

  const isOptional = prop.isOptional();
  const baseType = isOptional ? type.getNonNullableType() : type;
  let zodType = typeToZod(baseType, depth, visited, discriminatorConfig);
  if (!zodType) return '';
  if (isOptional) zodType += '.optional()';

  const safeName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name) ? name : `"${name}"`;
  return `${safeName}: ${zodType}`;
}

function generateHeader(sourceDesc: string): string {
  return `// AUTO-GENERATED by scripts/generate-domain-schemas.ts — DO NOT EDIT
// Re-generate: yarn workspace @casehubio/mosaic-lsp-schemas run generate
// Source: ${sourceDesc}
import { z } from "zod";
`;
}

export function generateFormatSchema(
  project: Project,
  config: FormatConfig,
  discriminatorConfig?: Record<string, DiscriminatorRule>,
): string {
  const sourceFile = project.getSourceFileOrThrow(
    resolve(__dirname, config.sourceFile),
  );

  let rootType: Type;
  const typeAlias = sourceFile.getTypeAlias(config.rootTypeName);
  if (typeAlias) {
    rootType = typeAlias.getType();
  } else {
    const iface = sourceFile.getInterfaceOrThrow(config.rootTypeName);
    rootType = iface.getType();
  }

  lazyRefs.clear();
  const visited = new Set<string>();
  const zodCode = typeToZod(rootType, 0, visited, discriminatorConfig);

  let prelude = '';
  for (const [name, lazyType] of lazyRefs) {
    const lazyVisited = new Set<string>();
    const innerZod = typeToZod(lazyType, 0, lazyVisited, discriminatorConfig);
    prelude += `const ${getSchemaVarName(name)}: z.ZodType<unknown> = z.lazy(() => ${innerZod});\n\n`;
  }

  return `${generateHeader(config.sourceFile)}\n${prelude}export const ${config.exportName} = ${zodCode};\n`;
}

export const FORMATS: FormatConfig[] = [
  {
    formatId: 'caseDefinition',
    rootTypeName: 'CaseHub',
    sourceFile: '../../graph-stencil-case/src/types/generated/case-definition.ts',
    outputFile: '../src/schemas/case-definition.generated.ts',
    exportName: 'caseDefinitionDocumentSchema',
    discriminatorManifest: './discriminators/case-definition.js',
  },
  {
    formatId: 'org',
    rootTypeName: 'OrgStructureYaml',
    sourceFile: '../../graph-stencil-org/src/types.ts',
    outputFile: '../src/schemas/org.generated.ts',
    exportName: 'orgDocumentSchema',
  },
  {
    formatId: 'htn',
    rootTypeName: 'HtnDocumentYaml',
    sourceFile: '../../graph-stencil-htn/src/types/htn-yaml.ts',
    outputFile: '../src/schemas/htn.generated.ts',
    exportName: 'htnDocumentSchema',
  },
  {
    formatId: 'swf',
    rootTypeName: 'SwfDocumentYaml',
    sourceFile: '../../graph-stencil-swf/src/swf-yaml.ts',
    outputFile: '../src/schemas/swf.generated.ts',
    exportName: 'swfDocumentSchema',
  },
];

if (typeof process !== 'undefined' && process.argv[1] &&
    import.meta.url === `file://${process.argv[1]}`) {
  const project = new Project({
    tsConfigFilePath: resolve(__dirname, '../tsconfig.generator.json'),
  });

  for (const config of FORMATS) {
    let discriminatorConfig: Record<string, DiscriminatorRule> | undefined;
    if (config.discriminatorManifest) {
      const manifest = await import(resolve(__dirname, config.discriminatorManifest));
      discriminatorConfig = manifest.discriminators;
    }
    const output = generateFormatSchema(project, config, discriminatorConfig);
    const outPath = resolve(__dirname, config.outputFile);
    writeFileSync(outPath, output, 'utf-8');
    console.log(`Generated ${config.formatId} schema to ${outPath}`);
  }

  if (FORMATS.length === 0) {
    console.log('No formats configured yet.');
  }
}
