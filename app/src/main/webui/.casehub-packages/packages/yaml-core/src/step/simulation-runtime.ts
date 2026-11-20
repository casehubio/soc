export type DataRealism =
  | 'GARBAGE' | 'PLACEHOLDER' | 'STRUCTURALLY_VALID'
  | 'DOMAIN_PLAUSIBLE' | 'RECORDED_REAL';

export interface JournalEntry {
  readonly qualifiedName: string;
  readonly tenancyId: string;
  readonly input: unknown;
  readonly output: unknown;
  readonly timestamp: number;
  readonly dataRealism: DataRealism;
}

export interface CorpusDatum {
  input: unknown;
  output: unknown;
  realism?: DataRealism;
}

export type CorpusEntry =
  | { file: string }
  | { inline: Record<string, CorpusDatum[]> };

export interface SimulationConfig {
  strategies: Record<string, string>;
  corpus: CorpusEntry[];
  capture: string[];
  fallthroughRealism?: Record<string, DataRealism>;
}

export class InvocationJournal {
  private readonly _entries: JournalEntry[] = [];

  record(qualifiedName: string, tenancyId: string, input: unknown,
         output: unknown, dataRealism: DataRealism): void {
    this._entries.push({
      qualifiedName, tenancyId, input, output,
      timestamp: Date.now(), dataRealism,
    });
  }

  entries(): readonly JournalEntry[] { return this._entries; }

  entriesFor(qualifiedName: string): readonly JournalEntry[] {
    return this._entries.filter(e => e.qualifiedName === qualifiedName);
  }

  countFor(qualifiedName: string): number {
    return this._entries.filter(e => e.qualifiedName === qualifiedName).length;
  }
}

export class SimulationOverlay {
  readonly journal = new InvocationJournal();
  private readonly sequentialCounters = new Map<string, number>();

  constructor(readonly config: SimulationConfig) {}

  inlineCorpusFor(qualifiedName: string): CorpusDatum[] {
    const result: CorpusDatum[] = [];
    for (const entry of this.config.corpus) {
      if ('inline' in entry && entry.inline[qualifiedName]) {
        result.push(...entry.inline[qualifiedName]);
      }
    }
    return result;
  }

  nextSequential(qualifiedName: string): CorpusDatum | undefined {
    const entries = this.inlineCorpusFor(qualifiedName);
    if (entries.length === 0) return undefined;
    const idx = this.sequentialCounters.get(qualifiedName) ?? 0;
    this.sequentialCounters.set(qualifiedName, idx + 1);
    return entries[idx % entries.length];
  }
}

export class SimulationRuntime {
  private readonly overlayStack: SimulationOverlay[] = [];

  pushOverlay(config: SimulationConfig): SimulationOverlay {
    const overlay = new SimulationOverlay(config);
    this.overlayStack.push(overlay);
    return overlay;
  }

  popOverlay(overlay: SimulationOverlay): void {
    const idx = this.overlayStack.indexOf(overlay);
    if (idx >= 0) this.overlayStack.splice(idx, 1);
  }

  popAll(): void { this.overlayStack.length = 0; }

  hasActiveOverlay(): boolean { return this.overlayStack.length > 0; }

  strategyFor(qualifiedName: string): string | undefined {
    for (let i = this.overlayStack.length - 1; i >= 0; i--) {
      const s = this.overlayStack[i]!.config.strategies[qualifiedName];
      if (s !== undefined) return s;
    }
    return undefined;
  }

  activeJournal(): InvocationJournal | undefined {
    return this.overlayStack.length > 0
      ? this.overlayStack[this.overlayStack.length - 1]!.journal
      : undefined;
  }

  recordJournal(qualifiedName: string, tenancyId: string, input: unknown,
                output: unknown, dataRealism: DataRealism): void {
    const journal = this.activeJournal();
    if (journal) journal.record(qualifiedName, tenancyId, input, output, dataRealism);
  }

  fallthroughRealism(qualifiedName: string): DataRealism {
    for (let i = this.overlayStack.length - 1; i >= 0; i--) {
      const fr = this.overlayStack[i]!.config.fallthroughRealism;
      if (fr && fr[qualifiedName] !== undefined) return fr[qualifiedName]!;
    }
    return 'RECORDED_REAL';
  }

  resolve(qualifiedName: string, input: unknown): { output: unknown; realism: DataRealism } | undefined {
    for (let i = this.overlayStack.length - 1; i >= 0; i--) {
      const overlay = this.overlayStack[i]!;
      const strategy = overlay.config.strategies[qualifiedName];
      if (strategy === undefined) continue;

      switch (strategy) {
        case 'sequential': {
          const entry = overlay.nextSequential(qualifiedName);
          if (entry) return { output: entry.output, realism: entry.realism ?? 'STRUCTURALLY_VALID' };
          return { output: {}, realism: 'PLACEHOLDER' };
        }
        case 'key-lookup': {
          const corpus = overlay.inlineCorpusFor(qualifiedName);
          const match = corpus.find(e => inputContains(input, e.input));
          if (match) return { output: match.output, realism: match.realism ?? 'DOMAIN_PLAUSIBLE' };
          return { output: {}, realism: 'PLACEHOLDER' };
        }
        case 'passthrough':
          return undefined;
        default:
          return { output: {}, realism: 'PLACEHOLDER' };
      }
    }
    return undefined;
  }

  allEntriesFor(qualifiedName: string): readonly JournalEntry[] {
    const result: JournalEntry[] = [];
    for (const overlay of this.overlayStack) {
      result.push(...overlay.journal.entriesFor(qualifiedName));
    }
    return result;
  }
}

export function inputContains(actual: unknown, pattern: unknown): boolean {
  if (pattern === null || pattern === undefined) return true;
  if (typeof pattern !== 'object' || typeof actual !== 'object') return actual === pattern;
  if (actual === null) return false;
  const patObj = pattern as Record<string, unknown>;
  const actObj = actual as Record<string, unknown>;
  for (const key of Object.keys(patObj)) {
    if (!inputContains(actObj[key], patObj[key])) return false;
  }
  return true;
}
