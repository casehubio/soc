import type { FloatingFrameEngine } from "./floating-frame-engine.js";
import type { Preset } from "./frame-organisers.js";

const PRESETS: Array<{ key: Preset; icon: string; title: string }> = [
  { key: "side-by-side", icon: "⬜⬜", title: "Side by side" },
  { key: "stacked", icon: "☰", title: "Stacked" },
  { key: "grid", icon: "⊞", title: "Grid" },
  { key: "main-sidebar", icon: "⬜▫", title: "Main + Sidebar" },
  { key: "focus", icon: "◻", title: "Focus" },
];

export function createOrganiserToolbar(
  engine: FloatingFrameEngine,
  overlayContainer: HTMLElement,
  parentEl: HTMLElement,
  signal: AbortSignal,
): HTMLElement {
  const toolbar = document.createElement("div");
  toolbar.className = "pages-organiser-toolbar";
  toolbar.dataset.floatingWorkspaceToolbar = "";
  toolbar.style.cssText = "display:none;padding:4px 8px;gap:4px;align-items:center;background:var(--pages-neutral-2);border-bottom:1px solid var(--pages-neutral-4);";

  let activePreset: string | null = null;

  for (const preset of PRESETS) {
    const btn = document.createElement("button");
    btn.dataset.preset = preset.key;
    btn.title = preset.title;
    btn.textContent = preset.icon;
    btn.style.cssText = "cursor:pointer;border:1px solid var(--pages-neutral-4);border-radius:var(--pages-radius-sm, 4px);background:transparent;padding:2px 6px;color:var(--pages-neutral-9);font-size:12px;";
    btn.addEventListener("click", () => {
      const canvasSize = { width: overlayContainer.clientWidth, height: overlayContainer.clientHeight };
      engine.applyOrganiser(preset.key, canvasSize);
      if (activePreset) {
        const prev = toolbar.querySelector(`[data-preset="${activePreset}"]`) as HTMLElement | null;
        if (prev) {
          prev.classList.remove("preset-active");
          prev.style.background = "transparent";
        }
      }
      btn.classList.add("preset-active");
      btn.style.background = "var(--pages-accent-3)";
      activePreset = preset.key;
      parentEl.dispatchEvent(new CustomEvent("pages-frame-organise", {
        bubbles: true, composed: true, detail: { preset: preset.key },
      }));
    }, { signal });
    toolbar.appendChild(btn);
  }

  function updateVisibility(): void {
    const visibleCount = [...engine.frames.values()].filter(f => !f.hidden).length;
    toolbar.style.display = visibleCount > 1 ? "flex" : "none";
  }

  for (const eventName of ["pages-frame-create", "pages-frame-close", "pages-frame-show", "pages-frame-hide"]) {
    parentEl.addEventListener(eventName, updateVisibility, { signal });
  }

  const observer = new MutationObserver(updateVisibility);
  observer.observe(parentEl, { childList: true, subtree: true });
  signal.addEventListener("abort", () => observer.disconnect());

  queueMicrotask(updateVisibility);

  return toolbar;
}
