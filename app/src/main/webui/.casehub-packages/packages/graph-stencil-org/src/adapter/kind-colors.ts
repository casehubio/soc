import type { GraphModel, GraphNode } from '@casehubio/graph-core';

export const DEFAULT_KIND_PALETTE: Readonly<Record<string, { start: string; end: string }>> = {
  'supervision-hierarchy': { start: '#553c9a', end: '#6b46c1' },
  'rig': { start: '#2c5282', end: '#3182ce' },
  'department': { start: '#276749', end: '#38a169' },
  'holarchy': { start: '#3730a3', end: '#4f46e5' },
  'team': { start: '#9c4221', end: '#dd6b20' },
};

const FALLBACK_PALETTE = [
  { start: '#065f46', end: '#059669' },
  { start: '#92400e', end: '#d97706' },
  { start: '#831843', end: '#db2777' },
  { start: '#1e3a5f', end: '#3b82f6' },
];

export function resolveKindColors(
  model: GraphModel,
  kindColors?: Readonly<Record<string, { start: string; end: string }>>,
): GraphModel {
  const merged = { ...DEFAULT_KIND_PALETTE, ...kindColors };
  const unitKindMap = new Map<string, { kind?: string; start: string; end: string }>();
  let fallbackIdx = 0;

  for (const node of model.nodes) {
    if (node.type !== 'org-unit') continue;
    const kind = node.properties['kind'] as string | undefined;
    const key = kind ?? '__none__';
    if (!unitKindMap.has(key)) {
      const colors = kind && merged[kind]
        ? merged[kind]!
        : FALLBACK_PALETTE[fallbackIdx++ % FALLBACK_PALETTE.length]!;
      const entry: { kind?: string; start: string; end: string } = { start: colors.start, end: colors.end };
      if (kind !== undefined) entry.kind = kind;
      unitKindMap.set(key, entry);
    }
  }

  const unitNodeColors = new Map<string, { kind?: string; start: string; end: string }>();
  for (const node of model.nodes) {
    if (node.type !== 'org-unit') continue;
    const kind = node.properties['kind'] as string | undefined;
    const colors = unitKindMap.get(kind ?? '__none__')!;
    unitNodeColors.set(node.id, colors);
  }

  const nodes = model.nodes.map((node): GraphNode => {
    if (node.type === 'org-unit') {
      const colors = unitNodeColors.get(node.id)!;
      return { ...node, properties: { ...node.properties, kindColorStart: colors.start, kindColorEnd: colors.end } };
    }
    if (node.type === 'org-agent' && node.parentId) {
      const parentColors = unitNodeColors.get(node.parentId);
      if (parentColors) {
        return {
          ...node,
          properties: {
            ...node.properties,
            unitKind: parentColors.kind,
            unitColorStart: parentColors.start,
            unitColorEnd: parentColors.end,
          },
        };
      }
    }
    return node;
  });

  return { nodes, edges: model.edges };
}
