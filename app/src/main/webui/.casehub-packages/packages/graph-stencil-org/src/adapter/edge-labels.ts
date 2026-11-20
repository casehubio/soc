interface ScopeData { capabilityName?: string; }

interface RfEdge {
  id: string;
  type?: string | undefined;
  source: string;
  target: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

const LABEL_STYLES: Record<string, { fill: string; stroke: string; color: string }> = {
  'org-supervises': { fill: '#e9d8fd', stroke: '#d6bcfa', color: '#553c9a' },
  'org-delegates-to': { fill: '#e6fffa', stroke: '#81e6d9', color: '#2c7a7b' },
  'org-backs-up': { fill: '#ebf8ff', stroke: '#90cdf4', color: '#2b6cb0' },
  'org-extended': { fill: '#f3e8ff', stroke: '#c4b5fd', color: '#6d28d9' },
};

export function applyOrgEdgeLabels<E extends RfEdge>(edges: readonly E[]): E[] {
  return edges.map(edge => {
    const type = edge.type ?? '';
    const scope = edge.data?.['scope'] as ScopeData | undefined;
    const extendedKind = edge.data?.['extendedKind'] as string | undefined;

    let label: string | undefined;
    if (type === 'org-supervises' && scope?.capabilityName) {
      label = `scope: ${scope.capabilityName}`;
    } else if (type === 'org-delegates-to') {
      label = 'DELEGATES_TO';
    } else if (type === 'org-backs-up') {
      label = scope?.capabilityName ? `BACKS_UP (scope: ${scope.capabilityName})` : 'BACKS_UP';
    } else if (type === 'org-extended' && extendedKind) {
      label = extendedKind;
    }

    if (!label) return edge;
    const style = LABEL_STYLES[type];
    if (!style) return { ...edge, label };
    return {
      ...edge,
      label,
      labelStyle: { fontSize: 8, fontWeight: 600, fill: style.color },
      labelBgStyle: { fill: style.fill, stroke: style.stroke, strokeWidth: 0.6 },
      labelBgPadding: [3, 6] as [number, number],
      labelBgBorderRadius: 3,
    };
  });
}
