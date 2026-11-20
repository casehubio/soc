import type { Container, FreeLayoutEntry } from "./types.js";
import { detectEdgeZone, type EdgeZone } from "../frame-boundaries.js";

export type { EdgeZone };

const EDGE_THRESHOLD = 40;

export interface DndCallbacks {
  onDrop(
    sourceContainer: Container,
    tabKey: string,
    targetFrameKey: string | null,
    x: number,
    y: number,
  ): void;
  onEdgeSplit?(
    sourceContainer: Container,
    tabKey: string,
    targetFrameKey: string,
    edge: EdgeZone,
  ): void;
}

export function createFreeLayoutDnd(
  hostElement: HTMLElement,
  entryState: Map<string, FreeLayoutEntry>,
  frameElements: Map<string, HTMLElement>,
  callbacks: DndCallbacks,
): { dispose(): void } {

  function detectTarget(clientX: number, clientY: number): {
    frameKey: string | null;
    edge: EdgeZone | null;
  } {
    const hostRect = hostElement.getBoundingClientRect();
    const x = clientX - hostRect.left;
    const y = clientY - hostRect.top;

    for (const [key, state] of entryState) {
      if (!frameElements.has(key)) continue;
      const { position, size } = state;
      if (
        x >= position.x && x <= position.x + size.width &&
        y >= position.y && y <= position.y + size.height
      ) {
        const edge = detectEdgeZone(
          { x, y },
          { x: position.x, y: position.y, width: size.width, height: size.height },
          EDGE_THRESHOLD,
        );
        return { frameKey: key, edge };
      }
    }
    return { frameKey: null, edge: null };
  }

  function isOutsideHost(clientX: number, clientY: number): boolean {
    const hostRect = hostElement.getBoundingClientRect();
    return (
      clientX < hostRect.left ||
      clientX > hostRect.right ||
      clientY < hostRect.top ||
      clientY > hostRect.bottom
    );
  }

  function onDragStart(e: Event): void {
    const evt = e as CustomEvent<{
      tabKey: string;
      ghost: HTMLElement;
      sourceContainer: Container;
    }>;
    evt.stopPropagation();

    const { tabKey, ghost, sourceContainer } = evt.detail;
    let currentFrameKey: string | null = null;
    let currentEdge: EdgeZone | null = null;
    let highlightEl: HTMLElement | null = null;
    let escaped = false;

    function clearHighlight(): void {
      if (highlightEl) {
        highlightEl.remove();
        highlightEl = null;
      }
    }

    function setHighlight(frameKey: string, edge: EdgeZone | null): void {
      clearHighlight();
      const frameEl = frameElements.get(frameKey);
      if (!frameEl) return;
      highlightEl = document.createElement("div");

      if (edge) {
        highlightEl.setAttribute("data-split-preview", edge);
        let inset: string;
        switch (edge) {
          case "left": inset = "0 50% 0 0"; break;
          case "right": inset = "0 0 0 50%"; break;
          case "top": inset = "0 0 50% 0"; break;
          case "bottom": inset = "50% 0 0 0"; break;
        }
        highlightEl.style.cssText =
          `position:absolute;inset:${inset};` +
          "background:var(--pages-accent-3,rgba(59,130,246,0.15));" +
          "border:2px solid var(--pages-accent-9,#3b82f6);" +
          "pointer-events:none;z-index:99999;border-radius:4px;";
      } else {
        highlightEl.setAttribute("data-drop-highlight", "");
        highlightEl.style.cssText =
          "position:absolute;inset:0;border:2px solid var(--pages-accent-9,#3b82f6);" +
          "pointer-events:none;z-index:99999;border-radius:4px;";
      }

      frameEl.appendChild(highlightEl);
    }

    function cleanup(): void {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      clearHighlight();
    }

    function onMove(moveEvt: PointerEvent): void {
      if (escaped) return;

      if (isOutsideHost(moveEvt.clientX, moveEvt.clientY)) {
        escaped = true;
        cleanup();
        hostElement.dispatchEvent(new CustomEvent("pages-tab-escaped", {
          bubbles: true,
          detail: { tabKey, ghost, sourceContainer },
        }));
        return;
      }

      const { frameKey, edge } = detectTarget(moveEvt.clientX, moveEvt.clientY);
      if (frameKey !== currentFrameKey || edge !== currentEdge) {
        clearHighlight();
        currentFrameKey = frameKey;
        currentEdge = edge;
        if (currentFrameKey) setHighlight(currentFrameKey, currentEdge);
      }
    }

    function onUp(upEvt: PointerEvent): void {
      cleanup();
      if (escaped) return;

      if (currentFrameKey && currentEdge && callbacks.onEdgeSplit) {
        callbacks.onEdgeSplit(sourceContainer, tabKey, currentFrameKey, currentEdge);
      } else {
        callbacks.onDrop(sourceContainer, tabKey, currentFrameKey, upEvt.clientX, upEvt.clientY);
      }
    }

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }

  hostElement.addEventListener("pages-tab-drag-start", onDragStart);

  return {
    dispose() {
      hostElement.removeEventListener("pages-tab-drag-start", onDragStart);
    },
  };
}
