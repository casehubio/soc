import type { Container, FreeLayoutState } from "./frame-sandbox/types.js";
import { findSpatialTarget, type SpatialFrame } from "./frame-spatial-nav.js";

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isInTextInput(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  if (INPUT_TAGS.has(active.tagName)) return true;
  if ((active as HTMLElement).isContentEditable) return true;
  const root = active.shadowRoot;
  if (root) {
    const inner = root.activeElement;
    if (inner && (INPUT_TAGS.has(inner.tagName) || (inner as HTMLElement).isContentEditable)) return true;
  }
  return false;
}

export function createFrameKeyboardHandler(
  rootContainer: Container,
  container: HTMLElement,
  signal: AbortSignal,
): void {
  let focusedKey: string | null = null;

  container.addEventListener("pages-frame-focus", ((e: Event) => {
    focusedKey = (e as CustomEvent<{ frameKey: string }>).detail.frameKey;
  }), { signal });

  function handleKeydown(e: KeyboardEvent): void {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    if (isInTextInput()) return;

    const key = e.key;

    if (key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight") {
      e.preventDefault();
      const dir = key.replace("Arrow", "").toLowerCase() as "up" | "down" | "left" | "right";
      const state = rootContainer.organiser.getState() as FreeLayoutState;
      const spatialMap = new Map<string, SpatialFrame>();
      for (const [k, v] of Object.entries(state.entries)) spatialMap.set(k, v);
      const current = focusedKey ?? (state.zOrder.length > 0 ? state.zOrder[state.zOrder.length - 1]! : null);
      if (!current) return;
      const target = findSpatialTarget(spatialMap, current, dir);
      if (target) {
        focusedKey = target;
        rootContainer.organiser.bringToFront?.(target);
      }
      return;
    }

    if (key >= "1" && key <= "9") {
      e.preventDefault();
      const index = parseInt(key) - 1;
      const entries = rootContainer.entries;
      if (index < entries.length) {
        focusedKey = entries[index]!.key;
        rootContainer.organiser.bringToFront?.(focusedKey);
      }
      return;
    }

    if (key === "]" || key === "[") {
      e.preventDefault();
      const entries = rootContainer.entries;
      if (entries.length === 0) return;
      const currentIndex = focusedKey ? entries.findIndex(entry => entry.key === focusedKey) : -1;
      const next = key === "]"
        ? (currentIndex + 1) % entries.length
        : (currentIndex - 1 + entries.length) % entries.length;
      focusedKey = entries[next]!.key;
      rootContainer.organiser.bringToFront?.(focusedKey);
      return;
    }

    if (key === "w" && focusedKey) {
      e.preventDefault();
      rootContainer.removeEntry(focusedKey);
      focusedKey = null;
      return;
    }

    if (key === "p" && focusedKey) {
      e.preventDefault();
      rootContainer.organiser.togglePin?.(focusedKey);
      return;
    }
  }

  document.addEventListener("keydown", handleKeydown, { signal });
}
