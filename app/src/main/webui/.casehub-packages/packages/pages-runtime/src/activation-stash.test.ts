import { describe, it, expect, vi } from "vitest";
import type { Component, ContainerState } from "@casehubio/pages-component";
import { ALLOW_ALL } from "@casehubio/pages-component";
import type { Container } from "./frame-sandbox/types.js";
import type { ComponentRegistry } from "./registry.js";
import type { PagePathMap } from "./page-paths.js";

const { createActivationCallback } = await import("./activation.js");

describe("floating-workspace container persistence", () => {
  it("creates workspace from config when no stash", async () => {
    const registry: ComponentRegistry = new Map();
    const pagePathMap: PagePathMap = new Map();

    const wsRef: { rootContainer: Container | undefined; stash: ContainerState | undefined } = {
      rootContainer: undefined,
      stash: undefined,
    };

    const callback = createActivationCallback(registry, pagePathMap, {
      nestingDepth: 0,
      permissions: ALLOW_ALL,
      floatingWorkspaceRef: wsRef,
      pageIndex: new Map(),
      dataSetScope: new Map(),
      dataScopeRegistry: { get: () => undefined, set: () => {} },
      saveConfigRegistry: { has: () => false, get: () => undefined, set: () => {} },
      lazyPageResolutions: new Map(),
      fetchFn: globalThis.fetch,
      baseUrl: undefined,
      abortSignal: new AbortController().signal,
    } as any);

    const component: Component = {
      type: "floating-workspace",
      props: {
        centre: { type: "html", props: { content: "" } },
        frames: [{
          key: "outline",
          tabs: [{ key: "outline-tab", label: "Outline", content: { type: "html", props: { content: "" } } }],
          position: { x: 20, y: 20 },
          size: { width: 300, height: 200 },
        }],
      },
    };

    const el = document.createElement("div");
    el.dataset.componentId = "test-fw";
    el.dataset.componentType = "floating-workspace";
    pagePathMap.set(component, "test");
    callback(el, component);

    await vi.waitFor(() => {
      expect(wsRef.rootContainer).toBeDefined();
    });

    expect(wsRef.rootContainer!.entries).toHaveLength(1);
    expect(wsRef.rootContainer!.entries[0]!.key).toBe("outline");
  });
});
