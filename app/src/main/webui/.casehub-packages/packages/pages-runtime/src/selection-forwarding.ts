import type { ComponentRegistry } from "./registry.js";
import type { HostPanelProps } from "@casehubio/pages-component";

let dispatching = false;

export function dispatchSelectionToHostPanels(
  registry: ComponentRegistry,
  sourceDatasetId: string,
  selectedRow: Record<string, unknown> | null,
): void {
  if (dispatching) return;
  dispatching = true;
  try {
    for (const [, entry] of registry) {
      if (entry.component.type !== "host-panel") continue;
      const props = entry.component.props as HostPanelProps | undefined;
      if (props?.selectionSource !== sourceDatasetId) continue;
      entry.element.dispatchEvent(new CustomEvent("pages-selection-changed", {
        bubbles: true,
        composed: true,
        detail: { sourceDatasetId, selectedRow },
      }));
    }
  } finally {
    dispatching = false;
  }
}

export function dispatchSelectionClearAll(
  registry: ComponentRegistry,
): void {
  if (dispatching) return;
  dispatching = true;
  try {
    for (const [, entry] of registry) {
      if (entry.component.type !== "host-panel") continue;
      const props = entry.component.props as HostPanelProps | undefined;
      if (!props?.selectionSource) continue;
      entry.element.dispatchEvent(new CustomEvent("pages-selection-changed", {
        bubbles: true,
        composed: true,
        detail: { sourceDatasetId: props.selectionSource, selectedRow: null },
      }));
    }
  } finally {
    dispatching = false;
  }
}
