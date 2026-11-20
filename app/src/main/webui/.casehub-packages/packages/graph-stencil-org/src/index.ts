export type {
  OrgUnit, Membership, AgentRelationship, RelationshipKind,
  RelationshipScope, AttestationGrant, BehavioralSignal,
  AgentCapability, AgentGoal, AgentConstraint, OrgStructureYaml,
} from './types.js';
export { toOrgGraph } from './adapter/org-adapter.js';
export type { OrgAdapterResult } from './adapter/org-adapter.js';
export { registerOrgStencils } from './stencils/index.js';
export { renderOrgUnit, renderOrgAgent } from './stencils/index.js';
export { orgUnitSchema, orgAgentSchema } from './schemas/index.js';
export {
  applyOrgPropertyEdit, addOrgUnit, removeOrgUnit,
  addMember, removeMember, addRelationship, removeRelationship,
} from './adapter/yaml-editor.js';
export { createOrgEditPolicy } from './editing/org-edit-policy.js';
export type { AgentDescriptor, DispositionAxes, OrgAgentNodeData, OrgUnitNodeData } from './types.js';
export { enrichWithDescriptors } from './adapter/enrichment.js';
export { computeDerivedData } from './adapter/derived-data.js';
export type { DerivedOrgData, SupervisionEntry } from './adapter/derived-data.js';
export { resolveKindColors, DEFAULT_KIND_PALETTE } from './adapter/kind-colors.js';
export { applyCollapsedUnits } from './adapter/collapse.js';
export { applyOrgEdgeLabels } from './adapter/edge-labels.js';
export { applySelectionHighlight } from './adapter/selection-highlight.js';
export { extractEgoSubgraph } from './adapter/ego-subgraph.js';
export { toOrgYaml } from './adapter/to-org-yaml.js';
export type { RosterEntry } from './adapter/to-org-yaml.js';

// ─── Layout Rule Engine ─────────────────────────────────────────────
export { OrgLayoutEngine } from './layout/engine.js';
export type { PreLayoutResult, PostLayoutResult } from './layout/engine.js';
export { orgClassificationRules } from './layout/classification-rules.js';
export { sizingClassifier, orgLayoutRules, orgHardConstraints, AGENT_WIDTH, DISPOSITION_SHORT_NAMES } from './layout/layout-rules.js';
export { createFactBase } from './layout/fact-base.js';
export type {
  Phase, Fact, FactBase, ClassificationRule, LayoutRule, HardConstraint,
  CompositionReport, LayoutExplanation, RuleSelection,
  LayoutNode, LayoutEdge, LayoutViolation,
  ArchetypeHint, ArchetypeName, OrgLayoutStrategy,
  OrgElkLayoutOptions,
} from './layout/types.js';
