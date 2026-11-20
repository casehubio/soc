interface RfEdge {
  id: string;
  source: string;
  target: string;
  className?: string;
  style?: object;
  [key: string]: unknown;
}

export function applySelectionHighlight<E extends RfEdge>(
  edges: readonly E[],
  selectedNodeId?: string,
): E[] {
  if (!selectedNodeId) return edges.map(e => ({ ...e }));
  return edges.map(edge => {
    const connected = edge.source === selectedNodeId || edge.target === selectedNodeId;
    if (connected) {
      return { ...edge, className: 'org-edge-highlighted' };
    }
    return { ...edge, style: { ...edge.style, opacity: 0.15 } };
  });
}
