import type { GroupBoundary } from "./group-extraction.js";

export function renderGroupTableRowHeader(
  boundary: GroupBoundary,
  expanded: boolean,
  instanceId: string,
  index: number,
  showSummary: boolean,
): HTMLElement {
  const section = document.createElement("div");
  section.className = "group-section spreadsheet-group";

  const btn = document.createElement("button");
  btn.className = "group-toggle";
  btn.setAttribute("aria-expanded", String(expanded));
  btn.setAttribute("aria-controls", `${instanceId}-group-${index}`);
  btn.setAttribute("data-group", boundary.name);

  const chevron = document.createElement("span");
  chevron.className = "group-chevron";
  chevron.textContent = expanded ? "▼" : "▶";

  let text = `${boundary.name} (${boundary.rowCount})`;
  if (showSummary && boundary.aggregates.size > 0) {
    text += " · " + Array.from(boundary.aggregates.values())
      .map((v) => String(v))
      .join(", ");
  }

  const label = document.createElement("span");
  label.textContent = text;

  btn.append(chevron, label);
  section.appendChild(btn);
  return section;
}
