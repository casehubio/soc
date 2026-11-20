import type { ArchetypeFamily } from '@casehubio/mosaic-agent-avatar-2d';
import { SUB_ARCHETYPE_RULES, FRAMEWORK_FAMILY_MAP } from './compatibility-matrix.js';
import type { BigFiveDimension, BigFivePole } from './compatibility-matrix.js';
import { BIG_FIVE_DIMS } from './framework-descriptors.js';
import type { PersonalityProfile } from '@casehubio/mosaic-core';

export function initProfile(archetypeKey: string): PersonalityProfile {
  const [family, sub] = archetypeKey.split('/');
  const profile: PersonalityProfile = {};

  const rules = SUB_ARCHETYPE_RULES[family as ArchetypeFamily]?.find(r => r.subArchetype === sub);
  if (rules?.mbtiAffinity.length) profile.mbti = rules.mbtiAffinity[0]!;
  if (rules?.enneagramAffinity.length) profile.enneagram = `Type ${rules.enneagramAffinity[0]}`;

  for (const fw of ['disc', 'sdi'] as const) {
    const map = FRAMEWORK_FAMILY_MAP[fw];
    for (const [val, families] of Object.entries(map)) {
      if ((families as string[]).includes(family!)) { profile[fw] = val; break; }
    }
  }

  const belbinMatches: string[] = [];
  for (const [val, families] of Object.entries(FRAMEWORK_FAMILY_MAP.belbin)) {
    if ((families as string[]).includes(family!)) belbinMatches.push(val);
  }
  if (belbinMatches.length > 0) {
    profile.belbin = { primary: belbinMatches[0]!, secondaries: belbinMatches.slice(1, 3) };
  }

  const bigFive: Partial<Record<BigFiveDimension, BigFivePole>> = {};
  for (const dim of BIG_FIVE_DIMS) {
    const highFamilies = FRAMEWORK_FAMILY_MAP.bigFive[`High ${dim}`] as string[] | undefined;
    const lowFamilies = FRAMEWORK_FAMILY_MAP.bigFive[`Low ${dim}`] as string[] | undefined;
    const inHigh = highFamilies?.includes(family!) ?? false;
    const inLow = lowFamilies?.includes(family!) ?? false;
    if (inHigh && !inLow) bigFive[dim] = 'high';
    else if (inLow && !inHigh) bigFive[dim] = 'low';
  }
  if (Object.keys(bigFive).length > 0) profile.bigFive = bigFive;

  return profile;
}
