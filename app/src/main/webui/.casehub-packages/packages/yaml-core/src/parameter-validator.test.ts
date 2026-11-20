import { describe, it, expect } from 'vitest';
import { ParameterValidator, ParameterValidationError } from './parameter-validator.js';
import type { YamlModuleParameter } from './types.js';

function param(overrides: Partial<YamlModuleParameter> = {}): YamlModuleParameter {
  return {
    type: 'STRING', required: false,
    ...overrides,
  };
}

describe('ParameterValidator', () => {
  it('required missing returns violation', () => {
    const violations = ParameterValidator.validate(
      { region: param({ required: true }) }, {});
    expect(violations).toHaveLength(1);
    expect(violations[0]!.parameterName).toBe('region');
    expect(violations[0]!.constraint).toBe('required');
  });

  it('required with default passes', () => {
    const violations = ParameterValidator.validate(
      { region: param({ required: true, defaultValue: 'us-east' }) }, {});
    expect(violations).toHaveLength(0);
  });

  it('minLength string violation', () => {
    const violations = ParameterValidator.validate(
      { name: param({ minLength: 5 }) }, { name: 'ab' });
    expect(violations).toHaveLength(1);
    expect(violations[0]!.constraint).toBe('minLength');
  });

  it('maxLength string violation', () => {
    const violations = ParameterValidator.validate(
      { name: param({ maxLength: 3 }) }, { name: 'toolong' });
    expect(violations).toHaveLength(1);
    expect(violations[0]!.constraint).toBe('maxLength');
  });

  it('minLength array counts elements', () => {
    const violations = ParameterValidator.validate(
      { tags: param({ type: 'ARRAY', minLength: 3 }) }, { tags: 'a,b' });
    expect(violations).toHaveLength(1);
    expect(violations[0]!.constraint).toBe('minLength');
  });

  it('maxLength array counts elements', () => {
    const violations = ParameterValidator.validate(
      { tags: param({ type: 'ARRAY', maxLength: 2 }) }, { tags: 'a,b,c' });
    expect(violations).toHaveLength(1);
    expect(violations[0]!.constraint).toBe('maxLength');
  });

  it('pattern violation', () => {
    const violations = ParameterValidator.validate(
      { id: param({ pattern: '^[a-z]+$' }) }, { id: 'ABC123' });
    expect(violations).toHaveLength(1);
    expect(violations[0]!.constraint).toBe('pattern');
  });

  it('pattern passes', () => {
    const violations = ParameterValidator.validate(
      { id: param({ pattern: '^[a-z]+$' }) }, { id: 'abc' });
    expect(violations).toHaveLength(0);
  });

  it('minimum violation', () => {
    const violations = ParameterValidator.validate(
      { port: param({ type: 'INTEGER', minimum: 1024 }) }, { port: '80' });
    expect(violations).toHaveLength(1);
    expect(violations[0]!.constraint).toBe('minimum');
  });

  it('maximum violation', () => {
    const violations = ParameterValidator.validate(
      { rate: param({ type: 'NUMBER', maximum: 1.0 }) }, { rate: '1.5' });
    expect(violations).toHaveLength(1);
    expect(violations[0]!.constraint).toBe('maximum');
  });

  it('type parse error returns violation', () => {
    const violations = ParameterValidator.validate(
      { count: param({ type: 'INTEGER' }) }, { count: 'abc' });
    expect(violations).toHaveLength(1);
    expect(violations[0]!.constraint).toBe('type');
  });

  it('collects multiple violations', () => {
    const violations = ParameterValidator.validate({
      name: param({ required: true }),
      port: param({ type: 'INTEGER', minimum: 1024 }),
    }, { port: '80' });
    expect(violations).toHaveLength(2);
  });

  it('unknown parameter returns violation', () => {
    const violations = ParameterValidator.validate(
      { region: param() }, { reigon: 'us-east' });
    expect(violations).toHaveLength(1);
    expect(violations[0]!.constraint).toBe('unknown');
    expect(violations[0]!.parameterName).toBe('reigon');
  });

  it('validateOrThrow throws on violations', () => {
    expect(() => { ParameterValidator.validateOrThrow(
      { x: param({ required: true }) }, {}); })
      .toThrow(ParameterValidationError);
  });

  it('validateOrThrow silent on valid', () => {
    ParameterValidator.validateOrThrow(
      { x: param() }, { x: 'ok' });
  });

  it('valid params return empty', () => {
    const violations = ParameterValidator.validate(
      { region: param({ required: true, minLength: 2, maxLength: 10 }) },
      { region: 'us-east' });
    expect(violations).toHaveLength(0);
  });

  it('optional missing not validated', () => {
    const violations = ParameterValidator.validate(
      { tag: param({ minLength: 5 }) }, {});
    expect(violations).toHaveLength(0);
  });

  it('allowedValues accepts valid', () => {
    const violations = ParameterValidator.validate(
      { region: param({ required: true, allowedValues: ['us-east-1', 'eu-west-1', 'ap-south-1'] }) },
      { region: 'eu-west-1' });
    expect(violations).toHaveLength(0);
  });

  it('allowedValues rejects invalid', () => {
    const violations = ParameterValidator.validate(
      { region: param({ required: true, allowedValues: ['us-east-1', 'eu-west-1', 'ap-south-1'] }) },
      { region: 'us-west-3' });
    expect(violations).toHaveLength(1);
    expect(violations[0]!.constraint).toBe('allowedValues');
  });

  it('allowedValues empty skips check', () => {
    const violations = ParameterValidator.validate(
      { x: param({ required: true, allowedValues: [] }) }, { x: 'anything' });
    expect(violations).toHaveLength(0);
  });

  it('constraintDescription replaces message', () => {
    const violations = ParameterValidator.validate(
      { pct: param({ type: 'INTEGER', required: true, minimum: 1, maximum: 100, constraintDescription: 'Must be a percentage (1-100)' }) },
      { pct: '200' });
    expect(violations).toHaveLength(1);
    expect(violations[0]!.message).toBe('Must be a percentage (1-100)');
    expect(violations[0]!.technicalDetail).toContain('200');
    expect(violations[0]!.technicalDetail).toContain('maximum');
  });

  it('constraintDescription null means technicalDetail matches message', () => {
    const violations = ParameterValidator.validate(
      { pct: param({ type: 'INTEGER', required: true, minimum: 1, maximum: 100 }) },
      { pct: '200' });
    expect(violations).toHaveLength(1);
    expect(violations[0]!.technicalDetail).toBe(violations[0]!.message);
  });

  it('allowedValues boolean canonical match', () => {
    const violations = ParameterValidator.validate(
      { flag: param({ type: 'BOOLEAN', required: true, allowedValues: ['true'] }) },
      { flag: 'yes' });
    expect(violations).toHaveLength(0);
  });

  it('allowedValues boolean canonical reject', () => {
    const violations = ParameterValidator.validate(
      { flag: param({ type: 'BOOLEAN', required: true, allowedValues: ['true'] }) },
      { flag: 'no' });
    expect(violations).toHaveLength(1);
    expect(violations[0]!.constraint).toBe('allowedValues');
  });
});
