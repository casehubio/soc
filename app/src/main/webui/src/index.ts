import { loadSite } from "@casehubio/pages-runtime";
import { page, sidebar, html } from "@casehubio/pages-ui";
import { incidentsView, wireIncidentSelection } from "./incidents/incidents-view.js";
import { initSelectionFromUrl } from "./incidents/incident-selection.js";
import { workbenchView, wireWorkbenchSelection } from "./workbench/workbench-view.js";
import { initWorkbenchFromUrl } from "./workbench/workbench-selection.js";
import { trustView, wireTrustCaseSelection, initTrustFromUrl } from "./trust/trust-view.js";
import "@casehubio/blocks-ui-notification-inbox";

const placeholder = (name: string, phase: string) =>
  html(`<div style="padding: 2rem; color: #666;">
    <h2>${name}</h2>
    <p>View not yet implemented — see ${phase} plan.</p>
  </div>`);

const app = page("SOC — Incident Response",
  sidebar(
    ["Incidents", incidentsView()],
    ["Workbench", workbenchView()],
    ["Trust", trustView()],
    ["Compliance", placeholder("Compliance", "Phase 4")],
  )
);

async function boot() {
  const container = document.getElementById("app");
  if (!container) return;

  const site = await loadSite(container, app);

  if (!location.hash) {
    site.navigate("Incidents");
  }

  wireIncidentSelection();
  initSelectionFromUrl();
  wireWorkbenchSelection();
  initWorkbenchFromUrl();
  wireTrustCaseSelection();
  initTrustFromUrl();

  const bell = document.createElement("blocks-notification-bell");
  bell.setAttribute("endpoint", "/notifications");
  bell.style.position = "fixed";
  bell.style.top = "1rem";
  bell.style.right = "1rem";
  bell.style.zIndex = "1000";
  container.appendChild(bell);
}

boot().catch(console.error);
