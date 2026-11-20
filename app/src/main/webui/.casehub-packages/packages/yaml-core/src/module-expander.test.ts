import { describe, it, expect } from 'vitest';
import { ModuleExpander } from './module-expander.js';
import type { YamlModule, YamlImport, YamlModuleParameter } from './types.js';
import { ParameterValidationError } from './parameter-validator.js';

function param(overrides: Partial<YamlModuleParameter> = {}): YamlModuleParameter {
  return { type: 'STRING', required: false, ...overrides };
}

describe('ModuleExpander', () => {
  it('alias prefixes section keys', () => {
    const module: YamlModule = {
      name: 'monitor', parameters: {}, outputs: {},
      sections: { nodes: { 'cpu-check': { type: 'sensor' } } },
    };
    const imp: YamlImport = { module: 'monitor', as: 'infra', parameters: {} };
    const result = ModuleExpander.expand([imp], { monitor: module }, {});
    expect(result.sections['nodes']!['infra.cpu-check']).toBeDefined();
  });

  it('parameter resolution builds scope', () => {
    const module: YamlModule = {
      name: 'monitor',
      parameters: { threshold: param({ required: true }) },
      outputs: {},
      sections: { nodes: { check: { val: 'x' } } },
    };
    const imp: YamlImport = {
      module: 'monitor', as: 'mon', parameters: { threshold: '90' },
    };
    const result = ModuleExpander.expand([imp], { monitor: module }, {});
    expect(result.moduleScopes['mon']).toEqual({ threshold: '90' });
  });

  it('resolves ${params.*} in section content', () => {
    const module: YamlModule = {
      name: 'dashboard',
      parameters: { label: param({ required: true }), dataset: param({ required: true }) },
      outputs: {},
      sections: { pages: { view: { name: '${params.label} Dashboard', config: { ds: '${params.dataset}' } } } },
    };
    const imp: YamlImport = {
      module: 'dashboard', as: 'sales', parameters: { label: 'Sales', dataset: 'sales-data' },
    };
    const result = ModuleExpander.expand([imp], { dashboard: module }, {}, new Set(['each']));
    const view = result.sections['pages']!['sales.view'] as Record<string, unknown>;
    expect(view['name']).toBe('Sales Dashboard');
    expect((view['config'] as Record<string, unknown>)['ds']).toBe('sales-data');
  });

  it('resolves ${params.*} in section content keys', () => {
    const module: YamlModule = {
      name: 'm',
      parameters: { name: param({ required: true }) },
      outputs: {},
      sections: { pages: { '${params.name}-page': { title: '${params.name}' } } },
    };
    const result = ModuleExpander.expand(
      [{ module: 'm', as: 'a', parameters: { name: 'hello' } }],
      { m: module }, {}, new Set(['each']));
    expect(result.sections['pages']!['a.hello-page']).toBeDefined();
    expect((result.sections['pages']!['a.hello-page'] as Record<string, unknown>)['title']).toBe('hello');
  });

  it('defers non-params prefixes in section content', () => {
    const module: YamlModule = {
      name: 'm',
      parameters: { label: param({ required: true }) },
      outputs: {},
      sections: { pages: { view: { name: '${params.label}', iter: '${each.item}' } } },
    };
    const result = ModuleExpander.expand(
      [{ module: 'm', as: 'a', parameters: { label: 'Test' } }],
      { m: module }, {}, new Set(['each']));
    const view = result.sections['pages']!['a.view'] as Record<string, unknown>;
    expect(view['name']).toBe('Test');
    expect(view['iter']).toBe('${each.item}');
  });

  it('default parameter used when not provided', () => {
    const module: YamlModule = {
      name: 'm',
      parameters: { region: param({ defaultValue: 'us-east' }) },
      outputs: {},
      sections: { nodes: { n: {} } },
    };
    const imp: YamlImport = { module: 'm', as: 'a', parameters: {} };
    const result = ModuleExpander.expand([imp], { m: module }, {});
    expect(result.moduleScopes['a']).toEqual({ region: 'us-east' });
  });

  it('multiple imports merge sections', () => {
    const m1: YamlModule = {
      name: 'a', parameters: {}, outputs: {},
      sections: { nodes: { n1: { t: '1' } } },
    };
    const m2: YamlModule = {
      name: 'b', parameters: {}, outputs: {},
      sections: { nodes: { n2: { t: '2' } } },
    };
    const result = ModuleExpander.expand(
      [{ module: 'a', as: 'x', parameters: {} },
       { module: 'b', as: 'y', parameters: {} }],
      { a: m1, b: m2 }, {});
    expect(result.sections['nodes']!['x.n1']).toBeDefined();
    expect(result.sections['nodes']!['y.n2']).toBeDefined();
  });

  it('existing sections preserved', () => {
    const module: YamlModule = {
      name: 'm', parameters: {}, outputs: {},
      sections: { nodes: { new: {} } },
    };
    const existing = { nodes: { existing: { type: 'fixed' } } };
    const result = ModuleExpander.expand(
      [{ module: 'm', as: 'a', parameters: {} }],
      { m: module }, existing);
    expect(result.sections['nodes']!['existing']).toBeDefined();
    expect(result.sections['nodes']!['a.new']).toBeDefined();
  });

  it('conditional import returns importConditions', () => {
    const module: YamlModule = {
      name: 'm', parameters: {}, outputs: {},
      sections: { nodes: { n: {} } },
    };
    const imp: YamlImport = {
      module: 'm', as: 'a', condition: '${var.enabled}', parameters: {},
    };
    const result = ModuleExpander.expand([imp], { m: module }, {});
    expect(result.importConditions['a']).toBe('${var.enabled}');
  });

  it('unconditional import absent from importConditions', () => {
    const module: YamlModule = {
      name: 'm', parameters: {}, outputs: {},
      sections: { nodes: { n: {} } },
    };
    const result = ModuleExpander.expand(
      [{ module: 'm', as: 'a', parameters: {} }],
      { m: module }, {});
    expect(result.importConditions['a']).toBeUndefined();
  });

  it('unknown module throws', () => {
    expect(() => ModuleExpander.expand(
      [{ module: 'nonexistent', as: 'a', parameters: {} }], {}, {}))
      .toThrow('nonexistent');
  });

  it('dot in alias with expansion directive throws', () => {
    const module: YamlModule = {
      name: 'm', parameters: {}, outputs: {}, sections: {},
    };
    expect(() => ModuleExpander.expand(
      [{ module: 'm', as: 'infra.monitor', parameters: {}, forEach: 'envs' }],
      { m: module }, {}))
      .toThrow('.');
  });

  it('dot in alias without expansion directive is allowed (expanded imports)', () => {
    const module: YamlModule = {
      name: 'm', parameters: {}, outputs: {},
      sections: { nodes: { n: { v: 1 } } },
    };
    const result = ModuleExpander.expand(
      [{ module: 'm', as: 'infra.monitor', parameters: {} }],
      { m: module }, {});
    expect(result.sections['nodes']!['infra.monitor.n']).toEqual({ v: 1 });
  });

  it('duplicate alias throws', () => {
    const module: YamlModule = {
      name: 'm', parameters: {}, outputs: {},
      sections: { nodes: { n: {} } },
    };
    expect(() => ModuleExpander.expand(
      [{ module: 'm', as: 'a', parameters: {} },
       { module: 'm', as: 'a', parameters: {} }],
      { m: module }, {}))
      .toThrow(/duplicate/i);
  });

  it('unknown parameter throws', () => {
    const module: YamlModule = {
      name: 'm',
      parameters: { region: param() },
      outputs: {},
      sections: { nodes: { n: {} } },
    };
    expect(() => ModuleExpander.expand(
      [{ module: 'm', as: 'a', parameters: { reigon: 'us-east' } }],
      { m: module }, {}))
      .toThrow(ParameterValidationError);
  });

  it('empty imports returns existing sections', () => {
    const existing = { nodes: { db: { type: 'database' } } };
    const result = ModuleExpander.expand([], {}, existing);
    expect(result.sections['nodes']!['db']).toBeDefined();
    expect(Object.keys(result.moduleScopes)).toHaveLength(0);
    expect(Object.keys(result.importConditions)).toHaveLength(0);
  });
});

describe('ModuleExpander — outputs', () => {
  it('resolves outputs from parameters', () => {
    const module: YamlModule = {
      name: 'db',
      parameters: { name: param({ required: true }) },
      outputs: { 'connection-string': { type: 'STRING', value: 'jdbc:pg://${var.name}' } },
      sections: { nodes: { n: {} } },
    };
    const result = ModuleExpander.expand(
      [{ module: 'db', as: 'mydb', parameters: { name: 'users' } }],
      { db: module }, {});
    expect(result.moduleOutputs['mydb']!['connection-string']).toBe('jdbc:pg://users');
  });

  it('cross-module output references resolve', () => {
    const dbModule: YamlModule = {
      name: 'db',
      parameters: { name: param({ required: true }) },
      outputs: { url: { type: 'STRING', value: 'jdbc://${var.name}' } },
      sections: {},
    };
    const appModule: YamlModule = {
      name: 'app',
      parameters: { dbUrl: param({ required: true }) },
      outputs: {},
      sections: { nodes: { svc: {} } },
    };
    const result = ModuleExpander.expand(
      [
        { module: 'db', as: 'mydb', parameters: { name: 'users' } },
        { module: 'app', as: 'myapp', parameters: { dbUrl: '${module.mydb.url}' } },
      ],
      { db: dbModule, app: appModule }, {});
    expect(result.moduleScopes['myapp']!['dbUrl']).toBe('jdbc://users');
  });

  it('forward reference in module ref throws', () => {
    const m1: YamlModule = {
      name: 'a',
      parameters: { x: param({ required: true }) },
      outputs: {},
      sections: {},
    };
    const m2: YamlModule = {
      name: 'b',
      parameters: {},
      outputs: { url: { type: 'STRING', value: '${var.x}' } },
      sections: {},
    };
    expect(() => ModuleExpander.expand(
      [
        { module: 'a', as: 'first', parameters: { x: '${module.second.url}' } },
        { module: 'b', as: 'second', parameters: {} },
      ],
      { a: m1, b: m2 }, {}))
      .toThrow('module-ref-forward');
  });
});

describe('ModuleExpander — outputSource', () => {
  it('returns variable source for module outputs', () => {
    const outputs = {
      mydb: { url: 'jdbc://users', port: '5432' },
    };
    const source = ModuleExpander.outputSource(outputs);
    expect(source('mydb.url')).toBe('jdbc://users');
    expect(source('mydb.port')).toBe('5432');
    expect(source('mydb.missing')).toBeUndefined();
    expect(source('unknown.url')).toBeUndefined();
  });
});
