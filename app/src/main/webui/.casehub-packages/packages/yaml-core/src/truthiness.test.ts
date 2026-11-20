import { describe, it, expect } from 'vitest';
import { isTruthy } from './truthiness.js';

describe('Truthiness', () => {
  it.each(['true', 'True', 'TRUE', 'yes', 'Yes', 'on', 'ON', 'y', 'Y', '1'])(
    'treats "%s" as truthy',
    (v) => {
      expect(isTruthy(v)).toBe(true);
    },
  );

  it.each(['false', 'False', 'FALSE', 'no', 'No', 'off', 'OFF', 'n', 'N', '0'])(
    'treats "%s" as falsy',
    (v) => {
      expect(isTruthy(v)).toBe(false);
    },
  );

  it('throws on non-boolean string', () => {
    expect(() => isTruthy('production')).toThrow('not a boolean value');
  });

  it('throws on comparison expression', () => {
    expect(() => isTruthy('us != ap')).toThrow('not a boolean value');
  });

  it('throws on empty string', () => {
    expect(() => isTruthy('')).toThrow();
  });
});
