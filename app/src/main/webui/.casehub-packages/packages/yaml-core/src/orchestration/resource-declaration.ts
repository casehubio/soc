export interface ResourceDeclaration {
  readonly concurrency: number;
}

export function parseResourceDeclaration(raw: unknown): ResourceDeclaration {
  if (typeof raw === 'number') {
    if (raw < 1) throw new Error(`concurrency must be >= 1, got: ${raw}`);
    return { concurrency: raw };
  }
  if (typeof raw === 'object' && raw !== null) {
    const map = raw as Record<string, unknown>;
    const concurrency = typeof map['concurrency'] === 'number' ? map['concurrency'] : 1;
    if (concurrency < 1) throw new Error(`concurrency must be >= 1, got: ${concurrency}`);
    return { concurrency };
  }
  return { concurrency: 1 };
}
