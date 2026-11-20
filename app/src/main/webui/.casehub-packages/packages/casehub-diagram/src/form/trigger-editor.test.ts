import { describe, it, expect } from 'vitest';
import { detectTriggerType } from './trigger-editor.js';

describe('detectTriggerType', () => {
  it('detects contextChange', () => {
    expect(detectTriggerType({ contextChange: { filter: '.x' } })).toBe('contextChange');
  });

  it('detects cloudEvent string form', () => {
    expect(detectTriggerType({ cloudEvent: 'document.received' })).toBe('cloudEvent');
  });

  it('detects cloudEvent object form', () => {
    expect(detectTriggerType({ cloudEvent: { type: 'document.received' } })).toBe('cloudEvent');
  });

  it('detects schedule', () => {
    expect(detectTriggerType({ schedule: { cron: '*/5 * * * *' } })).toBe('schedule');
  });

  it('detects scopeActivated', () => {
    expect(detectTriggerType({ scopeActivated: {} })).toBe('scopeActivated');
  });

  it('returns null for empty', () => {
    expect(detectTriggerType({})).toBeNull();
  });
});
