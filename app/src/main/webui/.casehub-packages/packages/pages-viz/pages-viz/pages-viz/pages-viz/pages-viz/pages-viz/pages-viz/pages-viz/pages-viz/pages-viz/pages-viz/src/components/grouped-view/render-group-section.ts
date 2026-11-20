import type { GroupBoundary } from "./group-extraction.js";

export function renderGroupSectionHeader(
  boundary: GroupBoundary,
  expanded: boolean,
  instanceId: string,
  index: number,
  showSummary: boolean,
): HTMLElement {
  const section = document.createElement("div");
  section.className = "group-section";

  const btn = document.createElement("button");
  btn.className = "section-toggle";
  btn.setAttribute("aria-expanded", String(expanded));
  btn.setAttribute("aria-controls", `${instanceId}-group-${index}`);
  btn.setAttribute("data-group", boundary.name);

  const chevron = document.createElement("span");
  chevron.className = expanded ? "section-chevron expanded" : "section-chevron";
  chevron.textContent = "▶";

  const title = document.createElement("span");
  title.className = "section-title";
  title.textContent = boundary.name;

  const summary = document.createElement("span");
  summary.className = "section-summary";
  let summaryText = `${boundary.rowCount} items`;
  if (showSummary && boundary.aggregates.size > 0) {
    summaryText += " · " + Array.from(boundary.aggregates.values())
      .map((v) => String(v))
      .join(", ");
  }
  summary.textContent = summaryText;

  btn.append(chevron, title, summary);
  section.appendChild(btn);
  return section;
}
