// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import '@casehubio/mosaic-core';
import { toDecoration, BADGE_COLORS } from './decoration.js';

describe('toDecoration', () => {
  it('produces badge with icon and colour for task:RUNNING', () => {
    const d = toDecoration('task', 'RUNNING');
    expect(d.badge).toBeDefined();
    expect(d.badge!.icon).toBe('▶');
    expect(d.badge!.color).toBe(BADGE_COLORS.success);
    expect(d.badge!.pulse).toBe(true);
  });

  it('produces border for border-flagged states', () => {
    const d = toDecoration('task', 'RUNNING');
    expect(d.border).toBeDefined();
    expect(d.border!.style).toBe('solid');
    expect(d.border!.color).toBe(BADGE_COLORS.success);
  });

  it('produces no border for non-border states', () => {
    const d = toDecoration('task', 'PENDING');
    expect(d.border).toBeUndefined();
  });

  it('produces no border for terminal states', () => {
    const d = toDecoration('task', 'COMPLETED');
    expect(d.border).toBeUndefined();
  });

  it('maps milestone:ACTIVE with pulse', () => {
    const d = toDecoration('milestone', 'ACTIVE');
    expect(d.badge!.pulse).toBe(true);
    expect(d.badge!.color).toBe(BADGE_COLORS.info);
  });

  it('maps milestone:PENDING without pulse', () => {
    const d = toDecoration('milestone', 'PENDING');
    expect(d.badge!.pulse).toBeFalsy();
  });

  it('returns fallback for unknown state', () => {
    const d = toDecoration('task', 'NONEXISTENT');
    expect(d.badge!.icon).toBe('?');
    expect(d.badge!.color).toBe(BADGE_COLORS.neutral);
  });

  it('task:DELEGATED gets border', () => {
    const d = toDecoration('task', 'DELEGATED');
    expect(d.border).toBeDefined();
    expect(d.badge!.icon).toBe('→');
  });

  it('task:SUSPENDED gets border', () => {
    const d = toDecoration('task', 'SUSPENDED');
    expect(d.border).toBeDefined();
  });
});

describe('BADGE_COLORS', () => {
  it('maps all StateCategory values', () => {
    for (const cat of ['active', 'info', 'success', 'danger', 'neutral', 'transfer', 'warning']) {
      expect(BADGE_COLORS[cat as keyof typeof BADGE_COLORS]).toBeTruthy();
    }
  });
});
