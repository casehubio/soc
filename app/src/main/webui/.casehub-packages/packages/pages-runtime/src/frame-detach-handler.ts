import type { ContentFactory, FrameTabConfig } from "@casehubio/pages-component";
import type { Container, FreeLayoutState } from "./frame-sandbox/types.js";
import { EventRelay } from "./detach/event-relay.js";
import { copyStyles } from "./detach/copy-styles.js";

export interface FrameDetachHandler {
  detach(frameKey: string): void;
  reattach(frameKey: string): void;
  dispose(): void;
}

interface DetachedFrame {
  childWindow: Window;
  eventRelay: EventRelay;
  pollTimer: ReturnType<typeof setInterval>;
}

export function createFrameDetachHandler(
  rootContainer: Container,
  container: HTMLElement,
  contentFactory: ContentFactory,
  signal: AbortSignal,
): FrameDetachHandler {
  const detachedFrames = new Map<string, DetachedFrame>();

  function detach(frameKey: string): void {
    const entry = rootContainer.entries.find(e => e.key === frameKey);
    if (!entry) return;

    const state = rootContainer.organiser.getState() as FreeLayoutState;
    const entryLayout = state.entries[frameKey];
    const width = entryLayout?.size.width ?? 400;
    const height = entryLayout?.size.height ?? 300;

    rootContainer.organiser.hideEntry?.(frameKey);

    const win = window.open("", "_blank", `width=${String(width)},height=${String(height)}`);
    if (!win) {
      rootContainer.organiser.showEntry?.(frameKey);
      console.warn("Popup blocked — allow popups to detach frames.");
      return;
    }

    copyStyles(document, win.document);
    win.document.title = entry.label;
    win.document.body.style.margin = "0";
    win.document.body.style.width = "100%";
    win.document.body.style.height = "100vh";
    win.document.body.style.overflow = "auto";

    const tabs: FrameTabConfig[] = entry.childContainer
      ? entry.childContainer.entries.map(e => ({ key: e.key, label: e.label, content: e.component ?? null }))
      : entry.component ? [{ key: entry.key, label: entry.label, content: entry.component }] : [];
    for (const tab of tabs) {
      const result = contentFactory(tab);
      win.document.body.appendChild(win.document.adoptNode(result.element));
    }

    const reattachBtn = win.document.createElement("button");
    reattachBtn.textContent = "⏎ Reattach";
    reattachBtn.style.cssText = "position:fixed;top:8px;right:8px;z-index:99999;cursor:pointer;padding:4px 12px;border:1px solid var(--pages-neutral-4, #ccc);border-radius:4px;background:var(--pages-neutral-2, #f5f5f5);font-size:12px;";
    reattachBtn.addEventListener("click", () => { reattach(frameKey); });
    win.document.body.appendChild(reattachBtn);

    const eventRelay = new EventRelay(win.document, container);
    eventRelay.start();

    win.addEventListener("beforeunload", () => { reattach(frameKey); });
    const pollTimer = setInterval(() => {
      if (win.closed) reattach(frameKey);
    }, 500);

    detachedFrames.set(frameKey, { childWindow: win, eventRelay, pollTimer });

    container.dispatchEvent(new CustomEvent("pages-frame-detach", {
      bubbles: true, composed: true, detail: { frameKey },
    }));

    win.focus();
  }

  function reattach(frameKey: string): void {
    const entry = detachedFrames.get(frameKey);
    if (!entry) return;
    detachedFrames.delete(frameKey);

    entry.eventRelay.stop();
    clearInterval(entry.pollTimer);

    if (!entry.childWindow.closed) entry.childWindow.close();

    rootContainer.organiser.showEntry?.(frameKey);

    container.dispatchEvent(new CustomEvent("pages-frame-reattach", {
      bubbles: true, composed: true, detail: { frameKey },
    }));
  }

  function dispose(): void {
    for (const [key] of detachedFrames) reattach(key);
  }

  signal.addEventListener("abort", dispose);

  return { detach, reattach, dispose };
}
