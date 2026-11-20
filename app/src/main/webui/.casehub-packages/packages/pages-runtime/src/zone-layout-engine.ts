import type { Component, DockZone, DockSide, DockPanelConfig, DockWorkbenchConfig } from "@casehubio/pages-component";
import { normalizeConfig, buildInitialZoneMap, buildTreeFromZones } from "@casehubio/pages-ui/dist/dsl/builders.js";

const ALL_ZONES: readonly DockZone[] = [
  "left-top", "left-bottom",
  "right-top", "right-bottom",
  "bottom-left", "bottom-right",
];

export interface ZoneLayoutEngine {
  readonly config: DockWorkbenchConfig;
  readonly zoneMap: ReadonlyMap<string, DockZone>;
  buildTree(): Component;
  movePanel(panelKey: string, targetZone: DockZone, insertIndex?: number): Component;
  getConstraints(panelKey: string): { allowedZones: readonly DockZone[]; fixed: boolean };
  getValidDropZones(panelKey: string): readonly DockZone[];
  getZoneOrder(zone: DockZone): readonly string[];
}

export function createZoneLayoutEngine(
  config: DockWorkbenchConfig,
  savedZones?: Readonly<Record<string, DockZone>>,
): ZoneLayoutEngine {
  const normalized = normalizeConfig(config);
  let zoneMap = buildInitialZoneMap(normalized, savedZones);
  const zoneOrder = new Map<DockZone, string[]>();

  const allPanels = new Map<string, { panel: DockPanelConfig; side: DockSide }>();
  for (const sideKey of ["left", "right", "bottom"] as const) {
    const sideConfig = normalized[sideKey];
    if (!sideConfig) continue;
    for (const panel of sideConfig.panels) {
      allPanels.set(panel.key, { panel, side: sideConfig.side });
    }
  }

  function rebuildZoneOrder(): void {
    zoneOrder.clear();
    for (const [key, zone] of zoneMap) {
      const list = zoneOrder.get(zone) ?? [];
      list.push(key);
      zoneOrder.set(zone, list);
    }
  }
  rebuildZoneOrder();

  return {
    config,
    get zoneMap() { return new Map(zoneMap); },

    buildTree(): Component {
      return buildTreeFromZones(normalized, zoneMap, zoneOrder);
    },

    movePanel(panelKey: string, targetZone: DockZone, insertIndex?: number): Component {
      const currentZone = zoneMap.get(panelKey);
      if (currentZone) {
        const currentList = zoneOrder.get(currentZone);
        if (currentList) {
          const idx = currentList.indexOf(panelKey);
          if (idx >= 0) currentList.splice(idx, 1);
        }
      }
      const newMap = new Map(zoneMap);
      newMap.set(panelKey, targetZone);
      zoneMap = newMap;
      const targetList = zoneOrder.get(targetZone) ?? [];
      if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= targetList.length) {
        targetList.splice(insertIndex, 0, panelKey);
      } else {
        targetList.push(panelKey);
      }
      zoneOrder.set(targetZone, targetList);
      return this.buildTree();
    },

    getConstraints(panelKey: string) {
      const entry = allPanels.get(panelKey);
      if (!entry) return { allowedZones: [] as readonly DockZone[], fixed: true };
      return {
        allowedZones: entry.panel.allowedZones ?? ALL_ZONES,
        fixed: entry.panel.fixed ?? false,
      };
    },

    getValidDropZones(panelKey: string): readonly DockZone[] {
      const { allowedZones, fixed } = this.getConstraints(panelKey);
      if (fixed) return [];
      return [...allowedZones];
    },

    getZoneOrder(zone: DockZone): readonly string[] {
      return zoneOrder.get(zone) ?? [];
    },
  };
}
