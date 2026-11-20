export {
  registerStencil,
  deregisterStencil,
  getStencil,
  getAllStencils,
  registerEdgeType,
  deregisterEdgeType,
  getEdgeDescriptor,
  getNodeTypes,
  getRegisteredStyles,
  clearRegistry,
} from './registry/stencil-registry.js';
export type { StencilDescriptor, EdgeDescriptor, EdgeMarker } from './registry/stencil-registry.js';
export { GraphCanvas } from './bridge/GraphCanvas.js';
export { PagesGraphCanvas } from './bridge/PagesGraphCanvas.js';
export { computeElkLayout } from './layout/elk-layout.js';
export type { ElkLayoutOptions, ElkLayoutResult, NodeLayout } from './layout/elk-layout.js';
export { computeStackColumnLayout } from './layout/stack-column-layout.js';
export type { StackColumnOptions } from './layout/stack-column-layout.js';
export { computeRadialLayout } from './layout/radial-layout.js';
export type { RadialLayoutOptions } from './layout/radial-layout.js';

// ─── Layout Rule Engine ─────────────────────────────────────────────
export { LayoutEngine } from './layout/engine.js';
export type { PreLayoutResult, PostLayoutResult } from './layout/engine.js';
export { createFactBase } from './layout/fact-base.js';
export { defaultClassifiers } from './layout/classifiers.js';
export {
  horizontalInternalRule, verticalStackingRule, positionAwareHandlesRule,
  noContainerOverlapConstraint, childContainmentConstraint, noSiblingOverlapConstraint,
  nodeWidth, nodeHeight, INTERNAL_PAD, HEADER_HEIGHT,
} from './layout/layout-rules.js';
export type {
  Phase, Fact, FactBase, ClassificationRule, LayoutRule, HardConstraint,
  CompositionReport, CompositionError, LayoutExplanation, RuleSelection,
  LayoutNode, LayoutEdge, LayoutViolation,
  LayoutStrategy, ArchetypeName, ArchetypeHint,
} from './layout/types.js';
export { toReactFlowNode, toReactFlowEdge, toReactFlowGraph } from './mapping.js';
export {
  createStencilNodeComponent,
} from './stencil-wrapper.js';
export type {
  StencilTemplate,
  StencilRenderFn,
} from './stencil-wrapper.js';

export { createWorkStencilRenderFn, toWorkStencilDescriptor } from './work-stencil-renderer.js';
export { validateEdgeRouting } from './edge-routing-validator.js';
export type { ValidationResult } from './edge-routing-validator.js';
export { defaultEditPolicy } from './editing/edit-policy.js';
export { applyGraphEdit } from './editing/apply-graph-edit.js';
export type { EditPolicy, GraphEdit, StencilTypeInfo, DeleteStrategy, DeleteOption, SourceCleanupStrategy, AddPlacement } from './editing/types.js';
export { createNodeMoveCoordinator } from './editing/node-move-coordinator.js';
export type { NodeMoveCoordinator, NodeMoveCoordinatorOptions, DragEndResult } from './editing/node-move-coordinator.js';
export { defaultCanSpliceOntoEdge, buildProjectedModel } from './editing/splice-validation.js';
export { exportDiagram, computeNodeBounds, computeExportViewport } from './diagram-export.js';
export type { ExportFormat, ExportBounds, ExportViewport } from './diagram-export.js';
