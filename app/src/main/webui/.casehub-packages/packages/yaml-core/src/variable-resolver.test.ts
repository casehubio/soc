import { describe, it, expect } from 'vitest';
import { VariableResolver } from './variable-resolver.js';
import type { VariableSource } from './types.js';
import { chainSources, forEachContextSource, nestedSource } from './types.js';

function mapSource(values: Record<string, string>): VariableSource {
  return (name) => values[name];
}

describe('VariableResolver', () => {
  it('resolves prefixed variable', () => {
    const resolver = new VariableResolver({ var: mapSource({ batch: '500' }) }, new Set());
    expect(resolver.resolveString('${var.batch}', 'test')).toBe('500');
  });

  it('passes plain strings through', () => {
    const resolver = new VariableResolver({}, new Set());
    expect(resolver.resolve('plain-string')).toBe('plain-string');
  });

  it('resolves embedded variable', () => {
    const resolver = new VariableResolver(
      { var: mapSource({ bucket: 'prod' }) }, new Set());
    expect(resolver.resolveString('s3://${var.bucket}/data', 'node'))
      .toBe('s3://prod/data');
  });

  it('resolves multiple variables', () => {
    const resolver = new VariableResolver(
      { var: mapSource({ proto: 's3', bucket: 'data' }) }, new Set());
    expect(resolver.resolveString('${var.proto}://${var.bucket}/path', 'node'))
      .toBe('s3://data/path');
  });

  it('resolves map values', () => {
    const resolver = new VariableResolver(
      { var: mapSource({ uri: 's3://data' }) }, new Set());
    const input = { destination: '${var.uri}', count: 42 };
    const resolved = resolver.resolve(input) as Record<string, unknown>;
    expect(resolved['destination']).toBe('s3://data');
    expect(resolved['count']).toBe(42);
  });

  it('resolves nested map values', () => {
    const resolver = new VariableResolver(
      { var: mapSource({ uri: 's3://data' }) }, new Set());
    const input = { config: { target: '${var.uri}' } };
    const resolved = resolver.resolve(input) as Record<string, unknown>;
    expect((resolved['config'] as Record<string, unknown>)['target']).toBe('s3://data');
  });

  it('resolves list values', () => {
    const resolver = new VariableResolver(
      { var: mapSource({ field: 'email' }) }, new Set());
    const resolved = resolver.resolve(['name', '${var.field}']);
    expect(resolved).toEqual(['name', 'email']);
  });

  it('resolves maps in lists', () => {
    const resolver = new VariableResolver(
      { var: mapSource({ x: '1' }) }, new Set());
    const input = [{ val: '${var.x}' }];
    const resolved = resolver.resolve(input) as Record<string, unknown>[];
    expect((resolved[0] as Record<string, unknown>)['val']).toBe('1');
  });

  it('resolve dispatches by type', () => {
    const resolver = new VariableResolver(
      { var: mapSource({ x: '1' }) }, new Set());
    expect(resolver.resolve('${var.x}')).toBe('1');
    expect(resolver.resolve(42)).toBe(42);
    expect(resolver.resolve(true)).toBe(true);
  });

  it('non-string values pass through', () => {
    const resolver = new VariableResolver({}, new Set());
    expect(resolver.resolve(42)).toBe(42);
    expect(resolver.resolve(3.14)).toBe(3.14);
  });

  it('bare name throws UnresolvedVariableError', () => {
    const resolver = new VariableResolver(
      { var: mapSource({ x: '1' }) }, new Set());
    expect(() => resolver.resolveString('${x}', 'test')).toThrow(/bare variable/i);
  });

  it('unknown prefix throws listing available', () => {
    const resolver = new VariableResolver(
      { var: mapSource({}) }, new Set());
    expect(() => resolver.resolveString('${nope.x}', 'test'))
      .toThrow(/nope/);
  });

  it('unresolved variable throws', () => {
    const resolver = new VariableResolver(
      { var: mapSource({ batch_size: '100' }) }, new Set());
    expect(() => resolver.resolveString('${var.bacth_size}', 'node'))
      .toThrow('bacth_size');
  });
});

describe('VariableResolver — deferred prefixes', () => {
  it('deferred prefix passes through', () => {
    const resolver = new VariableResolver(
      { var: mapSource({ region: 'us-east' }) }, new Set(['match', 'fault']));
    const result = resolver.resolveString('${match.sink.id}-${var.region}', 'rule');
    expect(result).toBe('${match.sink.id}-us-east');
  });

  it('deferred all refs passes through', () => {
    const resolver = new VariableResolver({}, new Set(['match']));
    expect(resolver.resolveString('${match.sink.id}', 'rule'))
      .toBe('${match.sink.id}');
  });

  it('deferred fault prefix', () => {
    const resolver = new VariableResolver({}, new Set(['fault']));
    expect(resolver.resolveString('${fault.nodeId}', 'rule'))
      .toBe('${fault.nodeId}');
  });
});

describe('VariableResolver — each context', () => {
  it('each context resolves', () => {
    const resolver = new VariableResolver(
      { var: mapSource({ batch: '1000' }) }, new Set());
    const eachResolver = resolver.withScope('each',
      forEachContextSource({ region: 'us-east' }, null));
    expect(eachResolver.resolveString('s3://${each.region}/${var.batch}', 'node'))
      .toBe('s3://us-east/1000');
  });

  it('each unknown variable throws', () => {
    const resolver = new VariableResolver({}, new Set());
    const eachResolver = resolver.withScope('each',
      forEachContextSource({ region: 'us-east' }, null));
    expect(() => eachResolver.resolveString('${each.zone}', 'node'))
      .toThrow('zone');
  });

  it('each without context throws', () => {
    const resolver = new VariableResolver({}, new Set());
    expect(() => resolver.resolveString('${each.region}', 'node'))
      .toThrow('each');
  });
});

describe('VariableResolver — each row context', () => {
  it('drills into field', () => {
    const resolver = new VariableResolver({}, new Set());
    const rowResolver = resolver.withScope('each',
      forEachContextSource(null, { env: { name: 'staging', region: 'us-east' } }));
    expect(rowResolver.resolveString('${each.env.name}', 'node')).toBe('staging');
    expect(rowResolver.resolveString('${each.env.region}', 'node')).toBe('us-east');
  });

  it('missing field throws', () => {
    const resolver = new VariableResolver({}, new Set());
    const rowResolver = resolver.withScope('each',
      forEachContextSource(null, { env: { name: 'staging' } }));
    expect(() => rowResolver.resolveString('${each.env.missing}', 'node'))
      .toThrow('missing');
  });

  it('row without field throws with guidance', () => {
    const resolver = new VariableResolver({}, new Set());
    const rowResolver = resolver.withScope('each',
      forEachContextSource(null, { env: { name: 'staging' } }));
    expect(() => rowResolver.resolveString('${each.env}', 'node'))
      .toThrow('field access');
  });
});

describe('VariableResolver — chain', () => {
  it('tries sources in order', () => {
    const primary = mapSource({ email: 'module@test.com' });
    const fallback = mapSource({ email: 'global@test.com', batch: '1000' });
    const resolver = new VariableResolver(
      { var: chainSources(primary, fallback) }, new Set());
    expect(resolver.resolveString('${var.email}', 'test')).toBe('module@test.com');
    expect(resolver.resolveString('${var.batch}', 'test')).toBe('1000');
  });
});

describe('VariableResolver — withScope', () => {
  it('adds prefix source', () => {
    const resolver = new VariableResolver(
      { var: mapSource({ x: '1' }) }, new Set());
    const scoped = resolver.withScope('step', mapSource({ result: 'ok' }));
    expect(scoped.resolveString('${step.result}', 'test')).toBe('ok');
    expect(scoped.resolveString('${var.x}', 'test')).toBe('1');
  });
});

describe('VariableResolver — default values', () => {
  it('default value used when variable missing', () => {
    const resolver = new VariableResolver({ env: mapSource({}) }, new Set());
    expect(resolver.resolveString('${env.MISSING:-fallback}', 'test'))
      .toBe('fallback');
  });

  it('default value ignored when variable present', () => {
    const resolver = new VariableResolver(
      { env: mapSource({ HOST: 'prod.example.com' }) }, new Set());
    expect(resolver.resolveString('${env.HOST:-localhost}', 'test'))
      .toBe('prod.example.com');
  });

  it('empty default value', () => {
    const resolver = new VariableResolver({ env: mapSource({}) }, new Set());
    expect(resolver.resolveString('${env.MISSING:-}', 'test')).toBe('');
  });

  it('default value with embedded text', () => {
    const resolver = new VariableResolver({ env: mapSource({}) }, new Set());
    expect(resolver.resolveString('host=${env.DB_HOST:-localhost}:5432', 'test'))
      .toBe('host=localhost:5432');
  });

  it('no default still throws', () => {
    const resolver = new VariableResolver({ env: mapSource({}) }, new Set());
    expect(() => resolver.resolveString('${env.MISSING}', 'test'))
      .toThrow('MISSING');
  });
});

describe('VariableResolver — DeferredPrefixHandler', () => {
  it('handler invoked on hit', () => {
    let captured: string | undefined;
    const resolver = new VariableResolver({}, new Set(['match']))
      .withDeferredPrefixHandler((prefix, key) => { captured = `${prefix}:${key}`; });
    resolver.resolveString('${match.sink.id}', 'rule');
    expect(captured).toBe('match:match.sink.id');
  });

  it('handler can throw', () => {
    const resolver = new VariableResolver({}, new Set(['match']))
      .withDeferredPrefixHandler((_prefix, _key, _ctx) => {
        throw new Error('match refs resolved at runtime');
      });
    expect(() => resolver.resolveString('${match.sink.id}', 'node'))
      .toThrow('runtime');
  });

  it('no handler deferred passes through silently', () => {
    const resolver = new VariableResolver({}, new Set(['match']));
    expect(resolver.resolveString('${match.sink.id}', 'rule'))
      .toBe('${match.sink.id}');
  });

  it('handler survives withScope (each context)', () => {
    let captured: string | undefined;
    const resolver = new VariableResolver({}, new Set(['match']))
      .withDeferredPrefixHandler((prefix) => { captured = prefix; });
    const child = resolver.withScope('each',
      forEachContextSource({ region: 'us-east' }, null));
    child.resolveString('${match.x}', 'test');
    expect(captured).toBe('match');
  });

  it('handler survives withScope (var)', () => {
    let captured: string | undefined;
    const resolver = new VariableResolver({}, new Set(['fault']))
      .withDeferredPrefixHandler((prefix) => { captured = prefix; });
    const child = resolver.withScope('var', () => 'val');
    child.resolveString('${fault.nodeId}', 'test');
    expect(captured).toBe('fault');
  });

  it('handler survives withScope (row context)', () => {
    let captured: string | undefined;
    const resolver = new VariableResolver({}, new Set(['match']))
      .withDeferredPrefixHandler((prefix) => { captured = prefix; });
    const child = resolver.withScope('each',
      forEachContextSource(null, { env: { name: 'prod' } }));
    child.resolveString('${match.x}', 'test');
    expect(captured).toBe('match');
  });
});

describe('VariableResolver — sourceFor', () => {
  it('returns registered source', () => {
    const source: VariableSource = () => 'val';
    const resolver = new VariableResolver({ var: source }, new Set());
    expect(resolver.sourceFor('var')).toBe(source);
  });

  it('returns undefined for unknown', () => {
    const resolver = new VariableResolver({}, new Set());
    expect(resolver.sourceFor('var')).toBeUndefined();
  });
});

describe('VariableResolver — withChainedScope', () => {
  it('layers ahead of existing', () => {
    const base: VariableSource = (name) => name === 'region' ? 'us-east' : undefined;
    const resolver = new VariableResolver({ var: base }, new Set());
    const module: VariableSource = (name) => name === 'region' ? 'eu-west' : undefined;
    const scoped = resolver.withChainedScope('var', module);
    expect(scoped.resolveString('${var.region}', 'test')).toBe('eu-west');
  });

  it('falls through to existing', () => {
    const base: VariableSource = (name) => name === 'batch' ? '500' : undefined;
    const resolver = new VariableResolver({ var: base }, new Set());
    const module: VariableSource = () => undefined;
    const scoped = resolver.withChainedScope('var', module);
    expect(scoped.resolveString('${var.batch}', 'test')).toBe('500');
  });

  it('no existing registers directly', () => {
    const resolver = new VariableResolver({}, new Set());
    const module: VariableSource = (name) => name === 'region' ? 'us-east' : undefined;
    const scoped = resolver.withChainedScope('var', module);
    expect(scoped.resolveString('${var.region}', 'test')).toBe('us-east');
  });

  it('propagates handler', () => {
    let captured: string | undefined;
    const resolver = new VariableResolver({}, new Set(['match']))
      .withDeferredPrefixHandler((p) => { captured = p; });
    const scoped = resolver.withChainedScope('var', () => 'val');
    scoped.resolveString('${match.x}', 'test');
    expect(captured).toBe('match');
  });
});

describe('VariableResolver — forParams factory', () => {
  it('resolves caller param', () => {
    const resolver = VariableResolver.forParams(
      { name: {} },
      { name: 'Alice' },
      new Set());
    expect(resolver.resolveString('${params.name}', 'test')).toBe('Alice');
  });

  it('resolves default', () => {
    const resolver = VariableResolver.forParams(
      { env: { defaultValue: 'prod' } },
      {},
      new Set());
    expect(resolver.resolveString('${params.env}', 'test')).toBe('prod');
  });

  it('caller overrides default', () => {
    const resolver = VariableResolver.forParams(
      { env: { defaultValue: 'prod' } },
      { env: 'staging' },
      new Set());
    expect(resolver.resolveString('${params.env}', 'test')).toBe('staging');
  });

  it('var prefix aliases params', () => {
    const resolver = VariableResolver.forParams(
      { x: {} },
      { x: 'val' },
      new Set());
    expect(resolver.resolveString('${var.x}', 'test')).toBe('val');
  });

  it('deferred prefixes preserved', () => {
    const resolver = VariableResolver.forParams(
      { x: {} },
      { x: 'val' },
      new Set(['step']));
    expect(resolver.resolveString('${step.something}', 'test'))
      .toBe('${step.something}');
  });
});

describe('VariableSource.nested', () => {
  it('resolves top-level field', () => {
    const source = nestedSource({ login: { userId: 'alice', role: 'admin' } });
    expect(source('login.userId')).toBe('alice');
    expect(source('login.role')).toBe('admin');
  });

  it('resolves deeply nested field', () => {
    const source = nestedSource({ step1: { result: { id: 42 } } });
    expect(source('step1.result.id')).toBe('42');
  });

  it('returns undefined for unknown key', () => {
    const source = nestedSource({});
    expect(source('missing.field')).toBeUndefined();
  });

  it('returns undefined for missing field', () => {
    const source = nestedSource({ step1: { name: 'Alice' } });
    expect(source('step1.missingField')).toBeUndefined();
  });

  it('key only returns map toString', () => {
    const source = nestedSource({ step1: { a: '1' } });
    expect(source('step1')).toBeDefined();
  });

  it('works with VariableResolver', () => {
    const data: Record<string, Record<string, unknown>> = {
      login: { token: 'abc123' },
    };
    const resolver = new VariableResolver(
      { step: nestedSource(data) }, new Set());
    expect(resolver.resolveString('Bearer ${step.login.token}', 'test'))
      .toBe('Bearer abc123');
  });
});
