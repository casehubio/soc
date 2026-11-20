export type PlanItemDefinition = PrimitivePlanItem | CompoundPlanItem;
export type PlanningDispatchMode = 'ORCHESTRATED' | 'CHOREOGRAPHED';
export type Participation = 'PARTICIPANT' | 'COMPANION';

export type CompletionSemantics =
  | { readonly kind: 'All' }
  | { readonly kind: 'MOfN'; readonly m: number }
  | { readonly kind: 'FirstWins' };

export interface PrimitivePlanItem {
  readonly kind: 'primitive';
  readonly id: string;
  readonly name: string;
  readonly executor: { readonly name: string; readonly description?: string };
  readonly entryCondition?: string;
}

export interface CompoundPlanItem {
  readonly kind: 'compound';
  readonly id: string;
  readonly name: string;
  readonly children: readonly PlanItemDefinition[];
  readonly planningStrategy?: string;
  readonly completion: CompletionSemantics;
  readonly dispatchMode: PlanningDispatchMode;
  readonly entryCondition?: string;
  readonly exitCondition?: string;
  readonly repeatable: boolean;
  readonly scopedBindings?: Readonly<Record<string, Participation>>;
}
