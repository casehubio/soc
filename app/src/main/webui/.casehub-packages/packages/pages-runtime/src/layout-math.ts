export type Preset = "side-by-side" | "stacked" | "grid" | "main-sidebar" | "focus";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CanvasSize {
  width: number;
  height: number;
}

const GAP = 8;

export function computeZonePreset(preset: Preset, count: number, canvas: CanvasSize): Rect[] {
  if (count === 0) return [];
  if (count === 1) return [{ x: 0, y: 0, width: canvas.width, height: canvas.height }];

  switch (preset) {
    case "side-by-side": return sideBySide(count, canvas);
    case "stacked": return stacked(count, canvas);
    case "grid": return grid(count, canvas);
    case "main-sidebar": return mainSidebar(count, canvas);
    case "focus": return focus(count, canvas);
  }
}

function sideBySide(count: number, c: CanvasSize): Rect[] {
  const w = Math.floor((c.width - GAP * (count - 1)) / count);
  return Array.from({ length: count }, (_, i) => ({
    x: i * (w + GAP), y: 0, width: w, height: c.height,
  }));
}

function stacked(count: number, c: CanvasSize): Rect[] {
  const h = Math.floor((c.height - GAP * (count - 1)) / count);
  return Array.from({ length: count }, (_, i) => ({
    x: 0, y: i * (h + GAP), width: c.width, height: h,
  }));
}

function grid(count: number, c: CanvasSize): Rect[] {
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const cellW = Math.floor((c.width - GAP * (cols - 1)) / cols);
  const cellH = Math.floor((c.height - GAP * (rows - 1)) / rows);
  return Array.from({ length: count }, (_, i) => ({
    x: (i % cols) * (cellW + GAP),
    y: Math.floor(i / cols) * (cellH + GAP),
    width: cellW,
    height: cellH,
  }));
}

function mainSidebar(count: number, c: CanvasSize): Rect[] {
  const mainW = Math.floor(c.width * 0.65);
  const sideW = c.width - mainW - GAP;
  const sideCount = count - 1;
  const sideH = Math.floor((c.height - GAP * (sideCount - 1)) / sideCount);
  return [
    { x: 0, y: 0, width: mainW, height: c.height },
    ...Array.from({ length: sideCount }, (_, i) => ({
      x: mainW + GAP, y: i * (sideH + GAP), width: sideW, height: sideH,
    })),
  ];
}

function focus(count: number, c: CanvasSize): Rect[] {
  const mainW = Math.floor(c.width * 0.85);
  const mainH = Math.floor(c.height * 0.85);
  const result: Rect[] = [
    { x: Math.floor((c.width - mainW) / 2), y: Math.floor((c.height - mainH) / 2), width: mainW, height: mainH },
  ];
  const thumbW = 200;
  const thumbH = 150;
  for (let i = 1; i < count; i++) {
    result.push({ x: c.width - thumbW - GAP, y: GAP + (i - 1) * (thumbH + GAP), width: thumbW, height: thumbH });
  }
  return result;
}

export function scaleProportionally(
  entries: readonly Rect[],
  oldSize: CanvasSize,
  newSize: CanvasSize,
): Rect[] {
  if (oldSize.width === 0 || oldSize.height === 0) {
    return entries.map(e => ({ ...e }));
  }
  const sx = newSize.width / oldSize.width;
  const sy = newSize.height / oldSize.height;
  return entries.map(e => ({
    x: Math.round(e.x * sx),
    y: Math.round(e.y * sy),
    width: Math.round(e.width * sx),
    height: Math.round(e.height * sy),
  }));
}
