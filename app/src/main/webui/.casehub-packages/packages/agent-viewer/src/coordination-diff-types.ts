import type { PhaseItem } from './coordination-types.js';

export type DiffStatus = 'added' | 'removed' | 'modified' | 'unchanged';

export interface FieldChange {
  field: string;
  oldValue: string | number | undefined;
  newValue: string | number | undefined;
}

export interface DiffAnnotation {
  status: DiffStatus;
  changes?: FieldChange[];
}

export interface AnnotatedPhaseItem {
  phase: PhaseItem;
  diff: DiffAnnotation;
}

export interface DiffSummary {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
  details: string[];
}

export interface DiffResult {
  name: string;
  phases: AnnotatedPhaseItem[];
  summary: DiffSummary;
}
