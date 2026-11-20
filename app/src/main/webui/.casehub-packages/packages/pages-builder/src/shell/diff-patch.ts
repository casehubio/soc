import type { ChangeSpec } from '@codemirror/state';

export function computeMinimalChanges(before: string, after: string): ChangeSpec[] {
  if (before === after) return [];

  const minLen = Math.min(before.length, after.length);
  let prefixLen = 0;
  while (prefixLen < minLen && before[prefixLen] === after[prefixLen]) {
    prefixLen++;
  }

  let suffixLen = 0;
  while (suffixLen < before.length - prefixLen
    && suffixLen < after.length - prefixLen
    && before[before.length - 1 - suffixLen] === after[after.length - 1 - suffixLen]) {
    suffixLen++;
  }

  const from = prefixLen;
  const to = before.length - suffixLen;
  const insert = after.substring(prefixLen, after.length - suffixLen);

  return [{ from, to: Math.max(from, to), insert }];
}
