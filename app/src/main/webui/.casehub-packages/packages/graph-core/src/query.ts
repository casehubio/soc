import type { GraphNode, GraphEdge, GraphModel } from './model.js';

export function edgesOf(model: GraphModel, nodeId: string): readonly GraphEdge[] {
  return model.edges.filter(e => e.source === nodeId || e.target === nodeId);
}

export function inboundEdges(model: GraphModel, nodeId: string): readonly GraphEdge[] {
  return model.edges.filter(e => e.target === nodeId);
}

export function outboundEdges(model: GraphModel, nodeId: string): readonly GraphEdge[] {
  return model.edges.filter(e => e.source === nodeId);
}

export function nodeById(model: GraphModel, nodeId: string): GraphNode | undefined {
  return model.nodes.find(n => n.id === nodeId);
}

export function edgeById(model: GraphModel, edgeId: string): GraphEdge | undefined {
  return model.edges.find(e => e.id === edgeId);
}
