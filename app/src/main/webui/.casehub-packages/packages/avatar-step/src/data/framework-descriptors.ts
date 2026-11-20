export const FRAMEWORK_DESCRIPTORS: Record<string, string> = {
  // MBTI
  'INTJ': 'analytical and strategic',
  'INTP': 'logical and inventive',
  'ENTJ': 'commanding and decisive',
  'ENTP': 'innovative and resourceful',
  'INFJ': 'insightful and principled',
  'INFP': 'idealistic and empathetic',
  'ENFJ': 'charismatic and mentoring',
  'ENFP': 'enthusiastic and imaginative',
  'ISTJ': 'methodical and dependable',
  'ISFJ': 'nurturing and conscientious',
  'ESTJ': 'organized and authoritative',
  'ESFJ': 'supportive and community-minded',
  'ISTP': 'pragmatic and adaptable',
  'ISFP': 'artistic and sensitive',
  'ESTP': 'bold and action-oriented',
  'ESFP': 'spontaneous and engaging',
  // Enneagram
  'Type 1': 'principled',
  'Type 2': 'caring',
  'Type 3': 'driven',
  'Type 4': 'expressive',
  'Type 5': 'investigative',
  'Type 6': 'vigilant',
  'Type 7': 'enthusiastic',
  'Type 8': 'assertive',
  'Type 9': 'harmonizing',
  // DISC
  'D': 'decisive',
  'I': 'influential',
  'S': 'steady',
  'C': 'conscientious',
  // SDI
  'Blue': 'altruistic',
  'Red': 'assertive',
  'Green': 'analytical',
  'Hub': 'flexible',
};

import type { BigFiveDimension } from './compatibility-matrix.js';
import type { PersonalityFramework } from './compatibility-matrix.js';

export const BIG_FIVE_DIMS: BigFiveDimension[] = ['O', 'C', 'E', 'A', 'N'];
export const BIG_FIVE_LABELS: Record<BigFiveDimension, string> = {
  O: 'Openness', C: 'Conscientiousness', E: 'Extraversion', A: 'Agreeableness', N: 'Neuroticism',
};
export const FRAMEWORK_LABELS: Record<PersonalityFramework, string> = {
  mbti: 'MBTI', enneagram: 'Enneagram', disc: 'DISC', belbin: 'Belbin', sdi: 'SDI',
};

export function buildSummaryText(
  mbti: string | undefined,
  enneagram: string | undefined,
  disc: string | undefined,
  roleLabel: string,
): string {
  const parts: string[] = [];
  if (mbti && FRAMEWORK_DESCRIPTORS[mbti]) parts.push(FRAMEWORK_DESCRIPTORS[mbti]);
  if (enneagram && FRAMEWORK_DESCRIPTORS[enneagram]) parts.push(FRAMEWORK_DESCRIPTORS[enneagram]);

  const discDesc = disc && FRAMEWORK_DESCRIPTORS[disc];

  if (parts.length === 0 && !discDesc) return '';

  const cleanLabel = roleLabel.replace(/^the\s+/i, '');
  const joined = parts.join(', ');
  const article = /^[aeiou]/i.test(joined) ? 'An' : 'A';
  let text = article + ' ' + joined + ' ' + cleanLabel.toLowerCase();
  if (discDesc) text += ` with ${discDesc} drive`;
  return text;
}
