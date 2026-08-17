import { loadSite } from "@casehubio/pages-runtime";
import { page, sidebar, html } from "@casehubio/pages-ui";
import { incidentsView, wireIncidentSelection } from "./incidents/incidents-view.js";
import { initSelectionFromUrl } from "./incidents/incident-selection.js";

const placeholder = (name: string, phase: string) =>
  html(`<div style="padding: 2rem; color: #666;">
    <h2>${name}</h2>
    <p>View not yet implemented — see ${phase} plan.</p>
  </div>`);

const app = page("SOC — Incident Response",
  sidebar(
    ["Incidents", incidentsView()],
    ["Workbench", placeholder("Workbench", "Phase 2")],
    ["Trust", placeholder("Trust", "Phase 3")],
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
}

boot().catch(console.error);
