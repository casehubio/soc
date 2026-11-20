export type TaskNodeSnapshot = LeafTaskSnapshot | CompoundTaskSnapshot;

export interface LeafTaskSnapshot {
  readonly kind: 'leaf';
  readonly id: string;
  readonly description?: string;
  readonly executorName?: string;
}

export interface CompoundTaskSnapshot {
  readonly kind: 'compound';
  readonly id: string;
  readonly name: string;
  readonly methods: readonly DecompositionMethodSnapshot[];
}

export interface DecompositionMethodSnapshot {
  readonly guardLabel?: string;
  readonly strategyId: string;
  readonly children: readonly TaskNodeSnapshot[];
}

export interface DecompositionSnapshot {
  readonly root: TaskNodeSnapshot;
  readonly timestamp: string;
}
