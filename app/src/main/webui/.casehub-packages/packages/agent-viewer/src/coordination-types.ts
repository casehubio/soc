export type ExpressionType = 'from' | 'param' | 'literal';

export interface ExpressionValue {
  raw: string;
  type: ExpressionType;
}

export interface CoordinationStepParams {
  [key: string]: string;
}

export interface CoordinationStep {
  action: string;
  target?: string;
  model?: string;
  outputFormat?: string;
  params?: CoordinationStepParams;
  channel?: string;
}

export type SwimLanes = Record<string, CoordinationStep[]>;

export interface MatchCase {
  pattern: string;
  step: CoordinationStep;
}

export interface MatchRouting {
  expression: string;
  cases: MatchCase[];
}

export type PhaseItem =
  | ({ type: 'step'; routing?: MatchRouting } & CoordinationStep)
  | { type: 'signal'; name: string; description?: string }
  | { type: 'quorum'; name: string; required: number; of: number }
  | { type: 'parallel'; lanes: SwimLanes };

export interface CoordinationPipeline {
  name: string;
  description?: string;
  agentCount?: number;
  barrierCount?: number;
  channelCount?: number;
  phases: PhaseItem[];
}

export interface DrillDownDetail {
  agentName: string;
  steps: CoordinationStep[];
}

export function parseExpression(raw: string): ExpressionValue {
  if (raw.startsWith('${params.'))
    return { raw, type: 'param' };
  if (raw.startsWith('${from.') || raw.match(/^\$\{[a-z][\w-]*\.\w/))
    return { raw, type: 'from' };
  return { raw, type: 'literal' };
}
