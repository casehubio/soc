// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { HtnDiagram } from './htn-diagram.js';

describe('HtnDiagram', () => {
  it('has default layoutDirection of DOWN', () => {
    const el = new HtnDiagram();
    expect(el.layoutDirection).toBe('DOWN');
  });

  it('returns layout options matching direction', () => {
    const el = new HtnDiagram();
    el.layoutDirection = 'RIGHT';
    const opts = (el as any)._layoutOptions();
    expect(opts.direction).toBe('RIGHT');
    expect(opts.spacing).toBe(60);
  });

  it('_applyPropertyEdit returns yaml unchanged', () => {
    const el = new HtnDiagram();
    const yaml = 'do:\n  - step: {}\n';
    const result = (el as any)._applyPropertyEdit(yaml, ['do', 0], ['name'], 'test');
    expect(result).toBe(yaml);
  });

  it('_emptyTemplate returns null', () => {
    const el = new HtnDiagram();
    expect((el as any)._emptyTemplate()).toBeNull();
  });
});
