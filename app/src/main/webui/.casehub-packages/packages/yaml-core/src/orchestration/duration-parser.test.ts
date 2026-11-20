import { describe, it, expect } from 'vitest';
import { parseDuration } from './duration-parser.js';

describe('parseDuration', () => {
  it('parses milliseconds', () => {
    expect(parseDuration('10ms')).toBe(10);
    expect(parseDuration('0ms')).toBe(0);
    expect(parseDuration('500ms')).toBe(500);
  });

  it('parses seconds', () => {
    expect(parseDuration('5s')).toBe(5000);
    expect(parseDuration('1s')).toBe(1000);
    expect(parseDuration('0.5s')).toBe(500);
  });

  it('parses minutes', () => {
    expect(parseDuration('3m')).toBe(180_000);
    expect(parseDuration('1m')).toBe(60_000);
  });

  it('parses hours', () => {
    expect(parseDuration('1h')).toBe(3_600_000);
    expect(parseDuration('2h')).toBe(7_200_000);
  });

  it('throws on invalid format', () => {
    expect(() => parseDuration('')).toThrow();
    expect(() => parseDuration('10')).toThrow();
    expect(() => parseDuration('abc')).toThrow();
    expect(() => parseDuration('10x')).toThrow();
  });

  it('throws on negative values', () => {
    expect(() => parseDuration('-5s')).toThrow();
  });
});
