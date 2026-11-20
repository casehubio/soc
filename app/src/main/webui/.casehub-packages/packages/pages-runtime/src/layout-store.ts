import type { LayoutState, LayoutStore } from "@casehubio/pages-component";

export type { LayoutStore };

export function createLocalLayoutStore(prefix = "pages-layout:"): LayoutStore {
  return {
    async load(key: string): Promise<LayoutState | null> {
      try {
        const raw = localStorage.getItem(prefix + key);
        if (raw === null) return null;
        return JSON.parse(raw) as LayoutState;
      } catch (err) {
        console.warn(`[pages] Failed to load layout "${key}":`, err);
        return null;
      }
    },

    async save(key: string, state: LayoutState): Promise<void> {
      try {
        localStorage.setItem(prefix + key, JSON.stringify(state));
      } catch (err) {
        console.warn(`[pages] Failed to save layout "${key}":`, err);
      }
    },

    async delete(key: string): Promise<void> {
      try {
        localStorage.removeItem(prefix + key);
      } catch (err) {
        console.warn(`[pages] Failed to delete layout "${key}":`, err);
      }
    },
  };
}
