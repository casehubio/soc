import { describe, it, expect } from 'vitest';
import { statusBorderColour } from './status-colours.js';

describe('statusBorderColour', () => {
  it('returns neutral colour', () => {
    expect(statusBorderColour('neutral')).toContain('--pages-neutral-12');
  });
  it('returns success colour', () => {
    expect(statusBorderColour('success')).toContain('--pages-success-9');
  });
  it('returns warning colour', () => {
    expect(statusBorderColour('warning')).toContain('--pages-warning-9');
  });
  it('returns error colour', () => {
    expect(statusBorderColour('error')).toContain('--pages-error-9');
  });
  it('returns accent colour', () => {
    expect(statusBorderColour('accent')).toContain('--pages-accent-9');
  });
  it('returns neutral for unknown category', () => {
    expect(statusBorderColour('unknown' as any)).toContain('--pages-neutral-12');
  });
});
