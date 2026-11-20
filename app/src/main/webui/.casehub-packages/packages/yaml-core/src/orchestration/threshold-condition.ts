const PATTERN = /^(>=|>|<=|<)?\s*(\d+(?:\.\d+)?)\s+(\w+)$/;

export class ThresholdCondition {
  private constructor(
    readonly operator: string,
    readonly threshold: number,
    readonly metricName: string,
  ) {}

  static parse(input: string): ThresholdCondition {
    const m = input.trim().match(PATTERN);
    if (!m) throw new Error(`Invalid threshold condition: '${input}'`);
    const op = m[1] ?? '>=';
    const threshold = parseFloat(m[2]!);
    const metric = m[3]!;
    return new ThresholdCondition(op, threshold, metric);
  }

  test(value: number): boolean {
    switch (this.operator) {
      case '>=': return value >= this.threshold;
      case '>':  return value > this.threshold;
      case '<=': return value <= this.threshold;
      case '<':  return value < this.threshold;
      default: throw new Error(`Unknown operator: ${this.operator}`);
    }
  }
}
