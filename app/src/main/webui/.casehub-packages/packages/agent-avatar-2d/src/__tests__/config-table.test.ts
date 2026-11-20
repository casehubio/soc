import { describe, it, expect } from 'vitest';
import { FAMILY_PALETTES } from '../palettes.js';
import { ARCHETYPE_CONFIGS, ARCHETYPE_INDEX } from '../config-table.js';
import { ARCHETYPE_FAMILIES } from '../types.js';

describe('FAMILY_PALETTES', () => {
  it('has a palette for every family', () => {
    for (const family of ARCHETYPE_FAMILIES) {
      expect(FAMILY_PALETTES[family]).toBeDefined();
      expect(FAMILY_PALETTES[family]!.primary).toMatch(/^#[0-9a-f]{6}$/i);
      expect(FAMILY_PALETTES[family]!.skin).toMatch(/^#[0-9a-f]{6}$/i);
      expect(FAMILY_PALETTES[family]!.hairColor).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('every palette has all 7 colour fields', () => {
    for (const family of ARCHETYPE_FAMILIES) {
      const p = FAMILY_PALETTES[family]!;
      expect(p.primary).toBeTruthy();
      expect(p.secondary).toBeTruthy();
      expect(p.accent).toBeTruthy();
      expect(p.skin).toBeTruthy();
      expect(p.hairColor).toBeTruthy();
      expect(p.iris).toBeTruthy();
      expect(p.irisDark).toBeTruthy();
    }
  });
});

describe('ARCHETYPE_CONFIGS', () => {
  it('has exactly 48 entries', () => {
    expect(Object.keys(ARCHETYPE_CONFIGS)).toHaveLength(48);
  });

  it('every entry has all required fields including hat and expression', () => {
    for (const [key, config] of Object.entries(ARCHETYPE_CONFIGS)) {
      expect(config.head, `${key}.head`).toBeTruthy();
      expect(config.eyes, `${key}.eyes`).toBeTruthy();
      expect(config.nose, `${key}.nose`).toBeTruthy();
      expect(config.mouth, `${key}.mouth`).toBeTruthy();
      expect(config.hair, `${key}.hair`).toBeTruthy();
      expect(config.costume, `${key}.costume`).toBeTruthy();
      expect(config.eyebrows, `${key}.eyebrows`).toBeTruthy();
      expect(config.props, `${key}.props`).toBeInstanceOf(Array);
      expect(config.props.length, `${key}.props`).toBeGreaterThanOrEqual(1);
      expect('hat' in config, `${key} missing hat field`).toBe(true);
      expect('expression' in config, `${key} missing expression field`).toBe(true);
      expect('facialHair' in config, `${key} missing facialHair field`).toBe(true);
      expect('glasses' in config, `${key} missing glasses field`).toBe(true);
      expect('accessories' in config, `${key} missing accessories field`).toBe(true);
    }
  });

  it('keys follow Family/SubArchetype format', () => {
    for (const key of Object.keys(ARCHETYPE_CONFIGS)) {
      expect(key).toMatch(/^[A-Z][a-z]+\/[A-Z][a-z]+$/);
    }
  });

  it('every family has exactly 4 sub-archetypes', () => {
    for (const family of ARCHETYPE_FAMILIES) {
      const entries = Object.keys(ARCHETYPE_CONFIGS)
        .filter(k => k.startsWith(`${family}/`));
      expect(entries, `${family}`).toHaveLength(4);
    }
  });

  it('within each family, sub-archetypes differ by at least 2 parts', () => {
    for (const family of ARCHETYPE_FAMILIES) {
      const entries = Object.entries(ARCHETYPE_CONFIGS)
        .filter(([k]) => k.startsWith(`${family}/`));
      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          const [keyA, a] = entries[i]!;
          const [keyB, b] = entries[j]!;
          let diffs = 0;
          if (a.hair !== b.hair) diffs++;
          if (a.facialHair !== b.facialHair) diffs++;
          if (a.costume !== b.costume) diffs++;
          if (a.glasses !== b.glasses) diffs++;
          if (a.eyebrows !== b.eyebrows) diffs++;
          if (JSON.stringify(a.props) !== JSON.stringify(b.props)) diffs++;
          if (JSON.stringify(a.accessories) !== JSON.stringify(b.accessories)) diffs++;
          expect(diffs, `${keyA} vs ${keyB}`).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });
});

describe('ARCHETYPE_INDEX', () => {
  it('is sorted alphabetically', () => {
    const sorted = [...ARCHETYPE_INDEX].sort();
    expect(ARCHETYPE_INDEX).toEqual(sorted);
  });

  it('matches ARCHETYPE_CONFIGS keys', () => {
    expect(ARCHETYPE_INDEX).toEqual(Object.keys(ARCHETYPE_CONFIGS).sort());
  });
});
