import { rows, columns, html as pagesHtml } from "@casehubio/pages-ui";
import type { Component } from "@casehubio/pages-ui";
import "@casehubio/blocks-ui-trust-score-panel";
import "@casehubio/blocks-ui-routing-rationale";
import "@casehubio/blocks-ui-similarity-panel";
import "./soc-cbr-summary.js";

const SOC_AGENTS = [
  "soc:rule-ioc-enrichment", "soc:llm-ioc-enrichment",
  "soc:rule-attck-mapping",  "soc:llm-attck-mapping",
  "soc:rule-containment-rec","soc:llm-containment-rec",
];

export function trustView(): Component {
  return rows(
    fleetOverview(),
    drillDown()
  );
}

function fleetOverview(): Component {
  const kpiRow = `<blocks-kpi-metric-row endpoint="/api/soc/trust/fleet-kpis"></blocks-kpi-metric-row>`;
  const panels = SOC_AGENTS.map(id =>
    `<blocks-trust-score-panel mode="compact" endpoint="/api/soc" actor-id="${id}"></blocks-trust-score-panel>`
  ).join("");
  return pagesHtml(`
    <div style="padding: 1rem;">
      ${kpiRow}
      <div class="trust-fleet-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 1rem;">
        ${panels}
      </div>
    </div>
  `);
}

function drillDown(): Component {
  return columns([25, 40, 35],
    [recentCasesList()],
    [routingRationale()],
    [similaritySection()]
  );
}

function recentCasesList(): Component {
  return pagesHtml(`<div id="trust-recent-cases" style="padding: 0.5rem;">
    <strong style="font-size: 0.85rem; color: #666;">Recent Cases</strong>
    <div id="trust-cases-list" style="margin-top: 0.5rem;">Loading...</div>
  </div>`);
}

function routingRationale(): Component {
  return pagesHtml(`<div id="trust-rationale-container" style="padding: 0.5rem;">
    <p style="color: #666;">Select a case to view routing rationale</p>
  </div>`);
}

function similaritySection(): Component {
  return pagesHtml(`<soc-cbr-summary id="trust-cbr-summary"></soc-cbr-summary>`);
}

export { wireTrustCaseSelection, initTrustFromUrl } from "./trust-selection.js";
