import { columns, rows, tabs, html as pagesHtml } from "@casehubio/pages-ui";
import type { Component } from "@casehubio/pages-ui";
import { onIncidentSelected } from "./incident-selection.js";

import "../components/soc-attck-matrix.js";
import "../components/soc-ioc-panel.js";
import "../components/soc-alert-heatmap.js";

export function incidentsView(): Component {
  return columns([40, 60],
    [listPane()],
    [detailPane()]
  );
}

function listPane(): Component {
  return rows(
    pagesHtml(`<agency-case-explorer
      endpoint="/api/soc/incidents"
      entity-type="incident"
    ></agency-case-explorer>`),
    pagesHtml(`<agency-kpi-metric-row
      endpoint="/api/soc/kpis"
    ></agency-kpi-metric-row>`),
    pagesHtml(`<soc-alert-heatmap
      endpoint="/api/soc/alerts/heatmap"
    ></soc-alert-heatmap>`)
  );
}

function detailPane(): Component {
  return rows(
    pagesHtml(`<agency-timeline id="incident-timeline"></agency-timeline>`),
    tabs(
      ["Channels", pagesHtml(`<agency-channel-activity id="incident-channels"></agency-channel-activity>`)],
      ["ATT&CK", pagesHtml(`<soc-attck-matrix id="incident-attck"></soc-attck-matrix>`)],
      ["IOC", pagesHtml(`<soc-ioc-panel id="incident-iocs"></soc-ioc-panel>`)],
    )
  );
}

export function wireIncidentSelection(): void {
  onIncidentSelected(id => {
    const timeline = document.getElementById("incident-timeline") as HTMLElement & { endpoint?: string };
    const channels = document.getElementById("incident-channels") as HTMLElement & { endpoint?: string };
    const attck = document.getElementById("incident-attck") as HTMLElement & { endpoint?: string };
    const iocs = document.getElementById("incident-iocs") as HTMLElement & { endpoint?: string };

    if (id) {
      if (timeline) timeline.endpoint = `/api/soc/incidents/${id}/timeline`;
      if (channels) channels.endpoint = `/api/soc/incidents/${id}/channels`;
      if (attck) attck.endpoint = `/api/soc/incidents/${id}/attck`;
      if (iocs) iocs.endpoint = `/api/soc/incidents/${id}/iocs`;
    }
  });
}
