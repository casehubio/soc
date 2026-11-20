import type { GraphNode, GraphModel, GraphEdge } from '@casehubio/graph-core';
import { getGrammar, inboundEdges, outboundEdges, nodeById } from '@casehubio/graph-core';
import type { EditPolicy, StencilTypeInfo, DeleteStrategy, AddPlacement } from '@casehubio/graph-renderer';

const CREATABLE_TYPES: readonly StencilTypeInfo[] = [
  { type: 'swf-call', label: 'Call', icon: 'phone' },
  { type: 'swf-set', label: 'Set', icon: 'edit' },
  { type: 'swf-switch', label: 'Switch', icon: 'git-branch' },
  { type: 'swf-for', label: 'For', icon: 'repeat' },
  { type: 'swf-do', label: 'Do', icon: 'list' },
  { type: 'swf-fork', label: 'Fork', icon: 'git-merge' },
  { type: 'swf-emit', label: 'Emit', icon: 'send' },
  { type: 'swf-listen', label: 'Listen', icon: 'radio' },
  { type: 'swf-run', label: 'Run', icon: 'terminal' },
  { type: 'swf-wait', label: 'Wait', icon: 'clock' },
  { type: 'swf-raise', label: 'Raise', icon: 'alert-triangle' },
  { type: 'swf-try', label: 'Try', icon: 'shield' },
];

const NON_DELETABLE = new Set(['swf-start', 'swf-end', 'swf-entry', 'swf-exit', 'swf-root']);

function grammarAllows(sourceType: string, targetType: string): boolean {
  const grammar = getGrammar(sourceType);
  if (!grammar) return false;
  const { outbound } = grammar.connections;
  if (outbound.max === 0) return false;
  if (outbound.allowedTo.length > 0 && !outbound.allowedTo.includes(targetType)) return false;
  const targetGrammar = getGrammar(targetType);
  if (targetGrammar) {
    const { inbound } = targetGrammar.connections;
    if (inbound.allowedFrom.length > 0 && !inbound.allowedFrom.includes(sourceType)) return false;
    if (inbound.max === 0) return false;
  }
  return true;
}

export function createSwfEditPolicy(): EditPolicy {
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

    canSpliceOntoEdge(edge: GraphEdge, node: GraphNode, _model: GraphModel): boolean {
      if (NON_DELETABLE.has(node.type)) return false;
      const targetId = edge.target;
      if (targetId === node.id) return false;
      return true;
    },

    getInsertableTypes(edge: GraphEdge, model: GraphModel): StencilTypeInfo[] {
      return CREATABLE_TYPES.filter(info => {
        const candidate = { id: '__probe__', type: info.type, properties: {} };
        return policy.canSpliceOntoEdge?.(edge, candidate, model) ?? true;
      });
    },

    getCreatableTypes(_nearNode: GraphNode | null, _model: GraphModel): StencilTypeInfo[] {
      return [...CREATABLE_TYPES];
    },

    getAddPlacement(_nodeType: string, model: GraphModel): AddPlacement {
      const endNode = model.nodes.find(n => n.type === 'swf-end');
      if (endNode) {
        const incoming = inboundEdges(model, endNode.id);
        if (incoming.length === 1) {
          return { type: 'splitEdge', edgeId: incoming[0]!.id };
        }
      }
      return { type: 'detached' };
    },

    canDelete(node: GraphNode, _model: GraphModel): boolean {
      return !NON_DELETABLE.has(node.type);
    },

    getDeleteStrategy(node: GraphNode, model: GraphModel, _deletionSet?: ReadonlySet<string>): DeleteStrategy {
      const inbound = inboundEdges(model, node.id);
      const outbound = outboundEdges(model, node.id);

      if (inbound.length === 1 && outbound.length === 1) {
        const predecessor = nodeById(model, inbound[0]!.source);
        const successor = nodeById(model, outbound[0]!.target);
        if (predecessor && successor && grammarAllows(predecessor.type, successor.type)) {
          return { type: 'auto-join' };
        }
      }

      return { type: 'disconnect' };
    },
  };

  return policy;
}
