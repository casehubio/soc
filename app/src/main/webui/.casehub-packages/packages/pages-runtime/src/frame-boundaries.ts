import type { SnapZone } from "@casehubio/pages-component";

type Position = { x: number; y: number };
type Size = { width: number; height: number };

const DEFAULT_DISPLACEMENT = 30;

export function clampPosition(pos: Position, size: Size, container: Size): Position {
  return {
    x: Math.max(0, Math.min(pos.x, container.width - size.width)),
    y: Math.max(0, Math.min(pos.y, container.height - size.height)),
  };
}

export function nextFramePosition(
  container: Size, frameSize: Size, existing: readonly Position[], displacement = DEFAULT_DISPLACEMENT,
): Position {
  if (existing.length === 0) {
    return {
      x: Math.floor((container.width - frameSize.width) / 2),
      y: Math.floor((container.height - frameSize.height) / 2),
    };
  }

  let candidate = {
    x: existing[existing.length - 1]!.x + displacement,
    y: existing[existing.length - 1]!.y + displacement,
  };

  for (let attempt = 0; attempt < 20; attempt++) {
    const collides = existing.some(e => Math.abs(e.x - candidate.x) < 10 && Math.abs(e.y - candidate.y) < 10);
    if (!collides) break;
    candidate = { x: candidate.x + displacement, y: candidate.y + displacement };
  }

  return clampPosition(candidate, frameSize, container);
}

export type EdgeZone = "left" | "right" | "top" | "bottom";

export function detectEdgeZone(
  pos: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number },
  threshold: number,
): EdgeZone | null {
  const relX = pos.x - rect.x;
  const relY = pos.y - rect.y;
  if (relX < 0 || relX > rect.width || relY < 0 || relY > rect.height) return null;
  if (relX < threshold) return "left";
  if (relX > rect.width - threshold) return "right";
  if (relY < threshold) return "top";
  if (relY > rect.height - threshold) return "bottom";
  return null;
}

export type SplitDirection = "h" | "v";

export function edgeToDirection(zone: EdgeZone): SplitDirection {
  return zone === "top" || zone === "bottom" ? "h" : "v";
}

const DEFAULT_THRESHOLD = 40;

export function snapToZone(
  dragPosition: Position,
  containerSize: Size,
  threshold = DEFAULT_THRESHOLD,
): SnapZone | null {
  const nearLeft = dragPosition.x <= threshold;
  const nearRight = dragPosition.x >= containerSize.width - threshold;
  const nearTop = dragPosition.y <= threshold;
  const nearBottom = dragPosition.y >= containerSize.height - threshold;

  if (nearLeft && nearTop) return "top-left";
  if (nearRight && nearTop) return "top-right";
  if (nearLeft && nearBottom) return "bottom-left";
  if (nearRight && nearBottom) return "bottom-right";
  if (nearLeft) return "left";
  if (nearRight) return "right";
  if (nearTop) return "top";
  if (nearBottom) return "bottom";
  return null;
}

export const DEFAULT_GAP = 8;

export function zoneToRect(
  zone: SnapZone,
  containerSize: Size,
  gap = DEFAULT_GAP,
): { position: Position; size: Size } {
  const halfW = Math.floor((containerSize.width - gap) / 2);
  const halfH = Math.floor((containerSize.height - gap) / 2);
  const rightX = containerSize.width - halfW;
  const bottomY = containerSize.height - halfH;

  switch (zone) {
    case "left": return { position: { x: 0, y: 0 }, size: { width: halfW, height: containerSize.height } };
    case "right": return { position: { x: rightX, y: 0 }, size: { width: halfW, height: containerSize.height } };
    case "top": return { position: { x: 0, y: 0 }, size: { width: containerSize.width, height: halfH } };
    case "bottom": return { position: { x: 0, y: bottomY }, size: { width: containerSize.width, height: halfH } };
    case "top-left": return { position: { x: 0, y: 0 }, size: { width: halfW, height: halfH } };
    case "top-right": return { position: { x: rightX, y: 0 }, size: { width: halfW, height: halfH } };
    case "bottom-left": return { position: { x: 0, y: bottomY }, size: { width: halfW, height: halfH } };
    case "bottom-right": return { position: { x: rightX, y: bottomY }, size: { width: halfW, height: halfH } };
    case "full": return { position: { x: 0, y: 0 }, size: { width: containerSize.width, height: containerSize.height } };
    default: {
      const _exhaustive: never = zone;
      return _exhaustive;
    }
  }
}

export function splitGeometry(
  zone: EdgeZone,
  targetRect: { x: number; y: number; width: number; height: number },
  gap = DEFAULT_GAP,
): { target: { position: Position; size: Size }; newFrame: { position: Position; size: Size } } {
  const { x, y, width, height } = targetRect;

  switch (zone) {
    case "left": {
      const halfW = Math.floor(width / 2 - gap / 2);
      return {
        newFrame: { position: { x, y }, size: { width: halfW, height } },
        target: { position: { x: x + halfW + gap, y }, size: { width: halfW, height } },
      };
    }
    case "right": {
      const halfW = Math.floor(width / 2 - gap / 2);
      return {
        target: { position: { x, y }, size: { width: halfW, height } },
        newFrame: { position: { x: x + halfW + gap, y }, size: { width: halfW, height } },
      };
    }
    case "top": {
      const halfH = Math.floor(height / 2 - gap / 2);
      return {
        newFrame: { position: { x, y }, size: { width, height: halfH } },
        target: { position: { x, y: y + halfH + gap }, size: { width, height: halfH } },
      };
    }
    case "bottom": {
      const halfH = Math.floor(height / 2 - gap / 2);
      return {
        target: { position: { x, y }, size: { width, height: halfH } },
        newFrame: { position: { x, y: y + halfH + gap }, size: { width, height: halfH } },
      };
    }
  }
}
