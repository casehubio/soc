import { ARCHETYPE_CONFIGS } from '@casehubio/mosaic-agent-avatar-2d';
import type { ArchetypeFamily } from '@casehubio/mosaic-agent-avatar-2d';
import {
  FRAMEWORK_FAMILY_MAP, SUB_ARCHETYPE_RULES, ALL_FRAMEWORK_VALUES,
} from './data/compatibility-matrix.js';
import type { PersonalityFramework, BigFiveDimension, BigFivePole } from './data/compatibility-matrix.js';

export type MatchTier = 'strong' | 'weak' | 'incompatible';

const ALL_48 = new Set(Object.keys(ARCHETYPE_CONFIGS));

function intersection<T>(a: Set<T>, b: Set<T>): Set<T> {
  return new Set([...a].filter(x => b.has(x)));
}

export function getCompatibleArchetypes(
  selections: Partial<Record<PersonalityFramework, string>>,
  bigFiveSelections: Partial<Record<BigFiveDimension, BigFivePole>>,
): Map<string, MatchTier> {
  const noSelections =
    Object.keys(selections).length === 0 &&
    Object.keys(bigFiveSelections).length === 0;

  if (noSelections) {
    return new Map([...ALL_48].map(a => [a, 'strong' as const]));
  }

  let families: Set<ArchetypeFamily> | null = null;

  for (const [framework, value] of Object.entries(selections)) {
    const map = FRAMEWORK_FAMILY_MAP[framework as PersonalityFramework | 'bigFive'];
    if (!map?.[value]) continue;
    const compatible = new Set(map[value] as ArchetypeFamily[]);
    families = families ? intersection(families, compatible) : compatible;
  }

  for (const [dim, pole] of Object.entries(bigFiveSelections)) {
    const key = `${pole === 'high' ? 'High' : 'Low'} ${dim}`;
    const compatible = new Set((FRAMEWORK_FAMILY_MAP.bigFive[key] ?? []) as ArchetypeFamily[]);
    families = families ? intersection(families, compatible) : compatible;
  }

  const result = new Map<string, MatchTier>();

  for (const archetypeKey of ALL_48) {
    const [family, sub] = archetypeKey.split('/');
    if (!families?.has(family as ArchetypeFamily)) {
      result.set(archetypeKey, 'incompatible');
      continue;
    }

    const rules = SUB_ARCHETYPE_RULES[family as ArchetypeFamily]
      ?.find(r => r.subArchetype === sub);

    const mbtiMatch = selections.mbti
      ? rules?.mbtiAffinity.includes(selections.mbti) ?? false
      : null;

    const ennVal = selections.enneagram;
    const ennNum = ennVal ? parseInt(ennVal.replace('Type ', ''), 10) : null;
    const ennMatch = ennNum !== null
      ? rules?.enneagramAffinity.includes(ennNum) ?? false
      : null;

    const hasAffinityData = mbtiMatch !== null || ennMatch !== null;
    const anyAffinityMatch = mbtiMatch === true || ennMatch === true;

    result.set(archetypeKey, (!hasAffinityData || anyAffinityMatch) ? 'strong' : 'weak');
  }

  return result;
}

export function getValidFrameworkValues(
  framework: PersonalityFramework,
  currentSelections: Partial<Record<PersonalityFramework, string>>,
  bigFiveSelections: Partial<Record<BigFiveDimension, BigFivePole>>,
): string[] {
  const otherSelections = { ...currentSelections };
  delete otherSelections[framework];

  return (ALL_FRAMEWORK_VALUES[framework] as readonly string[]).filter(value => {
    const test = { ...otherSelections, [framework]: value };
    const matches = getCompatibleArchetypes(test, bigFiveSelections);
    return [...matches.values()].some(t => t !== 'incompatible');
  });
}

export function getValidBigFivePoles(
  dimension: BigFiveDimension,
  currentBigFive: Partial<Record<BigFiveDimension, BigFivePole>>,
  frameworkSelections: Partial<Record<PersonalityFramework, string>>,
): Set<BigFivePole | null> {
  const otherBigFive = { ...currentBigFive };
  delete otherBigFive[dimension];

  const valid = new Set<BigFivePole | null>([null]);
  for (const pole of ['high', 'low'] as const) {
    const test = { ...otherBigFive, [dimension]: pole };
    const matches = getCompatibleArchetypes(frameworkSelections, test);
    if ([...matches.values()].some(t => t !== 'incompatible')) {
      valid.add(pole);
    }
  }
  return valid;
}
