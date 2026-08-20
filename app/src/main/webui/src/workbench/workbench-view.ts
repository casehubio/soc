import { columns, rows, html as pagesHtml } from "@casehubio/pages-ui";
import type { Component } from "@casehubio/pages-ui";
import { onWorkItemSelected } from "./workbench-selection.js";
import { wireTriageGate } from "./soc-triage-gate.js";
import type { OutcomeDefinition } from "./soc-triage-gate.js";

import "@casehubio/blocks-ui-work-item-inbox";
import "@casehubio/blocks-ui-sla-indicator";
import "@casehubio/blocks-ui-approval-gate";

export function workbenchView(): Component {
  return columns(
    [40, 60],
    [listPane()],
    [detailPane()],
  );
}

function listPane(): Component {
  return pagesHtml(`<blocks-work-item-inbox
    id="workbench-inbox"
    endpoint="/workitems"
  ></blocks-work-item-inbox>`);
}

function detailPane(): Component {
  return rows(
    pagesHtml(`<div id="workbench-detail" style="display:none; padding: 1rem;">
      <blocks-sla-indicator id="workbench-sla" compact></blocks-sla-indicator>

      <div id="workbench-context" style="margin: 0.5rem 0;"></div>

      <blocks-approval-gate id="workbench-gate"></blocks-approval-gate>

      <div id="workbench-notes" style="margin-top: 1rem;">
        <textarea id="note-input" placeholder="Add investigation note..." rows="3"
          style="width: 100%; font-family: inherit; padding: 0.5rem; border: 1px solid var(--pages-neutral-6, #ccc); border-radius: 4px;"></textarea>
        <button id="note-submit" style="margin-top: 0.5rem; padding: 0.5rem 1rem; cursor: pointer;">Add Note</button>
      </div>

      <div id="workbench-ioc-form" style="margin-top: 1rem; padding: 1rem; background: var(--pages-neutral-2, #f5f5f5); border-radius: 8px;">
        <strong>Submit IOC</strong>
        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: center;">
          <select id="ioc-type" style="padding: 0.4rem;">
            <option value="IP">IP</option>
            <option value="HASH">Hash</option>
            <option value="DOMAIN">Domain</option>
            <option value="URL">URL</option>
            <option value="EMAIL">Email</option>
          </select>
          <input id="ioc-value" type="text" placeholder="IOC value" style="flex: 1; padding: 0.4rem;" />
          <label style="font-size: 0.85rem;">Confidence:
            <input id="ioc-confidence" type="range" min="0" max="1" step="0.05" value="0.5" />
          </label>
          <button id="ioc-submit" style="padding: 0.4rem 1rem; cursor: pointer;">Submit</button>
        </div>
      </div>
    </div>`),
  );
}

export function wireWorkbenchSelection(): void {
  onWorkItemSelected(async (workItemId, incidentId) => {
    const detail = document.getElementById("workbench-detail");
    if (!detail) return;

    if (!workItemId || !incidentId) {
      detail.style.display = "none";
      return;
    }
    detail.style.display = "block";

    const [iocsResp, attckResp] = await Promise.all([
      fetch(`/api/soc/incidents/${incidentId}/iocs`),
      fetch(`/api/soc/incidents/${incidentId}/attck`),
    ]);
    const iocs = iocsResp.ok ? await iocsResp.json() : { iocs: [] };
    const attck = attckResp.ok ? await attckResp.json() : { techniques: [] };

    const contextEl = document.getElementById("workbench-context");
    if (contextEl) {
      const iocCount = iocs?.iocs?.length ?? 0;
      const techCount = attck?.techniques?.length ?? 0;
      contextEl.innerHTML = `
        <div style="padding: 0.75rem; background: var(--pages-neutral-2, #f5f5f5); border-radius: 8px;">
          <strong>Investigation Summary</strong>
          <p style="margin: 0.25rem 0 0;">${iocCount} IOC(s) detected &middot; ${techCount} ATT&amp;CK technique(s) mapped</p>
        </div>
      `;
    }

    const sla = document.getElementById("workbench-sla") as HTMLElement & {
      deadline?: string;
    };
    const wiDetail = await fetch(`/workitems/${workItemId}`).then((r) =>
      r.json(),
    );
    if (sla && wiDetail?.item?.expiresAt) {
      sla.deadline = wiDetail.item.expiresAt;
    }

    const gate = document.getElementById("workbench-gate") as HTMLElement & {
      outcomes?: OutcomeDefinition[];
      prompt?: string;
      deadline?: string;
    };
    if (gate) {
      const clone = gate.cloneNode(false) as typeof gate;
      gate.replaceWith(clone);
      wireTriageGate(
        clone,
        workItemId,
        wiDetail?.item?.expiresAt ?? null,
        "current-user",
      );
    }

    const noteSubmit = document.getElementById("note-submit");
    const noteInput = document.getElementById(
      "note-input",
    ) as HTMLTextAreaElement | null;
    if (noteSubmit && noteInput) {
      noteSubmit.onclick = async () => {
        const text = noteInput.value.trim();
        if (!text) return;
        const channels = await fetch(
          `/api/soc/incidents/${incidentId}/channels`,
        ).then((r) => r.json());
        const observeChannel = (
          channels as Array<{ name?: string; id?: string }>
        )?.find?.((c) => c.name === "observe");
        if (observeChannel?.id) {
          await fetch(
            `/api/qhorus/channels/${observeChannel.id}/messages`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                speechAct: "INFORM",
                content: text,
              }),
            },
          );
          noteInput.value = "";
        }
      };
    }

    const iocSubmit = document.getElementById("ioc-submit");
    if (iocSubmit) {
      iocSubmit.onclick = async () => {
        const type = (
          document.getElementById("ioc-type") as HTMLSelectElement
        )?.value;
        const value = (
          document.getElementById("ioc-value") as HTMLInputElement
        )?.value;
        const confidence = parseFloat(
          (document.getElementById("ioc-confidence") as HTMLInputElement)
            ?.value ?? "0.5",
        );
        if (!type || !value) return;
        await fetch(`/api/soc/incidents/${incidentId}/iocs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, value, confidence }),
        });
        (document.getElementById("ioc-value") as HTMLInputElement).value = "";
      };
    }
  });
}
