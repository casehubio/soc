import type { GraphModel, GraphNode, GraphEdge } from '@casehubio/graph-core';
import type { StencilDescriptor } from '../registry/stencil-registry.js';

export type StencilTypeInfo = Pick<StencilDescriptor, 'type' | 'label' | 'icon'> & {
  readonly group?: string;
};

export type DeleteStrategy =
  | { readonly type: 'auto-join' }
  | { readonly type: 'disconnect' }
  | { readonly type: 'prompt'; readonly options: readonly DeleteOption[] }
  | { readonly type: 'cascade' };

export interface DeleteOption {
  readonly label: string;
  readonly strategy: 'join' | 'disconnect';
  readonly targetNodeId?: string;
}

export interface EditPolicy {
  canConnect(source: GraphNode, target: GraphNode, model: GraphModel, edgeType?: string): boolean;
  getInsertableTypes(edge: GraphEdge, model: GraphModel): StencilTypeInfo[];
  getCreatableTypes(nearNode: GraphNode | null, model: GraphModel): StencilTypeInfo[];
  canDelete(node: GraphNode, model: GraphModel): boolean;
  getDeleteStrategy(node: GraphNode, model: GraphModel, deletionSet?: ReadonlySet<string>): DeleteStrategy;
  canSpliceOntoEdge?(edge: GraphEdge, node: GraphNode, model: GraphModel): boolean;
  getAddPlacement?(nodeType: string, model: GraphModel): AddPlacement;
}

export type AddPlacement =
  | { readonly type: 'detached' }
  | { readonly type: 'splitEdge'; readonly edgeId: string };

export type SourceCleanupStrategy = 'auto-join' | 'disconnect';

export interface MultiSelectState {
  readonly selectedNodeIds: ReadonlySet<string>;
  readonly mode: 'none' | 'constrained' | 'unconstrained';
  readonly boundaryInput: GraphEdge | null;
  readonly boundaryOutput: GraphEdge | null;
}

export type DragSubject =
  | { readonly type: 'single'; readonly nodeId: string }
  | { readonly type: 'segment'; readonly nodeIds: ReadonlySet<string>;
      readonly entryNodeId: string; readonly exitNodeId: string;
      readonly boundaryInput: GraphEdge; readonly boundaryOutput: GraphEdge };

export type GraphEdit =
  | { readonly type: 'addNode'; readonly nodeType: string; readonly id?: string; readonly properties?: Readonly<Record<string, unknown>> }
  | { readonly type: 'removeNode'; readonly nodeId: string; readonly strategy: DeleteStrategy }
  | { readonly type: 'addEdge'; readonly sourceId: string; readonly targetId: string; readonly edgeType?: string }
  | { readonly type: 'removeEdge'; readonly edgeId: string }
  | { readonly type: 'reconnectEdge'; readonly edgeId: string; readonly endpoints: { readonly source?: string; readonly target?: string } }
  | { readonly type: 'splitEdge'; readonly edgeId: string; readonly insertNodeType: string }
  | { readonly type: 'moveNodeToEdge'; readonly nodeId: string; readonly edgeId: string; readonly sourceCleanup: SourceCleanupStrategy }
  | { readonly type: 'removeSegment'; readonly nodeIds: ReadonlySet<string>; readonly bridgeEdge?: { readonly sourceId: string; readonly targetId: string; readonly edgeType: string } }
  | { readonly type: 'moveSegmentToEdge'; readonly nodeIds: ReadonlySet<string>; readonly entryNodeId: string; readonly exitNodeId: string; readonly edgeId: string; readonly bridgeEdge: { readonly sourceId: string; readonly targetId: string; readonly edgeType: string } }
  | { readonly type: 'compound'; readonly edits: readonly GraphEdit[] };
