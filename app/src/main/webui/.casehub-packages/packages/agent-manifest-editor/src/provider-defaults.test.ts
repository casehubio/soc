import { describe, it, expect } from 'vitest';
import { getInferenceRanges, parseInferenceFromProperties, writeInferenceToProperties, PROVIDER_DEFAULTS, OTHER_PROVIDER_DEFAULTS } from './provider-defaults.js';

describe('provider-defaults', () => {
  it('returns anthropic defaults for known vendor', () => {
    const ranges = getInferenceRanges('anthropic');
    expect(ranges.temperature.max).toBe(1);
    expect(ranges.topP.default).toBe(1);
  });

  it('returns openai defaults with higher temperature max', () => {
    const ranges = getInferenceRanges('openai');
    expect(ranges.temperature.max).toBe(2);
  });

  it('returns OTHER defaults for unknown vendor', () => {
    const ranges = getInferenceRanges('mistral');
    expect(ranges.temperature.max).toBe(OTHER_PROVIDER_DEFAULTS.temperature.max);
  });

  it('case-insensitive vendor matching', () => {
    const ranges = getInferenceRanges('Anthropic');
    expect(ranges.temperature.max).toBe(1);
  });

  it('overrides maxTokens.max from model contextWindow', () => {
    const ranges = getInferenceRanges('anthropic', { contextWindow: 200000 });
    expect(ranges.maxTokens.max).toBe(200000);
  });

  it('overrides ranges from model properties', () => {
    const ranges = getInferenceRanges('anthropic', {
      properties: { temperature_max: '0.5', topP_default: '0.8' },
    });
    expect(ranges.temperature.max).toBe(0.5);
    expect(ranges.topP.default).toBe(0.8);
    expect(ranges.temperature.min).toBe(0);
  });

  it('model properties take precedence over contextWindow for maxTokens', () => {
    const ranges = getInferenceRanges('anthropic', {
      contextWindow: 200000,
      properties: { maxTokens_max: '4096' },
    });
    expect(ranges.maxTokens.max).toBe(4096);
  });

  it('parseInferenceFromProperties extracts inference values', () => {
    const result = parseInferenceFromProperties({ temperature: '0.7', topP: '0.9', maxTokens: '2048' });
    expect(result.temperature).toBe(0.7);
    expect(result.topP).toBe(0.9);
    expect(result.maxTokens).toBe(2048);
  });

  it('parseInferenceFromProperties returns empty for undefined', () => {
    expect(parseInferenceFromProperties(undefined)).toEqual({});
  });

  it('parseInferenceFromProperties ignores non-inference properties', () => {
    const result = parseInferenceFromProperties({ foo: 'bar', temperature: '0.5' });
    expect(result).toEqual({ temperature: 0.5 });
  });

  it('writeInferenceToProperties writes values as strings', () => {
    const result = writeInferenceToProperties({ temperature: 0.7, maxTokens: 1024 });
    expect(result.temperature).toBe('0.7');
    expect(result.maxTokens).toBe('1024');
    expect(result.topP).toBeUndefined();
  });

  it('writeInferenceToProperties preserves existing properties', () => {
    const result = writeInferenceToProperties({ temperature: 0.7 }, { foo: 'bar', topP: '0.9' });
    expect(result.foo).toBe('bar');
    expect(result.temperature).toBe('0.7');
    expect(result.topP).toBe('0.9');
  });
});
