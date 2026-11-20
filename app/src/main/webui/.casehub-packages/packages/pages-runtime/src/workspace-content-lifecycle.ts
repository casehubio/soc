import type { FrameConfig } from "@casehubio/pages-component";
import type { FloatingFrameEngine } from "./floating-frame-engine.js";
import type { FloatingFrameBackend } from "./floating-frame-backend.js";

export interface NestedWorkspaceRef {
  engine: FloatingFrameEngine | undefined;
}

export interface ContentManager {
  getRef(tabKey: string): NestedWorkspaceRef;
  getNestedEngine(tabKey: string): FloatingFrameEngine | undefined;
  isInAccordionMode(tabKey: string): boolean;
  setEngine(engine: FloatingFrameEngine): void;
  reconnectOrCreate(
    engine: FloatingFrameEngine,
    backend: FloatingFrameBackend,
    ref: NestedWorkspaceRef,
    configs?: readonly FrameConfig[],
  ): void;
}

export function createContentManager(): ContentManager {
  const refs = new Map<string, NestedWorkspaceRef>();
  let engineRef: FloatingFrameEngine | undefined;

  const manager: ContentManager = {
    getRef(tabKey: string): NestedWorkspaceRef {
      let ref = refs.get(tabKey);
      if (!ref) {
        ref = { engine: undefined };
        refs.set(tabKey, ref);
      }
      return ref;
    },

    getNestedEngine(tabKey: string): FloatingFrameEngine | undefined {
      return refs.get(tabKey)?.engine;
    },

    isInAccordionMode(tabKey: string): boolean {
      if (!engineRef) return false;
      for (const frame of engineRef.frames.values()) {
        if (frame.viewMode === "accordion" && frame.tabs.some(t => t.key === tabKey)) {
          return true;
        }
      }
      return false;
    },

    setEngine(engine: FloatingFrameEngine): void {
      engineRef = engine;
    },

    reconnectOrCreate(
      engine: FloatingFrameEngine,
      backend: FloatingFrameBackend,
      ref: NestedWorkspaceRef,
      configs?: readonly FrameConfig[],
    ): void {
      if (ref.engine) {
        engine.setBackend(backend);
        engine.renderAll();
      } else {
        ref.engine = engine;
        if (configs) {
          for (const config of configs) {
            engine.createFrame(config);
          }
        }
      }
      for (const frame of engine.frames.values()) {
        backend.updatePosition(frame.key, frame.position);
        backend.updateSize(frame.key, frame.size);
      }
    },
  };

  return manager;
}
