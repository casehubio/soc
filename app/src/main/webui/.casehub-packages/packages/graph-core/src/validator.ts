import type { GraphModel } from './model.js';
import { getGrammar } from './grammar.js';
import { childrenOf } from './traversal.js';
import { inboundEdges, outboundEdges, nodeById } from './query.js';

export type ConstraintRule =
  | 'inbound_count'
  | 'outbound_count'
  | 'inbound_type'
  | 'outbound_type'
  | 'parent_type'
  | 'child_type';

export interface ConstraintViolation {
  readonly rule: ConstraintRule;
  readonly message: string;
  readonly nodeId: string;
  readonly edgeId?: string;
}

export function validateConstraints(model: GraphModel): readonly ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];

  for (const node of model.nodes) {
    const grammar = getGrammar(node.type);
    if (!grammar) continue;

    const inbound = inboundEdges(model, node.id);
    const outbound = outboundEdges(model, node.id);

    if (inbound.length < grammar.connections.inbound.min) {
      violations.push({
        rule: 'inbound_count',
        message: `Node '${node.id}' (type '${node.type}') has ${String(inbound.length)} inbound edges, minimum is ${String(grammar.connections.inbound.min)}`,
        nodeId: node.id,
      });
    }
    if (inbound.length > grammar.connections.inbound.max) {
      violations.push({
        rule: 'inbound_count',
        message: `Node '${node.id}' (type '${node.type}') has ${String(inbound.length)} inbound edges, maximum is ${String(grammar.connections.inbound.max)}`,
        nodeId: node.id,
      });
    }

    if (outbound.length < grammar.connections.outbound.min) {
      violations.push({
        rule: 'outbound_count',
        message: `Node '${node.id}' (type '${node.type}') has ${String(outbound.length)} outbound edges, minimum is ${String(grammar.connections.outbound.min)}`,
        nodeId: node.id,
      });
    }
    if (outbound.length > grammar.connections.outbound.max) {
      violations.push({
        rule: 'outbound_count',
        message: `Node '${node.id}' (type '${node.type}') has ${String(outbound.length)} outbound edges, maximum is ${String(grammar.connections.outbound.max)}`,
        nodeId: node.id,
      });
    }

    const allowedFrom = grammar.connections.inbound.allowedFrom;
    if (allowedFrom.length > 0) {
      for (const e of inbound) {
        const sourceNode = nodeById(model, e.source);
        if (sourceNode && !allowedFrom.includes(sourceNode.type)) {
          violations.push({
            rule: 'inbound_type',
            message: `Node '${node.id}' (type '${node.type}') has inbound edge from '${sourceNode.id}' (type '${sourceNode.type}'), allowed: [${allowedFrom.join(', ')}]`,
            nodeId: node.id,
            edgeId: e.id,
          });
        }
      }
    }

    const allowedTo = grammar.connections.outbound.allowedTo;
    if (allowedTo.length > 0) {
      for (const e of outbound) {
        const targetNode = nodeById(model, e.target);
        if (targetNode && !allowedTo.includes(targetNode.type)) {
          violations.push({
            rule: 'outbound_type',
            message: `Node '${node.id}' (type '${node.type}') has outbound edge to '${targetNode.id}' (type '${targetNode.type}'), allowed: [${allowedTo.join(', ')}]`,
            nodeId: node.id,
            edgeId: e.id,
          });
        }
      }
    }

    if (grammar.containment) {
      const { allowedParentTypes, allowedChildTypes } = grammar.containment;

      if (allowedParentTypes !== undefined) {
        if (node.parentId === undefined) {
          violations.push({
            rule: 'parent_type',
            message: `Node '${node.id}' (type '${node.type}') must be contained in one of [${allowedParentTypes.join(', ')}], but is a root node`,
            nodeId: node.id,
          });
        } else {
          const parent = nodeById(model, node.parentId);
          if (parent && !allowedParentTypes.includes(parent.type)) {
            violations.push({
              rule: 'parent_type',
              message: `Node '${node.id}' (type '${node.type}') is contained in '${parent.id}' (type '${parent.type}'), allowed parents: [${allowedParentTypes.join(', ')}]`,
              nodeId: node.id,
            });
          }
        }
      }

      if (allowedChildTypes !== undefined) {
        const children = childrenOf(model, node.id);
        for (const child of children) {
          if (!allowedChildTypes.includes(child.type)) {
            violations.push({
              rule: 'child_type',
              message: `Node '${node.id}' (type '${node.type}') contains '${child.id}' (type '${child.type}'), allowed children: [${allowedChildTypes.join(', ')}]`,
              nodeId: node.id,
            });
          }
        }
      }
    }
  }

  return violations;
}
