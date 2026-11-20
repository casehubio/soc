import type { FrameLayout, FrameConfig, ContainerState } from "@casehubio/pages-component";
import type { FreeLayoutState, FreeLayoutEntry } from "./frame-sandbox/types.js";

export function migrateFrameLayout(frames: readonly FrameLayout[]): ContainerState {
  const sorted = [...frames].sort((a, b) => a.order - b.order);

  const tabs = sorted.map(frame => ({
    key: frame.key,
    label: frame.tabs[0]?.label ?? frame.key,
    content: null,
    children: frame.containerTree ?? {
      layout: "tabbed" as const,
      tabs: frame.tabs.map(t => ({
        key: t.key,
        label: t.label,
        content: t.content,
        ...(t.children ? { children: t.children } : {}),
      })),
      layoutState: {
        activeKey: frame.activeTabKey,
        order: frame.tabs.map(t => t.key),
      },
    },
  }));

  const entries: Record<string, FreeLayoutEntry> = {};
  for (const frame of sorted) {
    entries[frame.key] = {
      position: { x: frame.position.x, y: frame.position.y },
      size: { width: frame.size.width, height: frame.size.height },
    };
  }

  const zOrder = [...frames]
    .sort((a, b) => a.zIndex - b.zIndex)
    .map(f => f.key);

  const layoutState: FreeLayoutState = { entries, zOrder };

  return { layout: "free", tabs, layoutState };
}

export function configToContainerState(configs: readonly FrameConfig[]): ContainerState {
  const tabs = configs.map(config => ({
    key: config.key,
    label: config.tabs[0]?.label ?? config.key,
    content: null,
    children: {
      layout: (config.viewMode === "accordion" ? "accordion" : "tabbed") as "accordion" | "tabbed",
      tabs: config.tabs.map(t => ({ key: t.key, label: t.label, content: t.content })),
    },
  }));

  const entries: Record<string, FreeLayoutEntry> = {};
  for (let i = 0; i < configs.length; i++) {
    const config = configs[i]!;
    entries[config.key] = {
      position: config.position ?? { x: 50 + i * 30, y: 50 + i * 30 },
      size: config.size ?? { width: 400, height: 300 },
    };
  }

  const layoutState: FreeLayoutState = { entries, zOrder: configs.map(c => c.key) };
  return { layout: "free", tabs, layoutState };
}
