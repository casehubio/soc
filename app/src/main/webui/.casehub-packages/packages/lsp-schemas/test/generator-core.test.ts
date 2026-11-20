import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import { typeToZod, propToZodField } from '../scripts/generate-domain-schemas.js';
import type { DiscriminatorRule } from '../scripts/discriminators/case-definition.js';

describe('typeToZod', () => {
  const project = new Project({ useInMemoryFileSystem: true });

  function zodForType(typeCode: string): string {
    const file = project.createSourceFile(
      'test.ts',
      `export type T = ${typeCode};`,
      { overwrite: true },
    );
    const typeAlias = file.getTypeAliasOrThrow('T');
    return typeToZod(typeAlias.getType(), 0, new Set());
  }

  it('maps string to z.string()', () => {
    expect(zodForType('string')).toBe('z.string()');
  });

  it('maps number to z.number()', () => {
    expect(zodForType('number')).toBe('z.number()');
  });

  it('maps boolean to z.boolean()', () => {
    expect(zodForType('boolean')).toBe('z.boolean()');
  });

  it('maps string literal union to z.enum()', () => {
    const result = zodForType("'a' | 'b' | 'c'");
    expect(result).toBe('z.enum(["a", "b", "c"])');
  });

  it('maps string array to z.array(z.string())', () => {
    expect(zodForType('string[]')).toBe('z.array(z.string())');
  });

  it('maps Record<string, number> to a keyed Zod 4 record', () => {
    expect(zodForType('Record<string, number>')).toBe('z.record(z.string(), z.number())');
  });

  it('maps unknown to z.unknown()', () => {
    expect(zodForType('unknown')).toBe('z.unknown()');
  });

  it('maps object type to z.object()', () => {
    const result = zodForType('{ name: string; age?: number }');
    expect(result).toContain('z.object(');
    expect(result).toContain('name: z.string()');
    expect(result).toContain('age: z.number().optional()');
  });
});

describe('propToZodField — index signature stripping', () => {
  const project = new Project({ useInMemoryFileSystem: true });

  it('strips index signature properties', () => {
    const file = project.createSourceFile(
      'idx.ts',
      `export interface Foo {
        name: string;
        [k: string]: unknown;
      }`,
      { overwrite: true },
    );
    const iface = file.getInterfaceOrThrow('Foo');
    const props = iface.getType().getProperties();
    const fields = props
      .map(p => propToZodField(p, 0, new Set()))
      .filter(Boolean);
    expect(fields).toHaveLength(1);
    expect(fields[0]).toContain('name: z.string()');
  });

  it('skips function-typed properties', () => {
    const file = project.createSourceFile(
      'fn.ts',
      `export interface Bar {
        label: string;
        onClick: () => void;
      }`,
      { overwrite: true },
    );
    const iface = file.getInterfaceOrThrow('Bar');
    const props = iface.getType().getProperties();
    const fields = props
      .map(p => propToZodField(p, 0, new Set()))
      .filter(Boolean);
    expect(fields).toHaveLength(1);
    expect(fields[0]).toContain('label: z.string()');
  });
});

describe('CaseDefinition generation', () => {
  it('generated schema parses a valid case definition', async () => {
    const { caseDefinitionDocumentSchema } = await import(
      '../src/schemas/case-definition.generated.js'
    );
    const result = caseDefinitionDocumentSchema.safeParse({
      dsl: '1.0',
      namespace: 'test',
      name: 'TestCase',
      version: '1.0.0',
      spec: {
        capabilities: [{ name: 'cap1' }],
        bindings: [{
          name: 'b1',
          on: { contextChange: { filter: '.status == "active"' } },
          capability: 'cap1',
        }],
        workers: [{
          name: 'w1',
          capabilities: ['cap1'],
        }],
      },
    });
    expect(result.success).toBe(true);
  });

  it('generated schema rejects missing required fields', async () => {
    const { caseDefinitionDocumentSchema } = await import(
      '../src/schemas/case-definition.generated.js'
    );
    const result = caseDefinitionDocumentSchema.safeParse({
      spec: {},
    });
    expect(result.success).toBe(false);
  });

  it('generated schema validates binding trigger types', async () => {
    const { caseDefinitionDocumentSchema } = await import(
      '../src/schemas/case-definition.generated.js'
    );
    const result = caseDefinitionDocumentSchema.safeParse({
      dsl: '1.0',
      namespace: 'test',
      name: 'TestCase',
      version: '1.0.0',
      spec: {
        bindings: [{
          name: 'b1',
          on: { cloudEvent: 'my.event.type' },
          capability: 'cap1',
        }],
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('SWF generation', () => {
  it('generated schema parses a valid SWF document', async () => {
    const { swfDocumentSchema } = await import(
      '../src/schemas/swf.generated.js'
    );
    const result = swfDocumentSchema.safeParse({
      document: { dsl: '1.0', name: 'test-workflow' },
      do: [{ callTask: { call: 'http', with: { uri: 'https://example.com' } } }],
    });
    expect(result.success).toBe(true);
  });
});

describe('Org generation', () => {
  it('generated schema parses a valid org document', async () => {
    const { orgDocumentSchema } = await import(
      '../src/schemas/org.generated.js'
    );
    const result = orgDocumentSchema.safeParse({
      organization: {
        units: [{
          unitId: 'u1',
          name: 'Engineering',
          tenancyId: 't1',
          members: [{ agentId: 'a1' }],
          capabilities: [{ name: 'coding' }],
          goals: [{ name: 'ship' }],
          constraints: [{ name: 'budget' }],
        }],
        relationships: [{
          sourceAgentId: 'a1',
          targetAgentId: 'a2',
          kind: 'SUPERVISES',
          tenancyId: 't1',
        }],
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid relationship kind', async () => {
    const { orgDocumentSchema } = await import(
      '../src/schemas/org.generated.js'
    );
    const result = orgDocumentSchema.safeParse({
      organization: {
        units: [],
        relationships: [{
          sourceAgentId: 'a1',
          targetAgentId: 'a2',
          kind: 'INVALID_KIND',
          tenancyId: 't1',
        }],
      },
    });
    expect(result.success).toBe(false);
  });
});

describe('HTN generation', () => {
  it('generated schema parses a valid HTN document with recursion', async () => {
    const { htnDocumentSchema } = await import(
      '../src/schemas/htn.generated.js'
    );
    const result = htnDocumentSchema.safeParse({
      dsl: '1.0',
      namespace: 'test',
      name: 'TestHTN',
      spec: {
        decomposition: {
          root: {
            name: 'root-task',
            methods: [{
              guard: '.status == "active"',
              tasks: [{
                name: 'leaf-task',
                capability: 'cap1',
              }, {
                name: 'compound-task',
                methods: [{
                  tasks: [{ name: 'nested-leaf', capability: 'cap2' }],
                }],
              }],
            }],
          },
        },
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('discriminator-aware generation', () => {
  const project = new Project({ useInMemoryFileSystem: true });

  function zodForTypeWithDiscriminators(
    typeCode: string,
    typeName: string,
    discriminatorConfig: Record<string, DiscriminatorRule>,
  ): string {
    const file = project.createSourceFile(
      'disc.ts',
      typeCode,
      { overwrite: true },
    );
    const typeAlias = file.getTypeAliasOrThrow(typeName);
    return typeToZod(typeAlias.getType(), 0, new Set(), discriminatorConfig);
  }

  it('produces z.union for key-presence discriminated type', () => {
    const code = `
      export type Target = {
        name?: string;
        capability?: string;
        subCase?: { ns: string };
        humanTask?: { title: string };
      };
    `;
    const config: Record<string, DiscriminatorRule> = {
      Target: { strategy: 'key-presence', discriminatorKeys: ['capability', 'subCase', 'humanTask'] },
    };
    const result = zodForTypeWithDiscriminators(code, 'Target', config);
    expect(result).toContain('z.union(');
    expect(result).toContain('.extend(');
    expect(result).toContain('capability');
    expect(result).toContain('subCase');
    expect(result).toContain('humanTask');
    const nameInExtend = result.match(/\.extend\([^)]*name/g) || [];
    expect(nameInExtend).toHaveLength(0);
  });

  it('keeps discriminator keys optional on variant schemas', () => {
    const code = `
      export type Target = {
        name?: string;
        capability?: string;
        subCase?: { ns: string };
      };
    `;
    const config: Record<string, DiscriminatorRule> = {
      Target: { strategy: 'key-presence', discriminatorKeys: ['capability', 'subCase'] },
    };
    const result = zodForTypeWithDiscriminators(code, 'Target', config);
    expect(result).toContain('capability: z.string().optional()');
  });

  it('produces flat z.object when type not in config', () => {
    const code = `export type Plain = { a: string; b?: number };`;
    const config: Record<string, DiscriminatorRule> = {};
    const result = zodForTypeWithDiscriminators(code, 'Plain', config);
    expect(result).toContain('z.object(');
    expect(result).not.toContain('z.union(');
  });

  it('handles intersection types with index signatures', () => {
    const code = `
      type Base = {
        name?: string;
        capability?: string;
        subCase?: string;
        [k: string]: unknown;
      };
      type Extra = { [k: string]: unknown };
      export type Binding = Base & Extra;
    `;
    const config: Record<string, DiscriminatorRule> = {
      Binding: { strategy: 'key-presence', discriminatorKeys: ['capability', 'subCase'] },
    };
    const result = zodForTypeWithDiscriminators(code, 'Binding', config);
    expect(result).toContain('z.union(');
  });

  it('produces correct number of union branches', () => {
    const code = `
      export type Trigger = {
        contextChange?: {};
        cloudEvent?: {};
        schedule?: {};
        scopeActivated?: {};
      };
    `;
    const config: Record<string, DiscriminatorRule> = {
      Trigger: { strategy: 'key-presence', discriminatorKeys: ['contextChange', 'cloudEvent', 'schedule', 'scopeActivated'] },
    };
    const result = zodForTypeWithDiscriminators(code, 'Trigger', config);
    const extendCount = (result.match(/\.extend\(/g) || []).length;
    expect(extendCount).toBe(4);
  });
});
