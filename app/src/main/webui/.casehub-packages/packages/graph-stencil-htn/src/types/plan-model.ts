import type { CompletionSemantics } from './plan-item.js';

export interface AgendaItem {
  readonly planItemId: string;
  readonly bindingName: string;
  readonly status: string;
  readonly description?: string;
}

export interface SubCaseSnapshot {
  readonly caseDefinition: string;
  readonly namespace: string;
  readonly status?: string;
}

export interface CasePlanModelSnapshot {
  readonly caseId: string;
  readonly agenda: readonly AgendaItem[];
  readonly focus?: string;
  readonly focusRationale?: string;
  readonly resourceBudget: Readonly<Record<string, unknown>>;
  readonly subCases: readonly SubCaseSnapshot[];
  readonly compounds: readonly CompoundStatusSnapshot[];
  readonly timestamp: string;
}

export interface CompoundStatusSnapshot {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly childCount: number;
  readonly completedCount: number;
  readonly completion: CompletionSemantics;
}
