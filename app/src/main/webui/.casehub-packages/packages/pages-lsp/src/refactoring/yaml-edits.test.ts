import { describe, it, expect } from 'vitest';
import { yamlSetOrDelete, yamlSwitchVariant, yamlAppendWithUniqueName } from './yaml-edits.js';

describe('yamlSetOrDelete', () => {
  it('sets a value at a nested path', () => {
    const yaml = 'spec:\n  name: test\n';
    const result = yamlSetOrDelete(yaml, ['spec'], ['name'], 'updated');
    expect(result).toContain('name: updated');
  });

  it('deletes a field when value is undefined', () => {
    const yaml = 'spec:\n  name: test\n  extra: val\n';
    const result = yamlSetOrDelete(yaml, ['spec'], ['extra'], undefined);
    expect(result).not.toContain('extra');
    expect(result).toContain('name: test');
  });

  it('creates intermediate keys when setting', () => {
    const yaml = 'spec:\n  name: test\n';
    const result = yamlSetOrDelete(yaml, ['spec'], ['nested', 'key'], 'value');
    expect(result).toContain('nested');
    expect(result).toContain('key: value');
  });
});

describe('yamlSwitchVariant', () => {
  it('deletes existing variant keys and sets the new one', () => {
    const yaml = 'target:\n  capability: old-cap\n';
    const result = yamlSwitchVariant(yaml, ['target'],
      ['capability', 'subCase', 'humanTask'],
      'subCase', { namespace: '', name: '' },
    );
    expect(result).not.toContain('capability');
    expect(result).toContain('subCase');
    expect(result).toContain('namespace');
  });

  it('handles switching from one variant to another', () => {
    const yaml = 'target:\n  subCase:\n    namespace: ns1\n    name: case1\n';
    const result = yamlSwitchVariant(yaml, ['target'],
      ['capability', 'subCase', 'humanTask'],
      'capability', '',
    );
    expect(result).not.toContain('subCase');
    expect(result).toContain('capability');
  });

  it('preserves surrounding YAML content', () => {
    const yaml = 'name: binding-1\ntarget:\n  capability: old\nother: preserved\n';
    const result = yamlSwitchVariant(yaml, ['target'],
      ['capability', 'subCase', 'humanTask'],
      'subCase', { namespace: '', name: '' },
    );
    expect(result).toContain('name: binding-1');
    expect(result).toContain('other: preserved');
  });
});

describe('yamlAppendWithUniqueName', () => {
  describe('array-field mode', () => {
    it('appends with unique name when no existing items', () => {
      const yaml = 'spec:\n  bindings: []\n';
      const result = yamlAppendWithUniqueName(yaml, ['spec', 'bindings'], {
        mode: 'array-field', nameField: 'name', prefix: 'binding',
        defaults: { capability: '' },
      });
      expect(result).toContain('name: binding-1');
      expect(result).toContain('capability');
    });

    it('generates unique name avoiding existing names', () => {
      const yaml = 'spec:\n  bindings:\n    - name: binding-1\n      capability: a\n';
      const result = yamlAppendWithUniqueName(yaml, ['spec', 'bindings'], {
        mode: 'array-field', nameField: 'name', prefix: 'binding',
        defaults: { capability: '' },
      });
      expect(result).toContain('name: binding-2');
    });

    it('creates array when it does not exist', () => {
      const yaml = 'spec:\n  name: test\n';
      const result = yamlAppendWithUniqueName(yaml, ['spec', 'bindings'], {
        mode: 'array-field', nameField: 'name', prefix: 'binding',
        defaults: { capability: '' },
      });
      expect(result).toContain('bindings');
      expect(result).toContain('name: binding-1');
    });
  });

  describe('named-map mode', () => {
    it('appends named map entry to sequence', () => {
      const yaml = 'do: []\n';
      const result = yamlAppendWithUniqueName(yaml, ['do'], {
        mode: 'named-map', prefix: 'newCall',
        defaults: { call: 'http:get', with: {} },
      });
      expect(result).toContain('newCall1');
      expect(result).toContain('call: http:get');
    });

    it('generates unique key avoiding existing map keys', () => {
      const yaml = 'do:\n  - newCall1:\n      call: http:get\n';
      const result = yamlAppendWithUniqueName(yaml, ['do'], {
        mode: 'named-map', prefix: 'newCall',
        defaults: { call: 'http:post', with: {} },
      });
      expect(result).toContain('newCall2');
    });
  });
});
