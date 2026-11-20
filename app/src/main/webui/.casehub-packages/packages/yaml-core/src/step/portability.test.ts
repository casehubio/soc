import { describe, it, expect } from 'vitest';
import { validatePortability, inferPortability, isCompatible } from './portability.js';
import type { Definition } from './types.js';
import type { Portability } from './portability.js';

describe('isCompatible', () => {
  it('universal is compatible with both runtimes', () => {
    expect(isCompatible('universal', 'java')).toBe(true);
    expect(isCompatible('universal', 'ts')).toBe(true);
  });

  it('both is compatible with both runtimes', () => {
    expect(isCompatible('both', 'java')).toBe(true);
    expect(isCompatible('both', 'ts')).toBe(true);
  });

  it('java is compatible with java only', () => {
    expect(isCompatible('java', 'java')).toBe(true);
    expect(isCompatible('java', 'ts')).toBe(false);
  });

  it('ts is compatible with ts only', () => {
    expect(isCompatible('ts', 'ts')).toBe(true);
    expect(isCompatible('ts', 'java')).toBe(false);
  });
});

describe('inferPortability', () => {
  it('rest binding infers universal', () => {
    expect(inferPortability({ kind: 'rest', method: 'GET', url: '/x', headers: {}, body: {} })).toBe('universal');
  });

  it('graphql binding infers universal', () => {
    expect(inferPortability({ kind: 'graphql', query: '{ x }' })).toBe('universal');
  });

  it('process binding infers universal', () => {
    expect(inferPortability({ kind: 'process', command: 'echo', args: [], output: 'text', env: {}, onError: 'stderr' })).toBe('universal');
  });

  it('mcp binding infers ts', () => {
    expect(inferPortability({ kind: 'mcp', tool: 'x' })).toBe('ts');
  });

  it('script binding infers ts', () => {
    expect(inferPortability({ kind: 'script', runtime: 'node', script: 'x.js', timeout: '30s', env: {} })).toBe('ts');
  });

  it('agent binding infers ts', () => {
    expect(inferPortability({ kind: 'agent', descriptor: 'x', structuredOutput: false })).toBe('ts');
  });

  it('undefined invoke infers ts', () => {
    expect(inferPortability(undefined)).toBe('ts');
  });

  it('aria binding infers ts', () => {
    expect(inferPortability({ kind: 'aria', action: 'click' })).toBe('ts');
  });

  it('graphql-domain binding infers universal', () => {
    expect(inferPortability({ kind: 'graphql-domain' } as any)).toBe('universal');
  });

  it('simulated binding infers ts', () => {
    expect(inferPortability({ kind: 'simulated' } as any)).toBe('ts');
  });
});

describe('validatePortability', () => {
  const def = (name: string, portability: Portability): Definition => ({
    name, inputs: {}, outputs: {}, portability,
  });

  it('returns empty for all-compatible actions', () => {
    expect(validatePortability([def('a', 'universal'), def('b', 'ts')], 'ts')).toEqual([]);
  });

  it('returns violations for incompatible actions', () => {
    const violations = validatePortability([def('a', 'java'), def('b', 'ts')], 'ts');
    expect(violations).toHaveLength(1);
    expect(violations[0]!.actionName).toBe('a');
    expect(violations[0]!.actionPortability).toBe('java');
    expect(violations[0]!.runtime).toBe('ts');
  });

  it('returns multiple violations', () => {
    const violations = validatePortability([def('a', 'java'), def('b', 'java')], 'ts');
    expect(violations).toHaveLength(2);
  });

  it('treats missing portability as ts', () => {
    const noPort: Definition = { name: 'x', inputs: {}, outputs: {} };
    const violations = validatePortability([noPort], 'java');
    expect(violations).toHaveLength(1);
  });
});
