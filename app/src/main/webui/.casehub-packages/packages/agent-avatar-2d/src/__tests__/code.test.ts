import { describe, it, expect } from 'vitest';
import { encodePreset, encodeCustom, decodeCode } from '../code.js';
import { ARCHETYPE_CONFIGS } from '../config-table.js';

describe('encodePreset', () => {
  it('encodes Sage/Detective as mythic:P with base36 index', () => {
    const code = encodePreset('Sage/Detective');
    expect(code).toMatch(/^mythic:P[0-9a-z]+$/i);
  });

  it('preset code length is compact', () => {
    const code = encodePreset('Sage/Detective');
    expect(code.length).toBeLessThanOrEqual(12);
  });

  it('accepts custom collection', () => {
    const code = encodePreset('Sage/Detective', 'pixel');
    expect(code.startsWith('pixel:P')).toBe(true);
  });

  it('throws for unknown archetype key', () => {
    expect(() => encodePreset('Fake/Nobody')).toThrow();
  });
});

describe('encodeCustom', () => {
  it('produces a C-prefixed code', () => {
    const assignment = ARCHETYPE_CONFIGS['Sage/Detective']!;
    const code = encodeCustom({ ...assignment, hair: 'afro-short' });
    expect(code).toMatch(/^mythic:C/);
  });

  it('custom codes are compact (under 20 chars total)', () => {
    const assignment = ARCHETYPE_CONFIGS['Sage/Detective']!;
    const code = encodeCustom({ ...assignment, hair: 'afro-short' });
    expect(code.length).toBeLessThanOrEqual(20);
  });
});

describe('decodeCode', () => {
  it('roundtrips all 48 preset codes', () => {
    for (const key of Object.keys(ARCHETYPE_CONFIGS)) {
      const code = encodePreset(key);
      const decoded = decodeCode(code);
      expect(decoded.type, `${key} type`).toBe('preset');
      expect(decoded.archetypeKey, `${key} key`).toBe(key);
      expect(decoded.assignment, `${key} assignment`).toEqual(ARCHETYPE_CONFIGS[key]);
    }
  });

  it('roundtrips custom codes — core fields preserved', () => {
    const original = { ...ARCHETYPE_CONFIGS['Sage/Detective']!, hair: 'afro-short' };
    const code = encodeCustom(original);
    const decoded = decodeCode(code);
    expect(decoded.type).toBe('custom');
    expect(decoded.assignment.hair).toBe('afro-short');
    expect(decoded.assignment.head).toBe(original.head);
    expect(decoded.assignment.costume).toBe(original.costume);
    expect(decoded.assignment.eyebrows).toBe(original.eyebrows);
    expect(decoded.assignment.facialHair).toBe(original.facialHair);
  });

  it('detects preset vs custom correctly', () => {
    const presetCode = encodePreset('Hero/Warrior');
    const customCode = encodeCustom({ ...ARCHETYPE_CONFIGS['Hero/Warrior']!, glasses: 'aviator' });
    expect(decodeCode(presetCode).type).toBe('preset');
    expect(decodeCode(customCode).type).toBe('custom');
  });

  it('collection is preserved in decoded result', () => {
    const code = encodePreset('Hero/Warrior', 'pixel');
    const decoded = decodeCode(code);
    expect(decoded.collection).toBe('pixel');
  });
});
