import { describe, it, expect } from 'vitest';
import { PROFESSION_PRESETS, PROFESSION_LIST } from './profession-presets.js';
import { ARCHETYPE_CONFIGS } from '@casehubio/mosaic-agent-avatar-2d';

describe('PROFESSION_PRESETS', () => {
  it('has at least 5 professions', () => {
    expect(Object.keys(PROFESSION_PRESETS).length).toBeGreaterThanOrEqual(5);
  });

  it('every variant maps to a valid archetype key', () => {
    for (const [profession, roles] of Object.entries(PROFESSION_PRESETS)) {
      for (const { role, variants } of roles) {
        expect(variants.length, `${profession}/${role} has no variants`).toBeGreaterThanOrEqual(1);
        for (const v of variants) {
          expect(ARCHETYPE_CONFIGS, `${profession}/${role} → ${v.archetype} not found`).toHaveProperty(v.archetype);
          expect(v.label, `${profession}/${role} variant missing label`).toBeTruthy();
          expect(v.description, `${profession}/${role} variant missing description`).toBeTruthy();
        }
      }
    }
  });

  it('Software has at least 4 roles', () => {
    expect(PROFESSION_PRESETS['Software'].length).toBeGreaterThanOrEqual(4);
  });

  it('PROFESSION_LIST is sorted', () => {
    const sorted = [...PROFESSION_LIST].sort();
    expect(PROFESSION_LIST).toEqual(sorted);
  });
});
