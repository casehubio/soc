import type { ArchetypeFamily } from '@casehubio/mosaic-agent-avatar-2d';
import { PROFESSION_PRESETS } from './profession-presets.js';

export type PersonalityFramework = 'mbti' | 'enneagram' | 'disc' | 'belbin' | 'sdi';
export type BigFiveDimension = 'O' | 'C' | 'E' | 'A' | 'N';
export type BigFivePole = 'high' | 'low';

export const FRAMEWORK_FAMILY_MAP: Record<
  PersonalityFramework | 'bigFive',
  Record<string, ArchetypeFamily[]>
> = {
  mbti: {
    'INTJ': ['Sage', 'Magician', 'Sovereign'],
    'INTP': ['Sage', 'Explorer', 'Creator'],
    'ENTJ': ['Sovereign', 'Hero', 'Magician'],
    'ENTP': ['Magician', 'Rebel', 'Explorer'],
    'INFJ': ['Magician', 'Sage', 'Caregiver'],
    'INFP': ['Creator', 'Innocent', 'Explorer'],
    'ENFJ': ['Caregiver', 'Sovereign', 'Magician'],
    'ENFP': ['Explorer', 'Creator', 'Jester'],
    'ISTJ': ['Sovereign', 'Everyman', 'Sage'],
    'ISFJ': ['Caregiver', 'Everyman', 'Innocent'],
    'ESTJ': ['Sovereign', 'Hero', 'Everyman'],
    'ESFJ': ['Caregiver', 'Everyman', 'Lover'],
    'ISTP': ['Explorer', 'Hero', 'Rebel'],
    'ISFP': ['Creator', 'Lover', 'Innocent'],
    'ESTP': ['Hero', 'Jester', 'Rebel'],
    'ESFP': ['Jester', 'Lover', 'Innocent'],
  },
  enneagram: {
    'Type 1': ['Hero', 'Sovereign', 'Sage'],
    'Type 2': ['Caregiver', 'Lover', 'Everyman'],
    'Type 3': ['Hero', 'Magician', 'Sovereign'],
    'Type 4': ['Creator', 'Rebel', 'Lover'],
    'Type 5': ['Sage', 'Explorer', 'Magician'],
    'Type 6': ['Everyman', 'Caregiver', 'Hero'],
    'Type 7': ['Jester', 'Explorer', 'Innocent'],
    'Type 8': ['Rebel', 'Sovereign', 'Hero'],
    'Type 9': ['Innocent', 'Everyman', 'Caregiver'],
  },
  disc: {
    'D': ['Hero', 'Rebel', 'Magician', 'Sovereign'],
    'I': ['Jester', 'Lover', 'Everyman', 'Explorer'],
    'S': ['Caregiver', 'Everyman', 'Innocent', 'Creator'],
    'C': ['Sage', 'Sovereign', 'Creator', 'Explorer'],
  },
  belbin: {
    'Plant': ['Creator', 'Magician'],
    'Shaper': ['Hero', 'Rebel', 'Sovereign'],
    'Monitor Evaluator': ['Sage', 'Sovereign'],
    'Co-ordinator': ['Sovereign', 'Caregiver'],
    'Teamworker': ['Everyman', 'Caregiver', 'Lover'],
    'Implementer': ['Everyman', 'Sovereign'],
    'Completer-Finisher': ['Sage', 'Sovereign'],
    'Specialist': ['Sage', 'Explorer'],
    'Resource Investigator': ['Explorer', 'Jester', 'Everyman'],
  },
  bigFive: {
    'High O': ['Creator', 'Explorer', 'Jester', 'Lover', 'Magician', 'Rebel', 'Sage'],
    'Low O': ['Caregiver', 'Everyman', 'Hero', 'Innocent', 'Sovereign'],
    'High C': ['Caregiver', 'Everyman', 'Hero', 'Innocent', 'Magician', 'Sage', 'Sovereign'],
    'Low C': ['Creator', 'Explorer', 'Jester', 'Lover', 'Rebel'],
    'High E': ['Caregiver', 'Everyman', 'Explorer', 'Hero', 'Jester', 'Lover', 'Rebel', 'Sovereign'],
    'Low E': ['Creator', 'Innocent', 'Magician', 'Sage'],
    'High A': ['Caregiver', 'Everyman', 'Innocent', 'Jester', 'Lover', 'Sage'],
    'Low A': ['Creator', 'Explorer', 'Hero', 'Magician', 'Rebel', 'Sovereign'],
    'High N': ['Creator', 'Lover', 'Rebel'],
    'Low N': ['Caregiver', 'Everyman', 'Explorer', 'Hero', 'Innocent', 'Jester', 'Magician', 'Sage', 'Sovereign'],
  },
  sdi: {
    'Blue': ['Caregiver', 'Innocent', 'Lover'],
    'Red': ['Hero', 'Sovereign', 'Rebel'],
    'Green': ['Sage', 'Explorer', 'Creator'],
    'Hub': ['Everyman', 'Magician', 'Jester'],
  },
};

export interface SubArchetypeRule {
  readonly subArchetype: string;
  readonly mbtiAffinity: readonly string[];
  readonly enneagramAffinity: readonly number[];
}

export const SUB_ARCHETYPE_RULES: Record<ArchetypeFamily, readonly SubArchetypeRule[]> = {
  Caregiver: [
    { subArchetype: 'Angel', mbtiAffinity: ['INFJ', 'ISFJ'], enneagramAffinity: [2, 9] },
    { subArchetype: 'Guardian', mbtiAffinity: ['ISTJ', 'ISFJ', 'ESTJ'], enneagramAffinity: [6, 1] },
    { subArchetype: 'Healer', mbtiAffinity: ['INFJ', 'INFP', 'ISFP'], enneagramAffinity: [2, 4] },
    { subArchetype: 'Samaritan', mbtiAffinity: ['ESFJ', 'ENFJ', 'ISFJ'], enneagramAffinity: [2, 6] },
  ],
  Creator: [
    { subArchetype: 'Artist', mbtiAffinity: ['ISFP', 'INFP'], enneagramAffinity: [4] },
    { subArchetype: 'Entrepreneur', mbtiAffinity: ['ENTP', 'ENTJ', 'ESTP'], enneagramAffinity: [3, 7] },
    { subArchetype: 'Storyteller', mbtiAffinity: ['ENFP', 'INFP', 'ENFJ'], enneagramAffinity: [4, 7] },
    { subArchetype: 'Visionary', mbtiAffinity: ['INTJ', 'INFJ', 'ENTP'], enneagramAffinity: [5, 4] },
  ],
  Everyman: [
    { subArchetype: 'Advocate', mbtiAffinity: ['ENFJ', 'INFJ', 'ENFP'], enneagramAffinity: [1, 6] },
    { subArchetype: 'Citizen', mbtiAffinity: ['ESTJ', 'ISTJ', 'ESFJ'], enneagramAffinity: [6, 1] },
    { subArchetype: 'Networker', mbtiAffinity: ['ENFP', 'ESFJ', 'ENTP'], enneagramAffinity: [7, 3] },
    { subArchetype: 'Servant', mbtiAffinity: ['ISFJ', 'ISTJ'], enneagramAffinity: [2, 9] },
  ],
  Explorer: [
    { subArchetype: 'Adventurer', mbtiAffinity: ['ESTP', 'ISTP', 'ESFP'], enneagramAffinity: [7, 8] },
    { subArchetype: 'Generalist', mbtiAffinity: ['ENTP', 'ENFP', 'INTP'], enneagramAffinity: [7, 5] },
    { subArchetype: 'Pioneer', mbtiAffinity: ['ENTJ', 'ENTP', 'INTJ'], enneagramAffinity: [3, 7, 8] },
    { subArchetype: 'Seeker', mbtiAffinity: ['INFP', 'INFJ', 'INTP'], enneagramAffinity: [5, 4] },
  ],
  Hero: [
    { subArchetype: 'Athlete', mbtiAffinity: ['ESTP', 'ISTP', 'ESTJ'], enneagramAffinity: [3, 1] },
    { subArchetype: 'Liberator', mbtiAffinity: ['ENFJ', 'ENTJ', 'ENFP'], enneagramAffinity: [8, 1] },
    { subArchetype: 'Rescuer', mbtiAffinity: ['ESFJ', 'ISFJ', 'ESTJ'], enneagramAffinity: [2, 6] },
    { subArchetype: 'Warrior', mbtiAffinity: ['ENTJ', 'ESTJ', 'INTJ'], enneagramAffinity: [8, 3, 1] },
  ],
  Innocent: [
    { subArchetype: 'Child', mbtiAffinity: ['ESFP', 'ENFP', 'ISFP'], enneagramAffinity: [7, 9] },
    { subArchetype: 'Dreamer', mbtiAffinity: ['INFP', 'INFJ'], enneagramAffinity: [9, 4] },
    { subArchetype: 'Idealist', mbtiAffinity: ['INFP', 'ENFJ', 'ENFP'], enneagramAffinity: [1, 9] },
    { subArchetype: 'Muse', mbtiAffinity: ['ENFP', 'INFP', 'ENFJ'], enneagramAffinity: [4, 7] },
  ],
  Jester: [
    { subArchetype: 'Clown', mbtiAffinity: ['ESFP', 'ESTP'], enneagramAffinity: [7, 9] },
    { subArchetype: 'Entertainer', mbtiAffinity: ['ESFP', 'ENFP', 'ESTP'], enneagramAffinity: [7, 3] },
    { subArchetype: 'Provocateur', mbtiAffinity: ['ENTP', 'ESTP', 'INTJ'], enneagramAffinity: [7, 8, 4] },
    { subArchetype: 'Shapeshifter', mbtiAffinity: ['ENFP', 'ENTP', 'INFJ'], enneagramAffinity: [3, 7, 9] },
  ],
  Lover: [
    { subArchetype: 'Companion', mbtiAffinity: ['ISFJ', 'ISFP', 'ESFJ'], enneagramAffinity: [2, 6, 9] },
    { subArchetype: 'Hedonist', mbtiAffinity: ['ESFP', 'ISFP', 'ESTP'], enneagramAffinity: [7, 4] },
    { subArchetype: 'Matchmaker', mbtiAffinity: ['ENFJ', 'ESFJ', 'ENFP'], enneagramAffinity: [2, 7] },
    { subArchetype: 'Romantic', mbtiAffinity: ['INFP', 'ENFP', 'INFJ'], enneagramAffinity: [4, 2] },
  ],
  Magician: [
    { subArchetype: 'Alchemist', mbtiAffinity: ['INFJ', 'INTJ'], enneagramAffinity: [5, 4] },
    { subArchetype: 'Engineer', mbtiAffinity: ['INTJ', 'INTP', 'ENTJ'], enneagramAffinity: [5, 1, 3] },
    { subArchetype: 'Innovator', mbtiAffinity: ['ENTP', 'ENTJ', 'ENFP'], enneagramAffinity: [7, 3] },
    { subArchetype: 'Scientist', mbtiAffinity: ['INTJ', 'INTP', 'ISTJ'], enneagramAffinity: [5, 1] },
  ],
  Rebel: [
    { subArchetype: 'Activist', mbtiAffinity: ['ENFJ', 'ENFP', 'ENTJ'], enneagramAffinity: [1, 8] },
    { subArchetype: 'Gambler', mbtiAffinity: ['ESTP', 'ENTP'], enneagramAffinity: [7, 8] },
    { subArchetype: 'Maverick', mbtiAffinity: ['ISTP', 'INTP', 'INTJ', 'ENTP'], enneagramAffinity: [5, 8, 4] },
    { subArchetype: 'Reformer', mbtiAffinity: ['INTJ', 'ENTJ', 'INFJ'], enneagramAffinity: [1, 8] },
  ],
  Sage: [
    { subArchetype: 'Detective', mbtiAffinity: ['ISTJ', 'INTJ', 'ISTP'], enneagramAffinity: [5, 6] },
    { subArchetype: 'Mentor', mbtiAffinity: ['ENFJ', 'INFJ', 'ENTJ'], enneagramAffinity: [1, 2, 5] },
    { subArchetype: 'Shaman', mbtiAffinity: ['INFJ', 'INFP', 'INTP'], enneagramAffinity: [5, 4, 9] },
    { subArchetype: 'Translator', mbtiAffinity: ['INTP', 'ENTP', 'INTJ'], enneagramAffinity: [5, 7] },
  ],
  Sovereign: [
    { subArchetype: 'Ambassador', mbtiAffinity: ['ENFJ', 'ESFJ', 'ENTJ'], enneagramAffinity: [3, 2, 9] },
    { subArchetype: 'Judge', mbtiAffinity: ['INTJ', 'ISTJ', 'ESTJ'], enneagramAffinity: [1, 5, 6] },
    { subArchetype: 'Patriarch', mbtiAffinity: ['ESTJ', 'ENTJ', 'ISTJ'], enneagramAffinity: [8, 1, 6] },
    { subArchetype: 'Ruler', mbtiAffinity: ['ENTJ', 'ESTJ'], enneagramAffinity: [8, 3, 1] },
  ],
};

export const ALL_FRAMEWORK_VALUES: Record<PersonalityFramework | 'bigFive', readonly string[]> = {
  mbti: Object.keys(FRAMEWORK_FAMILY_MAP.mbti),
  enneagram: Object.keys(FRAMEWORK_FAMILY_MAP.enneagram),
  disc: Object.keys(FRAMEWORK_FAMILY_MAP.disc),
  belbin: Object.keys(FRAMEWORK_FAMILY_MAP.belbin),
  bigFive: Object.keys(FRAMEWORK_FAMILY_MAP.bigFive),
  sdi: Object.keys(FRAMEWORK_FAMILY_MAP.sdi),
};

export function getFrameworkProfile(archetypeKey: string): Record<string, string[]> {
  const [family, sub] = archetypeKey.split('/');
  const profile: Record<string, string[]> = {};
  const rules = SUB_ARCHETYPE_RULES[family as ArchetypeFamily]?.find(r => r.subArchetype === sub);
  if (rules) {
    profile['MBTI'] = [...rules.mbtiAffinity];
    profile['Enneagram'] = rules.enneagramAffinity.map(n => `Type ${n}`);
  }
  for (const [fw, map] of Object.entries(FRAMEWORK_FAMILY_MAP)) {
    if (fw === 'mbti' || fw === 'enneagram') continue;
    const label = fw === 'disc' ? 'DISC' : fw === 'belbin' ? 'Belbin' : fw === 'sdi' ? 'SDI' : 'Big Five';
    const matches = Object.entries(map).filter(([, families]) => (families as string[]).includes(family!)).map(([val]) => val);
    if (matches.length > 0) profile[label] = matches;
  }
  return profile;
}

export function getRolesForArchetype(archetypeKey: string): Array<{ profession: string; role: string }> {
  const matches: Array<{ profession: string; role: string }> = [];
  for (const [profession, roles] of Object.entries(PROFESSION_PRESETS)) {
    for (const { role, variants } of roles) {
      if (variants.some(v => v.archetype === archetypeKey)) {
        matches.push({ profession, role });
      }
    }
  }
  return matches;
}

export function getRoleFrameworkValues(profession: string, role: string): Set<string> {
  const roles = PROFESSION_PRESETS[profession];
  const r = roles?.find(x => x.role === role);
  if (!r) return new Set();
  const vals = new Set<string>();
  for (const v of r.variants) {
    const profile = getFrameworkProfile(v.archetype);
    for (const [fw, fvs] of Object.entries(profile)) {
      for (const fv of fvs) vals.add(`${fw}:${fv}`);
    }
  }
  return vals;
}
