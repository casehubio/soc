import { loadSite } from "@casehubio/pages-runtime";
import { page, sidebar, html } from "@casehubio/pages-ui";

const placeholder = (name: string, phase: string) =>
  html(`<div style="padding: 2rem; color: #666;">
    <h2>${name}</h2>
    <p>View not yet implemented — see ${phase} plan.</p>
  </div>`);

const app = page("SOC — Incident Response",
  sidebar(
    ["Incidents", placeholder("Incidents", "Phase 1")],
    ["Workbench", placeholder("Workbench", "Phase 2")],
    ["Trust", placeholder("Trust", "Phase 3")],
    ["Compliance", placeholder("Compliance", "Phase 4")],
  )
);

const container = document.getElementById("app");
if (container) {
  loadSite(container, app).catch(console.error);
}
