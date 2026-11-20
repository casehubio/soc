import { describe, it, expect } from 'vitest';
import { PluginRegistry } from './plugin-registry.js';
import type { PluginRegistration } from './plugin-registry.js';
import type { CatalogEntry } from './walker.js';

function plugin(name: string): PluginRegistration {
  return {
    name,
    inputs: { x: { type: 'STRING', required: true } },
    outputs: {},
    execute: async () => ({ kind: 'success' as const, output: {}, executionMetadata: {} }),
  };
}

describe('PluginRegistry', () => {
  it('register and has', () => {
    const reg = new PluginRegistry();
    reg.register(plugin('greet'));
    expect(reg.has('greet')).toBe(true);
    expect(reg.has('missing')).toBe(false);
  });

  it('register duplicate throws', () => {
    const reg = new PluginRegistry();
    reg.register(plugin('greet'));
    expect(() => { reg.register(plugin('greet')); }).toThrow("already registered");
  });

  it('unregister removes plugin', () => {
    const reg = new PluginRegistry();
    reg.register(plugin('greet'));
    expect(reg.unregister('greet')).toBe(true);
    expect(reg.has('greet')).toBe(false);
  });

  it('unregister returns false for unknown', () => {
    const reg = new PluginRegistry();
    expect(reg.unregister('missing')).toBe(false);
  });

  it('createSource populates catalog entries', () => {
    const reg = new PluginRegistry();
    reg.register(plugin('alpha'));
    reg.register(plugin('beta'));
    const src = reg.createSource();
    const entries = new Map<string, CatalogEntry>();
    src.populate(entries);
    expect(entries.has('alpha')).toBe(true);
    expect(entries.has('beta')).toBe(true);
    expect(entries.get('alpha')!.definition.name).toBe('alpha');
  });

  it('createSource respects priority parameter', () => {
    const reg = new PluginRegistry();
    const src = reg.createSource(42);
    expect(src.priority).toBe(42);
  });

  it('createSource sets portability to ts on produced definitions', () => {
    const reg = new PluginRegistry();
    reg.register(plugin('test'));
    const entries = new Map<string, CatalogEntry>();
    reg.createSource().populate(entries);
    expect(entries.get('test')!.definition.portability).toBe('ts');
  });
});
