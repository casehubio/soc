import type { GraphNode, GraphModel, GraphEdge } from '@casehubio/graph-core';
import { getGrammar, inboundEdges, outboundEdges, nodeById } from '@casehubio/graph-core';
import type { EditPolicy, StencilTypeInfo, DeleteStrategy } from '@casehubio/graph-renderer';

const CREATABLE_TYPES: readonly StencilTypeInfo[] = [
  { type: 'binding', label: 'Binding', icon: 'link' },
  { type: 'worker', label: 'Worker', icon: 'cpu' },
  { type: 'milestone', label: 'Milestone', icon: 'flag' },
  { type: 'goal', label: 'Goal', icon: 'target' },
];

export function createCaseEditPolicy(): EditPolicy {
  const policy: EditPolicy = {
    canConnect(source: GraphNode, target: GraphNode, model: GraphModel, _edgeType?: string): boolean {
      const grammar = getGrammar(source.type);
      if (!grammar) return false;

      const { outbound } = grammar.connections;
      if (outbound.max === 0) return false;
      if (outbound.allowedTo.length > 0 && !outbound.allowedTo.includes(target.type)) {
        return false;
      }
      if (outboundEdges(model, source.id).length >= outbound.max) {
        return false;
      }

      const targetGrammar = getGrammar(target.type);
      if (targetGrammar) {
        const { inbound } = targetGrammar.connections;
        if (inbound.allowedFrom.length > 0 && !inbound.allowedFrom.includes(source.type)) {
          return false;
        }
        if (inboundEdges(model, target.id).length >= inbound.max) {
          return false;
        }
      }

      return true;
    },

    getInsertableTypes(_edge: GraphEdge, _model: GraphModel): StencilTypeInfo[] {
      return [];
    },

    getCreatableTypes(_nearNode: GraphNode | null, _model: GraphModel): StencilTypeInfo[] {
      return [...CREATABLE_TYPES];
    },

    canDelete(node: GraphNode, _model: GraphModel): boolean {
      return node.type !== 'subcase';
    },

    getDeleteStrategy(node: GraphNode, model: GraphModel, _deletionSet?: ReadonlySet<string>): DeleteStrategy {
      if (node.type === 'milestone' || node.type === 'goal') {
        return { type: 'disconnect' };
      }

      const inbound = inboundEdges(model, node.id);
      const outbound = outboundEdges(model, node.id);

      if (inbound.length === 1 && outbound.length === 1) {
        const predecessor = nodeById(model, inbound[0]!.source);
        const successor = nodeById(model, outbound[0]!.target);
        if (predecessor && successor && policy.canConnect(predecessor, successor, model)) {
          return { type: 'auto-join' };
        }
      }

      return { type: 'disconnect' };
    },
  };

  return policy;
}
