import type { GraphNode, GraphModel, GraphEdge } from '@casehubio/graph-core';
import { getGrammar, inboundEdges, outboundEdges, childrenOf, nodeById } from '@casehubio/graph-core';
import type { EditPolicy, StencilTypeInfo, DeleteStrategy } from '@casehubio/graph-renderer';

const UNIT_INFO: StencilTypeInfo = { type: 'org-unit', label: 'Unit', icon: '□' };
const AGENT_INFO: StencilTypeInfo = { type: 'org-agent', label: 'Agent', icon: '●' };

export function createOrgEditPolicy(): EditPolicy {
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

    getCreatableTypes(nearNode: GraphNode | null, _model: GraphModel): StencilTypeInfo[] {
      if (!nearNode) return [UNIT_INFO];
      if (nearNode.type === 'org-unit') return [UNIT_INFO, AGENT_INFO];
      return [UNIT_INFO];
    },

    canDelete(_node: GraphNode, _model: GraphModel): boolean {
      return true;
    },

    getDeleteStrategy(node: GraphNode, model: GraphModel, _deletionSet?: ReadonlySet<string>): DeleteStrategy {
      const children = childrenOf(model, node.id);
      if (children.length > 0) return { type: 'cascade' };
      return { type: 'disconnect' };
    },
  };

  return policy;
}
