import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  ScopeNode, PreferenceSchemaDescriptor, PreferenceRecord,
  PreferenceInput, InheritanceState, PreferenceRow, EnumOption,
} from './types.js';

describe('types', () => {
  it('ScopeNode supports recursive children', () => {
    const tree: ScopeNode = {
      path: 'system', label: 'System',
      children: [{ path: 'tenant/acme', label: 'Acme' }],
    };
    expect(tree.children).toHaveLength(1);
  });

  it('PreferenceSchemaDescriptor has required fields', () => {
    expectTypeOf<PreferenceSchemaDescriptor>().toHaveProperty('qualifiedName');
    expectTypeOf<PreferenceSchemaDescriptor>().toHaveProperty('type');
    expectTypeOf<PreferenceSchemaDescriptor>().toHaveProperty('multiValue');
    expectTypeOf<PreferenceSchemaDescriptor>().toHaveProperty('constraints');
    expectTypeOf<PreferenceSchemaDescriptor>().toHaveProperty('options');
  });

  it('InheritanceState covers all states', () => {
    const states: InheritanceState[] = ['local', 'inherited', 'overridden', 'default'];
    expect(states).toHaveLength(4);
  });

  it('PreferenceRow carries both tree and preference metadata', () => {
    expectTypeOf<PreferenceRow>().toHaveProperty('id');
    expectTypeOf<PreferenceRow>().toHaveProperty('parentId');
    expectTypeOf<PreferenceRow>().toHaveProperty('rowType');
    expectTypeOf<PreferenceRow>().toHaveProperty('inheritanceState');
    expectTypeOf<PreferenceRow>().toHaveProperty('sourceScope');
  });

  it('PreferenceInput has required fields for PUT', () => {
    expectTypeOf<PreferenceInput>().toHaveProperty('namespace');
    expectTypeOf<PreferenceInput>().toHaveProperty('name');
    expectTypeOf<PreferenceInput>().toHaveProperty('subKey');
    expectTypeOf<PreferenceInput>().toHaveProperty('value');
  });

  it('EnumOption has value and label', () => {
    const opt: EnumOption = { value: 'A', label: 'Alpha' };
    expect(opt.value).toBe('A');
    expect(opt.label).toBe('Alpha');
  });
});
