import type { GraphNode, GraphEdge, GraphModel } from '@casehubio/graph-core';
import { addNode, removeNode, removeNodes, addEdge, removeEdge, reconnectEdge, splitEdge, inboundEdges, outboundEdges } from '@casehubio/graph-core';
import type { EditResult } from '@casehubio/graph-core';
import type { GraphEdit } from './types.js';

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${String(idCounter)}`;
}

export function applyGraphEdit(model: GraphModel, edit: GraphEdit): EditResult {
  switch (edit.type) {
    case 'addNode': {
      const node: GraphNode = {
        id: edit.id ?? nextId('node'),
        type: edit.nodeType,
        properties: edit.properties ?? {},
      };
      return addNode(model, node);
    }
    case 'removeNode': {
      if (edit.strategy.type === 'auto-join') {
        const inEdges = inboundEdges(model, edit.nodeId);
        const outEdges = outboundEdges(model, edit.nodeId);
        let result = removeNode(model, edit.nodeId);
        if (inEdges.length === 1 && outEdges.length === 1) {
          const joinEdge: GraphEdge = {
            id: nextId('edge'),
            type: inEdges[0]!.type,
            source: inEdges[0]!.source,
            target: outEdges[0]!.target,
          };
          result = addEdge(result.model, joinEdge);
        }
        return result;
      }
      return removeNode(model, edit.nodeId);
    }
    case 'addEdge': {
      const edge: GraphEdge = {
        id: nextId('edge'),
        type: edit.edgeType ?? 'default',
        source: edit.sourceId,
        target: edit.targetId,
      };
      return addEdge(model, edge);
    }
    case 'removeEdge':
      return removeEdge(model, edit.edgeId);
    case 'reconnectEdge':
      return reconnectEdge(model, edit.edgeId, edit.endpoints);
    case 'splitEdge': {
      const insertNode: GraphNode = {
        id: nextId('node'),
        type: edit.insertNodeType,
        properties: {},
      };
      return splitEdge(model, edit.edgeId, insertNode);
    }
    case 'moveNodeToEdge': {
      let result: EditResult = { model, violations: [] };

      // Source-side cleanup
      if (edit.sourceCleanup === 'auto-join') {
        const inEdges = inboundEdges(model, edit.nodeId);
        const outEdges = outboundEdges(model, edit.nodeId);
        for (const e of [...inEdges, ...outEdges]) {
          result = removeEdge(result.model, e.id);
        }
        if (inEdges.length === 1 && outEdges.length === 1) {
          const joinEdge: GraphEdge = {
            id: nextId('edge'),
            type: inEdges[0]!.type,
            source: inEdges[0]!.source,
            target: outEdges[0]!.target,
          };
          result = addEdge(result.model, joinEdge);
        }
      } else {
        const connected = [...inboundEdges(model, edit.nodeId), ...outboundEdges(model, edit.nodeId)];
        for (const e of connected) {
          result = removeEdge(result.model, e.id);
        }
      }

      // Target-side splice — look up in result.model (source cleanup may have removed it)
      const targetEdge = result.model.edges.find(e => e.id === edit.edgeId);
      if (!targetEdge) return result;

      result = removeEdge(result.model, edit.edgeId);
      result = addEdge(result.model, {
        id: nextId('edge'),
        type: targetEdge.type,
        source: targetEdge.source,
        target: edit.nodeId,
      });
      result = addEdge(result.model, {
        id: nextId('edge'),
        type: targetEdge.type,
        source: edit.nodeId,
        target: targetEdge.target,
      });

      return result;
    }
    case 'moveSegmentToEdge': {
      let result: EditResult = { model, violations: [] };

      // Source cleanup: remove EXTERNAL edges only (one endpoint in segment, one outside).
      // Internal edges (both endpoints in segment) are preserved.
      const externalEdges = model.edges.filter(e => {
        const srcIn = edit.nodeIds.has(e.source);
        const tgtIn = edit.nodeIds.has(e.target);
        return (srcIn || tgtIn) && !(srcIn && tgtIn);
      });
      for (const e of externalEdges) {
        result = removeEdge(result.model, e.id);
      }
      const bridgeE: GraphEdge = {
        id: nextId('edge'),
        type: edit.bridgeEdge.edgeType,
        source: edit.bridgeEdge.sourceId,
        target: edit.bridgeEdge.targetId,
      };
      result = addEdge(result.model, bridgeE);

      // Target splice: remove target edge, wire segment in
      const targetEdge = result.model.edges.find(e => e.id === edit.edgeId);
      if (!targetEdge) return result;
      result = removeEdge(result.model, edit.edgeId);
      result = addEdge(result.model, {
        id: nextId('edge'),
        type: targetEdge.type,
        source: targetEdge.source,
        target: edit.entryNodeId,
      });
      result = addEdge(result.model, {
        id: nextId('edge'),
        type: targetEdge.type,
        source: edit.exitNodeId,
        target: targetEdge.target,
      });

      return result;
    }
    case 'removeSegment': {
      let result = removeNodes(model, edit.nodeIds);
      if (edit.bridgeEdge) {
        const bridge: GraphEdge = {
          id: nextId('edge'),
          type: edit.bridgeEdge.edgeType,
          source: edit.bridgeEdge.sourceId,
          target: edit.bridgeEdge.targetId,
        };
        result = addEdge(result.model, bridge);
      }
      return result;
    }
    case 'compound': {
      let result: EditResult = { model, violations: [] };
      for (const subEdit of edit.edits) {
        result = applyGraphEdit(result.model, subEdit);
      }
      return result;
    }
  }
}
