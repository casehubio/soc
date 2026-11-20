import type { PersonalityProfile } from '@casehubio/mosaic-core';
import type { BigFiveDimension, BigFivePole } from './compatibility-matrix.js';

export type CanonicalAxis = 'socialOrientation' | 'ruleFollowing' | 'riskAppetite' | 'autonomy' | 'conflictMode';

export interface AxisScore {
  axis: CanonicalAxis;
  label: string;
  lowLabel: string;
  highLabel: string;
  score: number;
  contributors: string[];
}

const AXIS_META: Record<CanonicalAxis, { label: string; low: string; high: string }> = {
  socialOrientation: { label: 'Social', low: 'Autonomous', high: 'Collaborative' },
  ruleFollowing:     { label: 'Rules', low: 'Flexible', high: 'Strict' },
  riskAppetite:      { label: 'Risk', low: 'Cautious', high: 'Bold' },
  autonomy:          { label: 'Autonomy', low: 'Dependent', high: 'Independent' },
  conflictMode:      { label: 'Conflict', low: 'Accommodating', high: 'Competing' },
};

type Signal = [CanonicalAxis, number];

function mbtiSignals(type: string): Signal[] {
  if (type.length !== 4) return [];
  const signals: Signal[] = [];
  const ei = type[0], sn = type[1], tf = type[2], jp = type[3];
  signals.push(['socialOrientation', ei === 'E' ? 0.7 : -0.7]);
  signals.push(['riskAppetite', sn === 'N' ? 0.5 : -0.5]);
  signals.push(['conflictMode', tf === 'T' ? 0.6 : -0.6]);
  signals.push(['ruleFollowing', jp === 'J' ? 0.6 : -0.6]);
  signals.push(['autonomy', ei === 'I' ? 0.4 : -0.3]);
  return signals;
}

const ENNEAGRAM_SIGNALS: Record<string, Signal[]> = {
  'Type 1': [['ruleFollowing', 0.8], ['conflictMode', 0.3]],
  'Type 2': [['socialOrientation', 0.7], ['conflictMode', -0.6]],
  'Type 3': [['riskAppetite', 0.5], ['conflictMode', 0.4]],
  'Type 4': [['autonomy', 0.5], ['riskAppetite', 0.2]],
  'Type 5': [['autonomy', 0.8], ['riskAppetite', -0.4]],
  'Type 6': [['ruleFollowing', 0.5], ['riskAppetite', -0.6]],
  'Type 7': [['riskAppetite', 0.8], ['ruleFollowing', -0.7]],
  'Type 8': [['conflictMode', 0.8], ['riskAppetite', 0.6]],
  'Type 9': [['conflictMode', -0.7], ['socialOrientation', 0.3]],
};

const DISC_SIGNALS: Record<string, Signal[]> = {
  'D': [['conflictMode', 0.8], ['riskAppetite', 0.7], ['autonomy', 0.5]],
  'I': [['socialOrientation', 0.8], ['ruleFollowing', -0.5], ['riskAppetite', 0.3]],
  'S': [['conflictMode', -0.7], ['riskAppetite', -0.6], ['ruleFollowing', 0.3]],
  'C': [['ruleFollowing', 0.8], ['riskAppetite', -0.5], ['autonomy', 0.3]],
};

const SDI_SIGNALS: Record<string, Signal[]> = {
  'Blue': [['conflictMode', -0.7], ['socialOrientation', 0.6]],
  'Red': [['conflictMode', 0.7], ['riskAppetite', 0.6], ['autonomy', 0.3]],
  'Green': [['autonomy', 0.7], ['riskAppetite', -0.3], ['ruleFollowing', 0.4]],
  'Hub': [['ruleFollowing', -0.3], ['socialOrientation', 0.3]],
};

const BELBIN_SIGNALS: Record<string, Signal[]> = {
  'Plant': [['autonomy', 0.6], ['riskAppetite', 0.4]],
  'Shaper': [['conflictMode', 0.6], ['riskAppetite', 0.5]],
  'Monitor Evaluator': [['ruleFollowing', 0.5], ['riskAppetite', -0.3]],
  'Co-ordinator': [['socialOrientation', 0.6], ['ruleFollowing', 0.3]],
  'Teamworker': [['conflictMode', -0.5], ['socialOrientation', 0.5]],
  'Implementer': [['ruleFollowing', 0.6], ['riskAppetite', -0.3]],
  'Completer-Finisher': [['ruleFollowing', 0.7], ['riskAppetite', -0.5]],
  'Specialist': [['autonomy', 0.6], ['ruleFollowing', 0.3]],
  'Resource Investigator': [['socialOrientation', 0.7], ['riskAppetite', 0.4]],
};

function bigFiveSignals(bigFive: Partial<Record<BigFiveDimension, BigFivePole>>): Signal[] {
  const signals: Signal[] = [];
  if (bigFive.O) signals.push(['riskAppetite', bigFive.O === 'high' ? 0.6 : -0.5]);
  if (bigFive.C) signals.push(['ruleFollowing', bigFive.C === 'high' ? 0.7 : -0.6]);
  if (bigFive.E) signals.push(['socialOrientation', bigFive.E === 'high' ? 0.7 : -0.6]);
  if (bigFive.A) signals.push(['conflictMode', bigFive.A === 'high' ? -0.7 : 0.6]);
  if (bigFive.N) signals.push(['autonomy', bigFive.N === 'high' ? -0.4 : 0.3]);
  return signals;
}

export function deriveDispositions(profile: PersonalityProfile): AxisScore[] {
  const axes: CanonicalAxis[] = ['socialOrientation', 'ruleFollowing', 'riskAppetite', 'autonomy', 'conflictMode'];
  const totals: Record<CanonicalAxis, { sum: number; count: number; contributors: string[] }> = {} as any;
  for (const a of axes) totals[a] = { sum: 0, count: 0, contributors: [] };

  function add(signals: Signal[], source: string) {
    for (const [axis, value] of signals) {
      totals[axis].sum += value;
      totals[axis].count++;
      totals[axis].contributors.push(source);
    }
  }

  if (profile.mbti) add(mbtiSignals(profile.mbti), `MBTI ${profile.mbti}`);
  if (profile.enneagram) add(ENNEAGRAM_SIGNALS[profile.enneagram] ?? [], `${profile.enneagram}`);
  if (profile.disc) add(DISC_SIGNALS[profile.disc] ?? [], `DISC ${profile.disc}`);
  if (profile.sdi) add(SDI_SIGNALS[profile.sdi] ?? [], `SDI ${profile.sdi}`);
  if (profile.belbin?.primary) add(BELBIN_SIGNALS[profile.belbin.primary] ?? [], `Belbin ${profile.belbin.primary}`);
  if (profile.bigFive) add(bigFiveSignals(profile.bigFive), 'Big Five');

  return axes.map(axis => {
    const t = totals[axis];
    const score = t.count > 0 ? Math.max(-1, Math.min(1, t.sum / t.count)) : 0;
    const meta = AXIS_META[axis];
    return { axis, label: meta.label, lowLabel: meta.low, highLabel: meta.high, score, contributors: t.contributors };
  });
}

export interface BehavioralTendency {
  name: string;
  description: string;
  strength: 'strong' | 'moderate' | 'mild';
  inferredFrom: string[];
}

interface TendencyRule {
  name: string;
  description: string;
  conditions: Array<{ axis: CanonicalAxis; direction: 'high' | 'low'; threshold: number }>;
}

const TENDENCY_RULES: TendencyRule[] = [
  { name: 'Skeptical', description: 'Questions assumptions and requests evidence before accepting claims', conditions: [{ axis: 'conflictMode', direction: 'high', threshold: 0.15 }, { axis: 'autonomy', direction: 'high', threshold: 0.05 }] },
  { name: 'Methodical', description: 'Follows systematic processes and prefers structured approaches', conditions: [{ axis: 'ruleFollowing', direction: 'high', threshold: 0.3 }, { axis: 'riskAppetite', direction: 'low', threshold: 0.1 }] },
  { name: 'Empathetic', description: 'Considers emotional impact and prioritises interpersonal harmony', conditions: [{ axis: 'conflictMode', direction: 'low', threshold: 0.3 }, { axis: 'socialOrientation', direction: 'high', threshold: 0.2 }] },
  { name: 'Decisive', description: 'Commits to clear recommendations and avoids hedging', conditions: [{ axis: 'riskAppetite', direction: 'high', threshold: 0.3 }, { axis: 'conflictMode', direction: 'high', threshold: 0.1 }] },
  { name: 'Collaborative', description: 'Seeks consensus and builds on others\' contributions', conditions: [{ axis: 'socialOrientation', direction: 'high', threshold: 0.4 }] },
  { name: 'Independent', description: 'Forms own assessments before consulting others', conditions: [{ axis: 'autonomy', direction: 'high', threshold: 0.4 }] },
  { name: 'Cautious', description: 'Flags risks and errs on the side of safety', conditions: [{ axis: 'riskAppetite', direction: 'low', threshold: 0.3 }] },
  { name: 'Bold', description: 'Explores novel approaches and embraces calculated risk', conditions: [{ axis: 'riskAppetite', direction: 'high', threshold: 0.4 }] },
  { name: 'Diplomatic', description: 'Navigates disagreement through compromise and tact', conditions: [{ axis: 'conflictMode', direction: 'low', threshold: 0.3 }, { axis: 'socialOrientation', direction: 'high', threshold: 0.1 }] },
  { name: 'Challenging', description: 'Pushes back on weak arguments and tests ideas rigorously', conditions: [{ axis: 'conflictMode', direction: 'high', threshold: 0.4 }] },
  { name: 'Structured', description: 'Creates order, enforces standards, and follows procedure', conditions: [{ axis: 'ruleFollowing', direction: 'high', threshold: 0.4 }] },
  { name: 'Adaptive', description: 'Adjusts approach based on circumstances rather than fixed rules', conditions: [{ axis: 'ruleFollowing', direction: 'low', threshold: 0.3 }] },
  { name: 'Nurturing', description: 'Develops others\' potential through patience and encouragement', conditions: [{ axis: 'conflictMode', direction: 'low', threshold: 0.4 }, { axis: 'socialOrientation', direction: 'high', threshold: 0.3 }] },
  { name: 'Analytical', description: 'Breaks problems into components and evaluates evidence systematically', conditions: [{ axis: 'ruleFollowing', direction: 'high', threshold: 0.2 }, { axis: 'autonomy', direction: 'high', threshold: 0.2 }] },
  { name: 'Persuasive', description: 'Influences through conviction and compelling reasoning', conditions: [{ axis: 'socialOrientation', direction: 'high', threshold: 0.3 }, { axis: 'conflictMode', direction: 'high', threshold: 0.2 }] },
  { name: 'Protective', description: 'Guards against threats and prioritises safety over speed', conditions: [{ axis: 'riskAppetite', direction: 'low', threshold: 0.4 }, { axis: 'ruleFollowing', direction: 'high', threshold: 0.2 }] },
  { name: 'Thorough', description: 'Does not skip steps or cut corners — checks everything before concluding', conditions: [{ axis: 'ruleFollowing', direction: 'high', threshold: 0.25 }, { axis: 'riskAppetite', direction: 'low', threshold: 0.2 }] },
  { name: 'Creative', description: 'Thinks laterally, generates novel ideas, and makes unexpected connections', conditions: [{ axis: 'riskAppetite', direction: 'high', threshold: 0.3 }, { axis: 'ruleFollowing', direction: 'low', threshold: 0.15 }, { axis: 'autonomy', direction: 'high', threshold: 0.1 }] },
  { name: 'Curious', description: 'Asks probing questions, explores deeply, and does not accept surface answers', conditions: [{ axis: 'riskAppetite', direction: 'high', threshold: 0.2 }, { axis: 'autonomy', direction: 'high', threshold: 0.2 }] },
  { name: 'Patient', description: 'Takes time with problems, avoids premature conclusions, and sits with ambiguity', conditions: [{ axis: 'riskAppetite', direction: 'low', threshold: 0.2 }, { axis: 'conflictMode', direction: 'low', threshold: 0.2 }] },
  { name: 'Direct', description: 'Says what needs saying without hedging, padding, or softening', conditions: [{ axis: 'conflictMode', direction: 'high', threshold: 0.25 }, { axis: 'ruleFollowing', direction: 'low', threshold: 0.1 }] },
  { name: 'Pragmatic', description: 'Focuses on practical outcomes and what works over theoretical elegance', conditions: [{ axis: 'ruleFollowing', direction: 'low', threshold: 0.05 }, { axis: 'riskAppetite', direction: 'low', threshold: 0.05 }] },
];

export const DISPOSITION_TIPS: Record<string, { low: string; high: string }> = {
  socialOrientation: { low: 'Prefers working independently, forms own assessments before consulting others', high: 'Seeks consensus, builds on others\' ideas, energised by teamwork' },
  ruleFollowing: { low: 'Adapts approach based on circumstances, questions established rules when they don\'t fit', high: 'Follows established procedures, enforces standards consistently, values predictability' },
  riskAppetite: { low: 'Flags risks proactively, errs on the side of safety, prefers proven approaches', high: 'Explores novel approaches, embraces calculated risk, comfortable with uncertainty' },
  autonomy: { low: 'Seeks guidance and validation, works within established hierarchies, defers to authority', high: 'Self-directed, forms independent judgments, resists external pressure on conclusions' },
  conflictMode: { low: 'Prioritises harmony, seeks compromise, avoids direct confrontation (Thomas-Kilmann accommodating)', high: 'Challenges directly, pushes back on weak arguments, stands ground under pressure (Thomas-Kilmann competing)' },
};

export function deriveTendencies(scores: AxisScore[]): BehavioralTendency[] {
  const scoreMap = Object.fromEntries(scores.map(s => [s.axis, s.score])) as Record<CanonicalAxis, number>;
  const result: BehavioralTendency[] = [];

  for (const rule of TENDENCY_RULES) {
    let totalExcess = 0;
    let allMet = true;
    const sources: string[] = [];
    for (const cond of rule.conditions) {
      const val = scoreMap[cond.axis] ?? 0;
      const effective = cond.direction === 'high' ? val : -val;
      if (effective < cond.threshold) { allMet = false; break; }
      totalExcess += effective - cond.threshold;
      const axisScore = scores.find(s => s.axis === cond.axis);
      const label = cond.direction === 'high' ? axisScore?.highLabel : axisScore?.lowLabel;
      sources.push(`${label ?? cond.axis} (${(val * 100).toFixed(0)}%)`);
    }
    if (!allMet) continue;
    const avgExcess = totalExcess / rule.conditions.length;
    const strength: 'strong' | 'moderate' | 'mild' = avgExcess > 0.3 ? 'strong' : avgExcess > 0.15 ? 'moderate' : 'mild';
    result.push({ name: rule.name, description: rule.description, strength, inferredFrom: sources });
  }

  result.sort((a, b) => {
    const order = { strong: 0, moderate: 1, mild: 2 };
    return order[a.strength] - order[b.strength];
  });
  return result;
}
