import type { GraphModel } from '@casehubio/graph-core';

export type Phase = 'classification' | 'sizing' | 'internal-layout' | 'container-positioning' | 'edge-routing';

export interface Fact {
  readonly subject: string;
  readonly predicate: string;
  readonly value?: unknown;
}

export interface FactBase {
  assert(subject: string, predicate: string, value?: unknown): void;
  has(subject: string, predicate: string): boolean;
  get(subject: string, predicate: string): unknown;
  query(predicate: string): Array<{ subject: string; value: unknown }>;
  facts(): readonly Fact[];
}

export interface ClassificationRule {
  readonly id: string;
  classify(model: GraphModel, facts: FactBase): void;
}

export interface LayoutRule {
  readonly id: string;
  readonly phase: Exclude<Phase, 'classification'>;
  readonly group?: string;
  readonly priority: number;
  readonly scope: 'global' | 'container' | 'edge';
  readonly requires?: readonly string[];
  readonly guarantees?: readonly string[];
  precondition(facts: FactBase): boolean;
  apply(nodes: LayoutNode[], edges: LayoutEdge[], facts: FactBase): void;
}

export interface HardConstraint {
  readonly id: string;
  check(nodes: readonly LayoutNode[], edges: readonly LayoutEdge[]): LayoutViolation[];
}

export interface LayoutNode {
  id: string;
  type?: string | undefined;
  parentId?: string | undefined;
  position: { x: number; y: number };
  width?: number | undefined;
  height?: number | undefined;
  style?: Record<string, unknown> | undefined;
}

export interface LayoutEdge {
  id: string;
  type?: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface LayoutViolation {
  rule: string;
  severity: 'hard' | 'soft';
  message: string;
  nodeIds?: string[];
  edgeIds?: string[];
}

export interface CompositionError {
  type: 'missing-provider' | 'circular-dependency' | 'conflicting-guarantees';
  message: string;
  ruleIds: string[];
}

export interface CompositionReport {
  valid: boolean;
  errors: CompositionError[];
  warnings: string[];
  selectedRules: Map<Phase, LayoutRule[]>;
}

export interface RuleSelection {
  group: string;
  candidates: Array<{ rule: string; applicable: boolean; priority: number }>;
  selected: string;
  reason: string;
}

export interface LayoutExplanation {
  classifications: readonly Fact[];
  ruleSelections: RuleSelection[];
  violations: LayoutViolation[];
}

export type LayoutStrategy =
  | 'star' | 'tree' | 'circular' | 'layered' | 'nested'
  | 'hub-spoke' | 'flow' | 'radial' | 'grid' | 'force';

export type ArchetypeName =
  | 'simple-structure'
  | 'hierarchy'
  | 'professional-bureaucracy'
  | 'tiered-escalation'
  | 'divisional-holarchy'
  | 'federation'
  | 'pipeline'
  | 'coalition'
  | 'matrix'
  | 'market';

export interface ArchetypeHint {
  archetype: ArchetypeName;
  confidence: 'high' | 'medium' | 'low';
  layout: LayoutStrategy;
}
