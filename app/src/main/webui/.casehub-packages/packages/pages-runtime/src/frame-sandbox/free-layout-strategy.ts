import type {
  Entry,
  ContentFactory,
  LayoutStrategy,
  LayoutCallbacks,
  FreeLayoutState,
  FreeLayoutEntry,
} from "./types.js";
import { injectFrameChrome, updatePinVisual } from "../frame-chrome.js";
import { createFrameShell, createFrameTitlebar, createFrameResizeHandles, wireTitlebarDrag } from "../frame-shell.js";
import { computeZonePreset, type Preset } from "../layout-math.js";
import { splitGeometry } from "../frame-boundaries.js";
import { createZoneGrid } from "../frame-zone-picker.js";
import { createFreeLayoutDnd } from "./free-layout-dnd.js";

const MIN_WIDTH = 100;
const MIN_HEIGHT = 80;

export function createFreeLayoutStrategy(
  initialState?: FreeLayoutState,
  callbacks?: LayoutCallbacks,
): LayoutStrategy {
  let containerEl: HTMLElement | null = null;
  let currentEntries: Entry[] = [];
  let factory: ContentFactory | null = null;
  const entryState = new Map<string, FreeLayoutEntry>();
  const frameElements = new Map<string, HTMLElement>();
  let zOrder: string[] = initialState?.zOrder ? [...initialState.zOrder] : [];
  const pinnedKeys = new Set<string>();
  let nextDefaultOffset = 0;
  let resizeObserver: ResizeObserver | null = null;
  let lastContainerSize: { width: number; height: number } | null = null;
  let freeHost: HTMLElement | null = null;
  let dndHandler: { dispose(): void } | null = null;

  function ensureContent(entry: Entry): HTMLElement {
    if (!entry.contentElement && factory) {
      const result = factory(entry);
      entry.contentElement = result.element;
      entry.contentDispose = result.dispose;
    }
    return entry.contentElement!;
  }

  function applyZOrder(): void {
    const unpinned = zOrder.filter(k => !pinnedKeys.has(k));
    const pinned = zOrder.filter(k => pinnedKeys.has(k));
    const ordered = [...unpinned, ...pinned];
    for (let i = 0; i < ordered.length; i++) {
      const el = frameElements.get(ordered[i]!);
      if (el) el.style.zIndex = String(i + 1);
    }
  }

  function handleResize(newWidth: number, newHeight: number): void {
    if (!lastContainerSize || lastContainerSize.width === 0 || lastContainerSize.height === 0 || entryState.size === 0) {
      lastContainerSize = { width: newWidth, height: newHeight };
      return;
    }
    const scaleX = newWidth / lastContainerSize.width;
    const scaleY = newHeight / lastContainerSize.height;
    if (Math.abs(scaleX - 1) < 0.01 && Math.abs(scaleY - 1) < 0.01) return;

    for (const [key, state] of entryState) {
      state.position = {
        x: Math.round(state.position.x * scaleX),
        y: Math.round(state.position.y * scaleY),
      };
      state.size = {
        width: Math.round(state.size.width * scaleX),
        height: Math.round(state.size.height * scaleY),
      };
      const el = frameElements.get(key);
      if (el) {
        el.style.left = `${state.position.x}px`;
        el.style.top = `${state.position.y}px`;
        el.style.width = `${state.size.width}px`;
        el.style.height = `${state.size.height}px`;
      }
    }
    lastContainerSize = { width: newWidth, height: newHeight };
  }

  function bringToFront(key: string): void {
    zOrder = zOrder.filter((k) => k !== key);
    zOrder.push(key);
    applyZOrder();
  }

  let activeDropdown: HTMLElement | null = null;

  function zoneToRect(zone: string, cw: number, ch: number): { x: number; y: number; w: number; h: number } {
    const hw = Math.floor(cw / 2), hh = Math.floor(ch / 2);
    switch (zone) {
      case "top-left": return { x: 0, y: 0, w: hw, h: hh };
      case "top": return { x: 0, y: 0, w: cw, h: hh };
      case "top-right": return { x: hw, y: 0, w: cw - hw, h: hh };
      case "left": return { x: 0, y: 0, w: hw, h: ch };
      case "full": return { x: 0, y: 0, w: cw, h: ch };
      case "right": return { x: hw, y: 0, w: cw - hw, h: ch };
      case "bottom-left": return { x: 0, y: hh, w: hw, h: ch - hh };
      case "bottom": return { x: 0, y: hh, w: cw, h: ch - hh };
      case "bottom-right": return { x: hw, y: hh, w: cw - hw, h: ch - hh };
      default: return { x: 0, y: 0, w: cw, h: ch };
    }
  }

  function showZonePicker(frameEl: HTMLElement, _key: string, state: FreeLayoutEntry): void {
    if (activeDropdown) { activeDropdown.remove(); activeDropdown = null; return; }
    const dropdown = createZoneGrid((zone) => {
      const host = freeHost ?? containerEl;
      if (!host) return;
      const r = zoneToRect(zone, host.clientWidth, host.clientHeight);
      state.position = { x: r.x, y: r.y }; state.size = { width: r.w, height: r.h };
      frameEl.style.left = `${r.x}px`; frameEl.style.top = `${r.y}px`;
      frameEl.style.width = `${r.w}px`; frameEl.style.height = `${r.h}px`;
      activeDropdown?.remove(); activeDropdown = null;
    });
    dropdown.style.left = `${state.position.x}px`; dropdown.style.top = `${state.position.y + 24}px`;
    (freeHost ?? containerEl)?.appendChild(dropdown);
    activeDropdown = dropdown;
    const onClickOutside = (ev: Event) => { if (!dropdown.contains(ev.target as Node)) { dropdown.remove(); activeDropdown = null; document.removeEventListener("click", onClickOutside, true); } };
    requestAnimationFrame(() => { document.addEventListener("click", onClickOutside, true); });
  }

  function applyArrange(preset: Preset): void {
    const host = freeHost ?? containerEl;
    if (!host) return;
    const cw = host.clientWidth || 400;
    const ch = host.clientHeight || 300;
    const rects = computeZonePreset(preset, currentEntries.length, { width: cw, height: ch });
    for (let i = 0; i < currentEntries.length; i++) {
      const rect = rects[i];
      if (!rect) continue;
      const state = entryState.get(currentEntries[i]!.key);
      if (state) {
        state.position = { x: rect.x, y: rect.y };
        state.size = { width: Math.max(MIN_WIDTH, rect.width), height: Math.max(MIN_HEIGHT, rect.height) };
        const el = frameElements.get(currentEntries[i]!.key);
        if (el) {
          el.style.left = `${state.position.x}px`;
          el.style.top = `${state.position.y}px`;
          el.style.width = `${state.size.width}px`;
          el.style.height = `${state.size.height}px`;
        }
      }
    }
  }

  function createFrame(entry: Entry): HTMLElement {
    let state = entryState.get(entry.key);
    if (!state) {
      const initial = initialState?.entries[entry.key];
      const meta = entry.meta?.free;
      if (initial) {
        state = { position: { ...initial.position }, size: { ...initial.size } };
      } else if (meta) {
        state = { position: { x: meta.x, y: meta.y }, size: { width: meta.width, height: meta.height } };
      } else {
        const cw = (freeHost ?? containerEl)?.clientWidth ?? 400;
        const ch = (freeHost ?? containerEl)?.clientHeight ?? 300;
        const _count = currentEntries.length || 1;
        const w = Math.max(MIN_WIDTH, Math.min(300, Math.round(cw * 0.6)));
        const h = Math.max(MIN_HEIGHT, Math.min(200, Math.round(ch * 0.6)));
        const offset = nextDefaultOffset * 30;
        state = { position: { x: 10 + offset, y: 10 + offset }, size: { width: w, height: h } };
        nextDefaultOffset++;
        if (!entry.meta) (entry as { meta?: unknown }).meta = {};
        entry.meta!.free = { x: state.position.x, y: state.position.y, width: state.size.width, height: state.size.height };
      }
      entryState.set(entry.key, state);
    }

    const frame = createFrameShell(entry.key, state.position, state.size);

    frame.addEventListener("pointerdown", () => {
      bringToFront(entry.key);
    }, { capture: true });

    const titlebar = createFrameTitlebar();

    injectFrameChrome(frame, titlebar, {
      onClose: () => { organiser.removeEntry(entry.key); },
      onPin: () => {
        const wasPinned = pinnedKeys.has(entry.key);
        if (wasPinned) { pinnedKeys.delete(entry.key); } else { pinnedKeys.add(entry.key); }
        updatePinVisual(frame, !wasPinned);
        applyZOrder();
      },
      onTitlebarDoubleClick: () => {
        const host = freeHost ?? containerEl;
        if (!host) return;
        const cw = host.clientWidth;
        const ch = host.clientHeight;
        state.position = { x: 0, y: 0 };
        state.size = { width: cw, height: ch };
        frame.style.left = "0px"; frame.style.top = "0px";
        frame.style.width = `${cw}px`; frame.style.height = `${ch}px`;
      },
    }, [
      { icon: "⊞", title: "Move & Resize", onClick: () => { showZonePicker(frame, entry.key, state); } },
    ]);

    wireTitlebarDrag(titlebar, frame, state,
      (k, x, y) => { callbacks?.onEntryMove?.(k, x, y); }, entry.key);

    const contentArea = document.createElement("div");
    contentArea.setAttribute("data-frame-content", "");
    contentArea.style.cssText = "flex:1;overflow:auto;";
    contentArea.appendChild(ensureContent(entry));

    frame.appendChild(titlebar);
    frame.appendChild(contentArea);

    createFrameResizeHandles(frame, state,
      (k, w, h) => { callbacks?.onEntryResize?.(k, w, h); }, entry.key);

    frameElements.set(entry.key, frame);
    return frame;
  }

  const organiser: LayoutStrategy = {
    type: "free",

    mount(container, entries, contentFactory) {
      containerEl = container;
      currentEntries = [...entries];
      factory = contentFactory;

      freeHost = document.createElement("div");
      freeHost.setAttribute("data-free-host", "");
      freeHost.style.cssText = "flex:1;position:relative;min-height:0;overflow:hidden;";
      container.appendChild(freeHost);

      if (zOrder.length === 0) {
        zOrder = entries.map((e) => e.key);
      }

      for (const entry of currentEntries) {
        freeHost.appendChild(createFrame(entry));
      }
      applyZOrder();

      let maxRight = 0;
      let maxBottom = 0;
      for (const state of entryState.values()) {
        const right = state.position.x + state.size.width;
        const bottom = state.position.y + state.size.height;
        if (right > maxRight) maxRight = right;
        if (bottom > maxBottom) maxBottom = bottom;
      }
      lastContainerSize = maxRight > 0 ? { width: maxRight + 20, height: maxBottom + 20 } : null;

      resizeObserver = new ResizeObserver((resizeEntries) => {
        for (const re of resizeEntries) {
          const { width, height } = re.contentRect;
          if (width > 0 && height > 0) handleResize(width, height);
        }
      });
      resizeObserver.observe(freeHost);

      dndHandler = createFreeLayoutDnd(freeHost, entryState, frameElements, {
        onDrop: (sourceContainer, tabKey, targetFrameKey, _x, _y) => {
          if (targetFrameKey) {
            const targetEntry = currentEntries.find(e => e.key === targetFrameKey);
            if (targetEntry?.childContainer === sourceContainer) return;
            const detached = sourceContainer.detachEntry(tabKey);
            if (!detached) return;
            if (targetEntry?.childContainer) {
              targetEntry.childContainer.addEntry(detached);
            }
          }
        },
        onEdgeSplit: (sourceContainer, tabKey, targetFrameKey, edge) => {
          const detached = sourceContainer.detachEntry(tabKey);
          if (!detached) return;
          const targetState = entryState.get(targetFrameKey);
          if (!targetState) return;
          const geo = splitGeometry(edge, {
            x: targetState.position.x,
            y: targetState.position.y,
            width: targetState.size.width,
            height: targetState.size.height,
          });
          targetState.position = geo.target.position;
          targetState.size = geo.target.size;
          const targetEl = frameElements.get(targetFrameKey);
          if (targetEl) {
            targetEl.style.left = `${geo.target.position.x}px`;
            targetEl.style.top = `${geo.target.position.y}px`;
            targetEl.style.width = `${geo.target.size.width}px`;
            targetEl.style.height = `${geo.target.size.height}px`;
          }
          if (!detached.meta) (detached as { meta?: unknown }).meta = {};
          detached.meta!.free = {
            x: geo.newFrame.position.x,
            y: geo.newFrame.position.y,
            width: geo.newFrame.size.width,
            height: geo.newFrame.size.height,
          };
          organiser.addEntry(detached);
        },
      });
    },

    unmount() {
      dndHandler?.dispose();
      dndHandler = null;
      if (activeDropdown) { activeDropdown.remove(); activeDropdown = null; }
      resizeObserver?.disconnect();
      resizeObserver = null;
      lastContainerSize = null;

      for (const entry of currentEntries) {
        const contentArea = frameElements
          .get(entry.key)
          ?.querySelector("[data-frame-content]");
        if (contentArea?.firstChild) {
          contentArea.removeChild(contentArea.firstChild);
        }
      }

      for (const el of frameElements.values()) el.remove();
      frameElements.clear();
      freeHost?.remove();
      freeHost = null;
      if (containerEl) containerEl.style.cssText = "";
      containerEl = null;
      factory = null;
    },

    addEntry(entry, _atIndex?) {
      currentEntries.push(entry);
      zOrder.push(entry.key);
      if (freeHost) {
        freeHost.appendChild(createFrame(entry));
      }
    },

    removeEntry(key) {
      const idx = currentEntries.findIndex((e) => e.key === key);
      if (idx === -1) return;

      const entry = currentEntries[idx]!;
      entry.contentDispose?.();
      delete entry.contentElement;
      delete entry.contentDispose;
      currentEntries.splice(idx, 1);

      frameElements.get(key)?.remove();
      frameElements.delete(key);
      entryState.delete(key);
      zOrder = zOrder.filter((k) => k !== key);

      callbacks?.onEntryClose?.(key);
    },

    detachEntry(key) {
      const idx = currentEntries.findIndex((e) => e.key === key);
      if (idx === -1) return null;
      const entry = currentEntries[idx]!;
      const frameEl = frameElements.get(key);
      if (frameEl) frameEl.remove();
      frameElements.delete(key);
      currentEntries.splice(idx, 1);
      zOrder = zOrder.filter(k => k !== key);
      return entry;
    },

    hideEntry(key) {
      const frameEl = frameElements.get(key);
      if (frameEl) frameEl.remove();
      frameElements.delete(key);
    },

    showEntry(key) {
      const entry = currentEntries.find(e => e.key === key);
      if (!entry || frameElements.has(key)) return;
      const host = freeHost ?? containerEl;
      if (!host || !factory) return;
      const frameEl = createFrame(entry);
      host.appendChild(frameEl);
    },

    getState(): FreeLayoutState {
      const entries: Record<string, FreeLayoutEntry> = {};
      for (const [key, state] of entryState) {
        entries[key] = {
          position: { ...state.position },
          size: { ...state.size },
        };
      }
      return { entries, zOrder: [...zOrder] };
    },

    restoreState() {},

    refreshEntry(key: string): void {
      const entry = currentEntries.find(e => e.key === key);
      if (!entry) return;
      const frameEl = frameElements.get(key);
      if (!frameEl) return;
      const contentArea = frameEl.querySelector("[data-frame-content]");
      if (!contentArea) return;
      if (entry.contentElement?.parentElement) {
        entry.contentElement.remove();
      }
      entry.contentDispose?.();
      entry.contentElement = undefined;
      entry.contentDispose = undefined;
      contentArea.appendChild(ensureContent(entry));
    },

    arrange(preset: string) {
      applyArrange(preset as Preset);
    },

    bringToFront(key: string) {
      bringToFront(key);
    },

    togglePin(key: string) {
      const wasPinned = pinnedKeys.has(key);
      if (wasPinned) pinnedKeys.delete(key);
      else pinnedKeys.add(key);
      const frameEl = frameElements.get(key);
      if (frameEl) updatePinVisual(frameEl, !wasPinned);
      applyZOrder();
    },

    dispose() {
      dndHandler?.dispose();
      dndHandler = null;
      resizeObserver?.disconnect();
      resizeObserver = null;
      lastContainerSize = null;
      for (const entry of currentEntries) {
        entry.contentDispose?.();
        entry.contentElement = undefined;
        entry.contentDispose = undefined;
      }
      organiser.unmount();
      currentEntries = [];
      entryState.clear();
      zOrder = [];
    },
  };

  return organiser;
}
