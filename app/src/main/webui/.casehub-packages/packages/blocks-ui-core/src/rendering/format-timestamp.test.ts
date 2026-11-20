import { describe, it, expect } from 'vitest';
import { formatTimestamp } from './format-timestamp.js';

describe('formatTimestamp', () => {
  const now = Date.now();
  const iso = (offsetMs: number) => new Date(now - offsetMs).toISOString();

  describe('conversational (default)', () => {
    it('returns "just now" for < 1 minute', () => {
      expect(formatTimestamp(iso(30_000))).toBe('just now');
    });
    it('returns "Xm ago" for < 60 minutes', () => {
      expect(formatTimestamp(iso(5 * 60_000))).toBe('5m ago');
    });
    it('returns "Xh ago" for < 24 hours', () => {
      expect(formatTimestamp(iso(3 * 3_600_000))).toBe('3h ago');
    });
    it('returns locale date for >= 24 hours', () => {
      const result = formatTimestamp(iso(48 * 3_600_000));
      expect(result).not.toContain('ago');
      expect(result.length).toBeGreaterThan(5);
    });
  });

  describe('compact', () => {
    it('returns "now" for < 1 minute', () => {
      expect(formatTimestamp(iso(30_000), { style: 'compact' })).toBe('now');
    });
    it('returns "Xm" for < 60 minutes', () => {
      expect(formatTimestamp(iso(5 * 60_000), { style: 'compact' })).toBe('5m');
    });
    it('returns "Xh" for < 24 hours', () => {
      expect(formatTimestamp(iso(3 * 3_600_000), { style: 'compact' })).toBe('3h');
    });
    it('returns "Xd" for >= 24 hours', () => {
      expect(formatTimestamp(iso(3 * 86_400_000), { style: 'compact' })).toBe('3d');
    });
  });

  it('returns empty string for empty input', () => {
    expect(formatTimestamp('')).toBe('');
  });

  it('returns empty string for undefined-like input', () => {
    expect(formatTimestamp(undefined as any)).toBe('');
  });
});
