const UNITS = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
} as const;

const DURATION_RE = /^(\d+(?:\.\d+)?)(ms|s|m|h)$/;

export function parseDuration(input: string): number {
  const match = DURATION_RE.exec(input);
  if (!match) {
    throw new Error(`Invalid duration: '${input}'. Expected format: <number><unit> where unit is ms|s|m|h`);
  }
  const value = parseFloat(match[1]!);
  if (value < 0) {
    throw new Error(`Duration must not be negative: '${input}'`);
  }
  const unit = match[2] as keyof typeof UNITS;
  return Math.round(value * UNITS[unit]);
}
