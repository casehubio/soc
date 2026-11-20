import { describe, it, expect } from 'vitest';
import { yamlSetField, yamlDeleteField } from './yaml-primitives.js';

describe('yamlSetField', () => {
  it('sets a top-level field', () => {
    const yaml = 'name: hello\n';
    const result = yamlSetField(yaml, ['name'], 'world');
    expect(result).toContain('name: world');
  });

  it('sets a nested field', () => {
    const yaml = 'spec:\n  name: hello\n';
    const result = yamlSetField(yaml, ['spec', 'name'], 'world');
    expect(result).toContain('name: world');
  });

  it('creates intermediate paths', () => {
    const yaml = 'name: hello\n';
    const result = yamlSetField(yaml, ['spec', 'nested', 'value'], 42);
    expect(result).toContain('value: 42');
  });

  it('preserves CST formatting of untouched fields', () => {
    const yaml = 'name: hello  # important comment\nage: 30\n';
    const result = yamlSetField(yaml, ['age'], 31);
    expect(result).toContain('# important comment');
    expect(result).toContain('age: 31');
  });

  it('handles array index paths', () => {
    const yaml = 'items:\n  - name: first\n  - name: second\n';
    const result = yamlSetField(yaml, ['items', 1, 'name'], 'updated');
    expect(result).toContain('name: updated');
    expect(result).toContain('name: first');
  });
});

describe('yamlDeleteField', () => {
  it('removes a field', () => {
    const yaml = 'name: hello\nage: 30\n';
    const result = yamlDeleteField(yaml, ['age']);
    expect(result).not.toContain('age');
    expect(result).toContain('name: hello');
  });

  it('removes a nested field', () => {
    const yaml = 'spec:\n  name: hello\n  age: 30\n';
    const result = yamlDeleteField(yaml, ['spec', 'age']);
    expect(result).not.toContain('age');
    expect(result).toContain('name: hello');
  });

  it('removes an array element', () => {
    const yaml = 'items:\n  - first\n  - second\n  - third\n';
    const result = yamlDeleteField(yaml, ['items', 1]);
    expect(result).toContain('first');
    expect(result).not.toContain('second');
    expect(result).toContain('third');
  });
});
