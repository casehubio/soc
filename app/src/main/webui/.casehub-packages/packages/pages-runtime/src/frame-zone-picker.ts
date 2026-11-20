import type { SnapZone } from "@casehubio/pages-component";

export const ZONES: Array<{ zone: SnapZone; label: string; col: number; row: number; colSpan?: number; rowSpan?: number }> = [
  { zone: "top-left", label: "↖", col: 1, row: 1 },
  { zone: "top", label: "↑", col: 2, row: 1 },
  { zone: "top-right", label: "↗", col: 3, row: 1 },
  { zone: "left", label: "←", col: 1, row: 2 },
  { zone: "full", label: "⊞", col: 2, row: 2 },
  { zone: "right", label: "→", col: 3, row: 2 },
  { zone: "bottom-left", label: "↙", col: 1, row: 3 },
  { zone: "bottom", label: "↓", col: 2, row: 3 },
  { zone: "bottom-right", label: "↘", col: 3, row: 3 },
];

export function createZoneGrid(
  onSnap: (zone: SnapZone) => void,
  currentZone?: SnapZone,
): HTMLElement {
  const dropdown = document.createElement("div");
  dropdown.style.cssText = "position:absolute;z-index:99999;pointer-events:auto;display:grid;grid-template-columns:repeat(3,28px);grid-template-rows:repeat(3,28px);gap:2px;padding:6px;background:var(--pages-neutral-2,#1e293b);border:1px solid var(--pages-neutral-4,#475569);border-radius:var(--pages-radius-sm,4px);box-shadow:0 4px 12px rgba(0,0,0,0.3);";

  for (const z of ZONES) {
    const cell = document.createElement("button");
    cell.title = z.zone;
    cell.textContent = z.label;
    const isActive = currentZone === z.zone;
    cell.style.cssText = `grid-column:${z.col};grid-row:${z.row};border:1px solid var(--pages-neutral-4,#475569);border-radius:2px;background:${isActive ? "var(--pages-accent-3,#3b82f6)" : "var(--pages-neutral-3,#334155)"};color:var(--pages-neutral-9,#e2e8f0);cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;padding:0;`;
    cell.addEventListener("mouseenter", () => { cell.style.background = "var(--pages-accent-3,#3b82f6)"; });
    cell.addEventListener("mouseleave", () => { cell.style.background = isActive ? "var(--pages-accent-3,#3b82f6)" : "var(--pages-neutral-3,#334155)"; });
    cell.addEventListener("click", (e) => { e.stopPropagation(); onSnap(z.zone); });
    dropdown.appendChild(cell);
  }

  return dropdown;
}


