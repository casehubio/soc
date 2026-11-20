export interface SpatialFrame {
  readonly position: { readonly x: number; readonly y: number };
  readonly size: { readonly width: number; readonly height: number };
  readonly hidden?: boolean;
}

type Direction = "up" | "down" | "left" | "right";

function center(f: SpatialFrame): { cx: number; cy: number } {
  return { cx: f.position.x + f.size.width / 2, cy: f.position.y + f.size.height / 2 };
}

function inHalfPlane(from: { cx: number; cy: number }, to: { cx: number; cy: number }, dir: Direction): boolean {
  switch (dir) {
    case "right": return to.cx > from.cx;
    case "left":  return to.cx < from.cx;
    case "down":  return to.cy > from.cy;
    case "up":    return to.cy < from.cy;
  }
}

export function findSpatialTarget(
  frames: ReadonlyMap<string, SpatialFrame>, current: string, direction: Direction,
): string | null {
  const source = frames.get(current);
  if (!source) return null;
  const from = center(source);

  let bestKey: string | null = null;
  let bestDist = Infinity;

  for (const [key, frame] of frames) {
    if (key === current || frame.hidden) continue;
    const to = center(frame);
    if (!inHalfPlane(from, to, direction)) continue;
    const dist = Math.hypot(to.cx - from.cx, to.cy - from.cy);
    if (dist < bestDist) { bestDist = dist; bestKey = key; }
  }
  return bestKey;
}
