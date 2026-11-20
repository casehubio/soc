import { describe, it, expect } from 'vitest';
import { ThresholdCondition } from './threshold-condition.js';

describe('ThresholdCondition', () => {
  it('parses >=N metric', () => {
    const tc = ThresholdCondition.parse('>=14 supply');
    expect(tc.operator).toBe('>=');
    expect(tc.threshold).toBe(14);
    expect(tc.metricName).toBe('supply');
  });

  it('defaults to >= when no operator', () => {
    const tc = ThresholdCondition.parse('10 workers');
    expect(tc.operator).toBe('>=');
    expect(tc.threshold).toBe(10);
    expect(tc.metricName).toBe('workers');
  });

  it('parses < operator', () => {
    const tc = ThresholdCondition.parse('<5 health');
    expect(tc.operator).toBe('<');
    expect(tc.threshold).toBe(5);
  });

  it('parses > operator', () => {
    const tc = ThresholdCondition.parse('>100 score');
    expect(tc.operator).toBe('>');
    expect(tc.threshold).toBe(100);
  });

  it('parses <= operator', () => {
    const tc = ThresholdCondition.parse('<=0 energy');
    expect(tc.operator).toBe('<=');
    expect(tc.threshold).toBe(0);
  });

  it('parses decimal thresholds', () => {
    const tc = ThresholdCondition.parse('>=3.5 rating');
    expect(tc.threshold).toBe(3.5);
  });

  it('throws on invalid input', () => {
    expect(() => ThresholdCondition.parse('invalid')).toThrow('Invalid threshold condition');
  });

  it('test returns true when condition met', () => {
    expect(ThresholdCondition.parse('>=14 supply').test(14)).toBe(true);
    expect(ThresholdCondition.parse('>=14 supply').test(20)).toBe(true);
    expect(ThresholdCondition.parse('>10 x').test(11)).toBe(true);
    expect(ThresholdCondition.parse('<=5 x').test(5)).toBe(true);
    expect(ThresholdCondition.parse('<5 x').test(4)).toBe(true);
  });

  it('test returns false when condition not met', () => {
    expect(ThresholdCondition.parse('>=14 supply').test(13)).toBe(false);
    expect(ThresholdCondition.parse('>10 x').test(10)).toBe(false);
    expect(ThresholdCondition.parse('<=5 x').test(6)).toBe(false);
    expect(ThresholdCondition.parse('<5 x').test(5)).toBe(false);
  });

  it('trims whitespace', () => {
    const tc = ThresholdCondition.parse('  >= 14  supply  ');
    expect(tc.operator).toBe('>=');
    expect(tc.threshold).toBe(14);
    expect(tc.metricName).toBe('supply');
  });
});
