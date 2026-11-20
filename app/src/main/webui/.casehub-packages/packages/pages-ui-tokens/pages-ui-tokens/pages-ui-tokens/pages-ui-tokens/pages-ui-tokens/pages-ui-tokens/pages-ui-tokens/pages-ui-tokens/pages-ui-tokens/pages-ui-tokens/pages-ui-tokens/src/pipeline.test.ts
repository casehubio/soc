import { describe, it, expect, beforeEach } from 'vitest';
import type { TokenMap, PresetConfig } from './types.js';
import { registerTransform } from './registry.js';
import { registerBuiltinPreset, resolvePresetChain } from './preset-loader.js';
import { runPipeline, buildInitialTokenMap } from './pipeline.js';

describe('buildInitialTokenMap', () => {
  it('contains spacing tokens', () => {
    const tokens = buildInitialTokenMap();
    const spacing = tokens['spacing'] as TokenMap;
    expect(spacing['1']).toEqual({ $value: '4px', $type: 'dimension' });
    expect(spacing['0-5']).toEqual({ $value: '2px', $type: 'dimension' });
  });

  it('contains typography tokens', () => {
    const tokens = buildInitialTokenMap();
    const fontSize = tokens['font-size'] as TokenMap;
    expect(fontSize['base']).toEqual({ $value: '14px', $type: 'dimension' });
  });

  it('contains font-family as a flat leaf', () => {
    const tokens = buildInitialTokenMap();
    expect(tokens['font-family']).toEqual({ $value: "'Inter', system-ui, -apple-system, sans-serif", $type: 'fontFamily' });
  });

  it('contains radius tokens', () => {
    const tokens = buildInitialTokenMap();
    const radius = tokens['radius'] as TokenMap;
    expect(radius['md']).toEqual({ $value: '6px', $type: 'dimension' });
  });

  it('contains motion tokens', () => {
    const tokens = buildInitialTokenMap();
    const duration = tokens['duration'] as TokenMap;
    expect(duration['fast']).toEqual({ $value: '120ms', $type: 'duration' });
  });
});

describe('resolvePresetChain', () => {
  beforeEach(() => {
    registerBuiltinPreset({
      $name: 'test-base',
      pipeline: [{ transform: 'a' }],
    });
    registerBuiltinPreset({
      $name: 'test-child',
      $extends: 'test-base',
      pipeline: [{ transform: 'b' }],
    });
  });

  it('returns own pipeline when no $extends', () => {
    const chain = resolvePresetChain({ $name: 'standalone', pipeline: [{ transform: 'x' }] });
    expect(chain).toEqual([{ transform: 'x' }]);
  });

  it('prepends parent pipeline for $extends', () => {
    const chain = resolvePresetChain({ $name: 'test-child', $extends: 'test-base', pipeline: [{ transform: 'b' }] });
    expect(chain).toEqual([{ transform: 'a' }, { transform: 'b' }]);
  });

  it('throws on circular $extends', () => {
    registerBuiltinPreset({ $name: 'loop-a', $extends: 'loop-b', pipeline: [] });
    registerBuiltinPreset({ $name: 'loop-b', $extends: 'loop-a', pipeline: [] });
    expect(() => resolvePresetChain({ $name: 'loop-a', $extends: 'loop-b', pipeline: [] }))
      .toThrow(/Circular/);
  });

  it('throws on unresolvable $extends', () => {
    expect(() => resolvePresetChain({ $name: 'x', $extends: 'nonexistent', pipeline: [] }))
      .toThrow(/Cannot resolve/);
  });
});

describe('runPipeline', () => {
  beforeEach(() => {
    registerTransform('test-add-color', (tokens: TokenMap) => ({
      ...tokens,
      color: { test: { $value: 'oklch(50% 0.1 210)', $type: 'color' } },
    }));
  });

  it('executes transforms and returns final TokenMap', () => {
    const preset: PresetConfig = {
      $name: 'test',
      pipeline: [{ transform: 'test-add-color' }],
    };
    const result = runPipeline(preset);
    const color = result['color'] as TokenMap;
    expect(color['test']).toEqual({ $value: 'oklch(50% 0.1 210)', $type: 'color' });
  });

  it('includes initial static tokens', () => {
    const result = runPipeline({ $name: 'empty', pipeline: [] });
    expect(result['spacing']).toBeDefined();
    expect(result['radius']).toBeDefined();
  });

  it('throws on unknown transform', () => {
    expect(() => runPipeline({ $name: 'bad', pipeline: [{ transform: 'nonexistent' }] }))
      .toThrow(/Unknown transform/);
  });
});
