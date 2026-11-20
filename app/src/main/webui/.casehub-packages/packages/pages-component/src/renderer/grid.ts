import type { GridPlacement } from "../model/types.js";

export function applyGridPlacement(
  element: HTMLElement,
  placement: GridPlacement,
): void {
  element.style.gridColumn = `${String(placement.x + 1)} / span ${String(placement.w)}`;
  element.style.gridRow = `${String(placement.y + 1)} / span ${String(placement.h)}`;
}
