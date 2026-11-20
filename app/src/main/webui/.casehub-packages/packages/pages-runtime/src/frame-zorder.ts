import type { FrameLayout } from "@casehubio/pages-component";

const PINNED_BASE = 10000;
const COMPACT_THRESHOLD = 5000;

export function bringToFront(
  frames: ReadonlyMap<string, FrameLayout>, key: string,
): Map<string, FrameLayout> {
  const frame = frames.get(key);
  if (!frame) return new Map(frames);

  const tier = frame.pinned ? PINNED_BASE : 0;
  let maxZ = tier;
  for (const f of frames.values()) {
    if (f.pinned === frame.pinned && f.zIndex > maxZ) maxZ = f.zIndex;
  }
  const newZ = maxZ + 1;
  const result = new Map(frames);
  result.set(key, { ...frame, zIndex: newZ });

  if (newZ - tier > COMPACT_THRESHOLD) return compact(result);
  return result;
}

function compact(frames: Map<string, FrameLayout>): Map<string, FrameLayout> {
  const normal = [...frames.entries()].filter(([, f]) => !f.pinned).sort((a, b) => a[1].zIndex - b[1].zIndex);
  const pinned = [...frames.entries()].filter(([, f]) => f.pinned).sort((a, b) => a[1].zIndex - b[1].zIndex);
  const result = new Map<string, FrameLayout>();
  normal.forEach(([k, f], i) => result.set(k, { ...f, zIndex: i + 1 }));
  pinned.forEach(([k, f], i) => result.set(k, { ...f, zIndex: PINNED_BASE + i + 1 }));
  return result;
}

export function normalizeForSave(
  frames: ReadonlyMap<string, FrameLayout>,
): Map<string, FrameLayout> {
  return compact(new Map(frames));
}
