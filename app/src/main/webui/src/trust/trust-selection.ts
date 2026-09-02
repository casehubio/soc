import { onPagesEvent, emitPagesEvent } from "../types/pages-events";
import type { RoutingRationaleData } from "@casehubio/blocks-ui-routing-rationale";
import "@casehubio/blocks-ui-routing-rationale";

export function wireTrustCaseSelection(): void {
  loadRecentCases();

  onPagesEvent<{ id: string }>(document, "trust:case-selected", async ({ id }) => {
    if (!id) {
      clearDrillDown();
      return;
    }

    highlightSelectedCase(id);

    const [rationaleResp, cbrResp] = await Promise.all([
      fetch(`/api/soc/trust/routing/${id}`),
      fetch(`/api/soc/cbr/similar/${id}`),
    ]);

    const container = document.getElementById("trust-rationale-container");
    if (container && rationaleResp.ok) {
      const rationales: RoutingRationaleData[] = await rationaleResp.json();
      container.innerHTML = "";
      if (rationales.length === 0) {
        container.innerHTML = `<p style="color: #666;">No routing data for this case</p>`;
      } else {
        for (const r of rationales) {
          const el = document.createElement("blocks-routing-rationale");
          (el as any).data = r;
          container.appendChild(el);
        }
      }
    }

    const cbrSummary = document.getElementById("trust-cbr-summary") as any;
    if (cbrSummary && cbrResp.ok) {
      const cbrData = await cbrResp.json();
      cbrSummary.summaryData = cbrData.summary;
      cbrSummary.incidents = cbrData.incidents;
    }
  });
}

export function initTrustFromUrl(): void {
  const hash = location.hash;
  const match = hash.match(/trust\/([a-f0-9-]+)/);
  if (match) {
    emitPagesEvent(document, "trust:case-selected", { id: match[1] });
  }
}

async function loadRecentCases(): Promise<void> {
  const listEl = document.getElementById("trust-cases-list");
  if (!listEl) return;

  try {
    const resp = await fetch("/api/soc/incidents?size=20");
    if (!resp.ok) { listEl.textContent = "Failed to load cases"; return; }
    const data = await resp.json();
    const entities = data.entities ?? [];

    if (entities.length === 0) {
      listEl.textContent = "No recent cases";
      return;
    }

    listEl.innerHTML = "";
    for (const inc of entities) {
      const row = document.createElement("div");
      row.className = "trust-case-row";
      row.dataset.caseId = inc.id;
      row.style.cssText = "padding: 0.4rem 0.5rem; cursor: pointer; border-bottom: 1px solid #eee; font-size: 0.85rem; display: flex; gap: 0.5rem; align-items: center;";

      const severityBadge = document.createElement("span");
      severityBadge.textContent = inc.severity ?? "—";
      severityBadge.style.cssText = "font-size: 0.7rem; padding: 1px 6px; border-radius: 3px; background: #e5e7eb; font-weight: 600;";

      const title = document.createElement("span");
      title.textContent = inc.title ?? inc.id.substring(0, 8);
      title.style.cssText = "flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;";

      row.appendChild(severityBadge);
      row.appendChild(title);

      row.addEventListener("click", () => {
        emitPagesEvent(document, "trust:case-selected", { id: inc.id });
      });
      listEl.appendChild(row);
    }
  } catch {
    if (listEl) listEl.textContent = "Failed to load cases";
  }
}

function highlightSelectedCase(id: string): void {
  document.querySelectorAll(".trust-case-row").forEach(el => {
    (el as HTMLElement).style.background = (el as HTMLElement).dataset.caseId === id
      ? "var(--pages-primary-2, #dbeafe)" : "";
  });
}

function clearDrillDown(): void {
  const container = document.getElementById("trust-rationale-container");
  if (container) container.innerHTML = `<p style="color: #666;">Select a case to view routing rationale</p>`;
  const cbr = document.getElementById("trust-cbr-summary") as any;
  if (cbr) { cbr.summaryData = null; cbr.incidents = []; }
  document.querySelectorAll(".trust-case-row").forEach(el => {
    (el as HTMLElement).style.background = "";
  });
}
