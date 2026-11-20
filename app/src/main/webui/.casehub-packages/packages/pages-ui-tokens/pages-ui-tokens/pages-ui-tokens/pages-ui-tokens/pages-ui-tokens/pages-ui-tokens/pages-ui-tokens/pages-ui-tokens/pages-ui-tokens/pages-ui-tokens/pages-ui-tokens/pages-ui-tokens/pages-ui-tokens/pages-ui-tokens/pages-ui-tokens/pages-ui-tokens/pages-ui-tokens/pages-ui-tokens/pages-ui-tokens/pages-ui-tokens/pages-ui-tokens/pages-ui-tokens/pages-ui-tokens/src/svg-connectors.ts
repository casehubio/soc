export interface Point {
  readonly x: number;
  readonly y: number;
}

export type CurveType = 'bezier' | 'straight' | 'step';

export interface ConnectorOptions {
  readonly curve?: CurveType;
  readonly curvature?: number;
}

const DEFAULT_CURVATURE = 0.4;

export function connectorPath(from: Point, to: Point, opts?: ConnectorOptions): string {
  const curve = opts?.curve ?? 'bezier';
  if (curve === 'straight') {
    return `M ${from.x},${from.y} L ${to.x},${to.y}`;
  }
  if (curve === 'step') {
    const midY = from.y + (to.y - from.y) / 2;
    return `M ${from.x},${from.y} V ${midY} H ${to.x} V ${to.y}`;
  }
  const curvature = opts?.curvature ?? DEFAULT_CURVATURE;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const total = absDx + absDy || 1;
  const verticalWeight = absDy / total;
  const horizontalWeight = absDx / total;
  const offsetX = dx * curvature;
  const offsetY = dy * curvature;
  const c1x = from.x + offsetX * horizontalWeight;
  const c1y = from.y + offsetY * verticalWeight;
  const c2x = to.x - offsetX * horizontalWeight;
  const c2y = to.y - offsetY * verticalWeight;
  return `M ${from.x},${from.y} C ${c1x},${c1y} ${c2x},${c2y} ${to.x},${to.y}`;
}

export function fanInPaths(sources: readonly Point[], target: Point, opts?: ConnectorOptions): string[] {
  return sources.map(s => connectorPath(s, target, opts));
}

export function fanOutPaths(source: Point, targets: readonly Point[], opts?: ConnectorOptions): string[] {
  return targets.map(t => connectorPath(source, t, opts));
}
