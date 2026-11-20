import type { DockZone, DockSide } from "@casehubio/pages-component";
import type { ZoneLayoutEngine } from "./zone-layout-engine.js";

export const DRAG_THRESHOLD = 5;

function resolveDockZone(side: DockSide, position: string): DockZone {
  if (side === "bottom") {
    return position === "right" ? "bottom-right" : "bottom-left";
  }
  if (position === "middle" || position === "top-second") {
    return `${side}-bottom` as DockZone;
  }
  if (position === "bottom") {
    return `bottom-${side}` as DockZone;
  }
  return `${side}-top` as DockZone;
}

function getBarSide(barEl: HTMLElement): DockSide | null {
  const propsStr = barEl.dataset.componentProps;
  if (!propsStr) return null;
  try {
    const props = JSON.parse(propsStr) as { side?: string };
    return (props.side as DockSide) ?? null;
  } catch {
    return null;
  }
}

interface DropTarget {
  zone: DockZone;
  element: HTMLElement;
}

// Drop targets are dock-bar zone groups only — panel content areas are never
// drop targets. This is deliberate: the button bar is always visible (even when
// all panels in a zone are collapsed), providing a consistent drag target.
function buildDropTargetMap(siteContainer: HTMLElement, validZones: readonly DockZone[]): DropTarget[] {
  const targets: DropTarget[] = [];
  const bars = siteContainer.querySelectorAll<HTMLElement>('[data-component-type="dock-bar"]');

  for (const bar of bars) {
    const side = getBarSide(bar);
    if (!side) continue;

    const zoneGroups = bar.querySelectorAll<HTMLElement>(":scope > [data-dock-zone]");
    for (const group of zoneGroups) {
      const position = group.dataset.dockZone;
      if (!position) continue;
      const zone = resolveDockZone(side, position);
      if (validZones.includes(zone)) {
        targets.push({ zone, element: group });
      }
    }

    const coveredZones = new Set(targets.map(t => t.zone));
    for (const vz of validZones) {
      if (coveredZones.has(vz)) continue;
      if (side !== "bottom" && vz === `bottom-${side}`) {
        targets.push({ zone: vz, element: bar });
      } else if (side === "bottom" && vz.startsWith("bottom-")) {
        targets.push({ zone: vz, element: bar });
      }
    }
  }

  return targets;
}

export function attachDockDrag(
  button: HTMLElement,
  engine: ZoneLayoutEngine,
  siteContainer: HTMLElement,
  signal?: AbortSignal,
): void {
  const panelId: string | undefined = button.dataset.dockPanelId;
  if (!panelId) return;
  const id: string = panelId;

  const constraints = engine.getConstraints(id);
  if (constraints.fixed) return;

  button.addEventListener("mousedown", (startEvent: MouseEvent) => {
    startEvent.preventDefault();
    const startX = startEvent.clientX;
    const startY = startEvent.clientY;
    let dragging = false;
    let ghost: HTMLElement | null = null;
    let insertLine: HTMLElement | null = null;
    let targetZone: DockZone | null = null;
    let insertIndex = -1;
    let shiftedButtons: HTMLElement[] = [];

    const validZones = engine.getValidDropZones(id);
    if (validZones.length === 0) return;

    const dropTargets = buildDropTargetMap(siteContainer, validZones);
    if (dropTargets.length === 0) return;

    function createGhost(): HTMLElement {
      const g = document.createElement("div");
      g.dataset.dragGhost = "";
      g.textContent = button.textContent;
      g.style.position = "fixed";
      g.style.pointerEvents = "none";
      g.style.opacity = "0.7";
      g.style.padding = "6px 12px";
      g.style.background = "var(--pages-accent-3, #e0e7ff)";
      g.style.borderRadius = "var(--pages-radius-sm, 4px)";
      g.style.fontSize = "14px";
      g.style.zIndex = "10000";
      g.style.boxShadow = "var(--pages-shadow-2, 0 2px 8px rgba(0,0,0,0.15))";
      document.body.appendChild(g);
      return g;
    }

    function clearInsertPreview(): void {
      if (insertLine) { insertLine.remove(); insertLine = null; }
      for (const b of shiftedButtons) {
        b.style.transform = "";
        if (b.hasAttribute("data-dock-empty")) {
          b.style.background = "";
          b.style.borderRadius = "";
        }
      }
      shiftedButtons = [];
    }

    function showInsertPreview(target: DropTarget, cursorY: number): number {
      clearInsertPreview();
      const group = target.element;
      const buttons = Array.from(group.querySelectorAll<HTMLElement>("button[data-dock-panel-id]"));
      const bar = group.closest("[data-component-type='dock-bar']");
      const isVertical = bar?.getAttribute("aria-orientation") === "vertical";
      const isFallbackTarget = (group as HTMLElement).hasAttribute("data-component-type");
      const isEmpty = (group as HTMLElement).hasAttribute("data-dock-empty");

      if (isEmpty || isFallbackTarget) {
        const line = document.createElement("div");
        line.dataset.dropIndicator = "";
        line.style.pointerEvents = "none";
        line.style.zIndex = "9999";
        line.style.height = "2px";
        line.style.width = "100%";
        line.style.background = "var(--pages-accent-7, #6366f1)";
        line.style.borderRadius = "1px";
        if (isFallbackTarget) line.style.marginTop = "auto";
        group.appendChild(line);
        insertLine = line;
        return 0;
      }

      let idx = buttons.length;
      for (let i = 0; i < buttons.length; i++) {
        const rect = buttons[i]!.getBoundingClientRect();
        const mid = isVertical ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
        const cursor = isVertical ? cursorY : cursorY;
        if (cursor < mid) { idx = i; break; }
      }

      const line = document.createElement("div");
      line.dataset.dropIndicator = "";
      line.style.pointerEvents = "none";
      line.style.zIndex = "9999";
      if (isVertical) {
        line.style.height = "2px";
        line.style.width = "100%";
        line.style.background = "var(--pages-accent-7, #6366f1)";
        line.style.borderRadius = "1px";
      } else {
        line.style.width = "2px";
        line.style.height = "100%";
        line.style.background = "var(--pages-accent-7, #6366f1)";
        line.style.borderRadius = "1px";
      }

      if (idx < buttons.length) {
        buttons[idx]!.insertAdjacentElement("beforebegin", line);
      } else {
        group.appendChild(line);
      }
      insertLine = line;

      const shift = isVertical ? "translateY(4px)" : "translateX(4px)";
      for (let i = idx; i < buttons.length; i++) {
        buttons[i]!.style.transform = shift;
        shiftedButtons.push(buttons[i]!);
      }

      return idx;
    }

    function hitTest(x: number, y: number): DropTarget | null {
      for (const target of dropTargets) {
        const rect = target.element.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          return target;
        }
      }
      return null;
    }

    function onMouseMove(e: MouseEvent): void {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!dragging) {
        if (Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
        dragging = true;
        ghost = createGhost();
        button.style.opacity = "0.3";
      }

      if (ghost) {
        ghost.style.left = `${String(e.clientX + 12)}px`;
        ghost.style.top = `${String(e.clientY - 12)}px`;
      }

      const hit = hitTest(e.clientX, e.clientY);
      const hitZone = hit?.zone ?? null;
      if (hit) {
        insertIndex = showInsertPreview(hit, e.clientY);
        targetZone = hitZone;
      } else if (hitZone !== targetZone) {
        clearInsertPreview();
        targetZone = hitZone;
        insertIndex = -1;
      }
    }

    function onMouseUp(): void {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);

      if (ghost) {
        ghost.remove();
        ghost = null;
      }
      clearInsertPreview();
      button.style.opacity = "";

      if (dragging && targetZone) {
        const currentZone = engine.zoneMap.get(id) ?? "";
        siteContainer.dispatchEvent(new CustomEvent("pages-dock-rearrange", {
          bubbles: true,
          composed: true,
          detail: {
            panelKey: id,
            fromZone: currentZone,
            toZone: targetZone,
            insertIndex: insertIndex >= 0 ? insertIndex : undefined,
          },
        }));
      }
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, signal ? { signal } : undefined);
}
