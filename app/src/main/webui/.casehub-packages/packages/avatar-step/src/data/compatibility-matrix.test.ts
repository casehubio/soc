import { describe, it, expect } from 'vitest';
import { FRAMEWORK_FAMILY_MAP, ALL_FRAMEWORK_VALUES, SUB_ARCHETYPE_RULES } from './compatibility-matrix.js';
import type { PersonalityFramework } from './compatibility-matrix.js';

describe('FRAMEWORK_FAMILY_MAP', () => {
  it('MBTI INTJ maps to Sage, Magician, Sovereign', () => {
    expect(FRAMEWORK_FAMILY_MAP.mbti['INTJ']).toEqual(
      expect.arrayContaining(['Sage', 'Magician', 'Sovereign'])
    );
    expect(FRAMEWORK_FAMILY_MAP.mbti['INTJ']).toHaveLength(3);
  });

  it('ENTP maps to Magician, Rebel, Explorer', () => {
    expect(FRAMEWORK_FAMILY_MAP.mbti['ENTP']).toEqual(
      expect.arrayContaining(['Magician', 'Rebel', 'Explorer'])
    );
  });

  it('all 16 MBTI types have mappings', () => {
    expect(Object.keys(FRAMEWORK_FAMILY_MAP.mbti)).toHaveLength(16);
  });

  it('all 9 Enneagram types have mappings', () => {
    expect(Object.keys(FRAMEWORK_FAMILY_MAP.enneagram)).toHaveLength(9);
  });

  it('DISC has 4 styles', () => {
    expect(Object.keys(FRAMEWORK_FAMILY_MAP.disc)).toHaveLength(4);
  });

  it('Belbin has 9 roles', () => {
    expect(Object.keys(FRAMEWORK_FAMILY_MAP.belbin)).toHaveLength(9);
  });

  it('Big Five has 10 poles', () => {
    expect(Object.keys(FRAMEWORK_FAMILY_MAP.bigFive)).toHaveLength(10);
  });

  it('SDI has 4 styles', () => {
    expect(Object.keys(FRAMEWORK_FAMILY_MAP.sdi)).toHaveLength(4);
  });
});

describe('SUB_ARCHETYPE_RULES', () => {
  it('Caregiver has 4 sub-archetypes with MBTI affinity', () => {
    const rules = SUB_ARCHETYPE_RULES['Caregiver'];
    expect(rules).toHaveLength(4);
    expect(rules.map(r => r.subArchetype)).toEqual(
      expect.arrayContaining(['Angel', 'Guardian', 'Healer', 'Samaritan'])
    );
    expect(rules.find(r => r.subArchetype === 'Angel')!.mbtiAffinity)
      .toEqual(expect.arrayContaining(['INFJ', 'ISFJ']));
  });

  it('all 12 families have sub-archetype rules', () => {
    expect(Object.keys(SUB_ARCHETYPE_RULES)).toHaveLength(12);
  });

  it('each family has exactly 4 sub-archetypes', () => {
    for (const [family, rules] of Object.entries(SUB_ARCHETYPE_RULES)) {
      expect(rules, `${family} should have 4 sub-archetypes`).toHaveLength(4);
    }
  });
});

describe('ALL_FRAMEWORK_VALUES', () => {
  it('lists all valid values for each framework', () => {
    const frameworks: PersonalityFramework[] = ['mbti', 'enneagram', 'disc', 'belbin', 'sdi'];
    for (const f of frameworks) {
      expect(ALL_FRAMEWORK_VALUES[f].length).toBeGreaterThan(0);
    }
    expect(ALL_FRAMEWORK_VALUES.bigFive).toHaveLength(10);
  });
});
