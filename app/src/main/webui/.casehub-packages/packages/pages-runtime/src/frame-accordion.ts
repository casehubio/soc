import type { FrameTabConfig, ContentFactory, ContentFactoryResult } from "@casehubio/pages-component";

export interface AccordionState {
  readonly collapsed: readonly string[];
  readonly heights: Readonly<Record<string, number>>;
}

export interface AccordionHandle {
  dispose(): void;
  getState(): AccordionState;
  onStateChange(cb: (state: AccordionState) => void): void;
  onSectionClose(cb: (key: string) => void): void;
  addSection(tab: FrameTabConfig): void;
  removeSection(key: string): void;
}

export function renderAccordion(
  tabs: readonly FrameTabConfig[],
  container: HTMLElement,
  contentFactory: ContentFactory,
  options?: {
    collapsed?: readonly string[];
    heights?: Readonly<Record<string, number>>;
    signal?: AbortSignal;
  },
): AccordionHandle {
  const collapsedSet = new Set(options?.collapsed ?? []);
  const heights: Record<string, number> = { ...(options?.heights ?? {}) };
  const stateCallbacks: Array<(state: AccordionState) => void> = [];
  const closeCallbacks: Array<(key: string) => void> = [];
  const contentResults = new Map<string, ContentFactoryResult>();
  const sectionElements: HTMLElement[] = [];

  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.height = "100%";
  container.style.overflow = "auto";

  function emitState(): void {
    const state: AccordionState = { collapsed: [...collapsedSet], heights: { ...heights } };
    for (const cb of stateCallbacks) cb(state);
  }

  function recalcStyles(): void {
    for (const section of sectionElements) {
      const key = section.dataset.accordionSection!;
      if (collapsedSet.has(key)) {
        section.style.cssText = "flex:0 0 auto;";
      } else if (heights[key]) {
        section.style.cssText = `flex:0 0 ${heights[key]}px;display:flex;flex-direction:column;min-height:0;overflow:hidden;`;
      } else {
        section.style.cssText = "flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden;";
      }
    }
  }

  function createSection(tab: FrameTabConfig): HTMLElement {
    const section = document.createElement("div");
    section.dataset.accordionSection = tab.key;

    const header = document.createElement("div");
    header.dataset.accordionHeader = tab.key;
    header.style.cssText = "padding:4px 8px;cursor:pointer;user-select:none;background:var(--pages-neutral-3, #333);border-bottom:1px solid var(--pages-neutral-4, #444);font-size:12px;display:flex;align-items:center;gap:4px;flex-shrink:0;";

    const chevron = document.createElement("span");
    chevron.textContent = collapsedSet.has(tab.key) ? "▶" : "▼";
    chevron.style.cssText = "font-size:10px;";
    header.appendChild(chevron);

    const label = document.createElement("span");
    label.textContent = tab.label;
    header.appendChild(label);

    const headerSpacer = document.createElement("span");
    headerSpacer.style.cssText = "flex:1;";
    header.appendChild(headerSpacer);

    const closeBtn = document.createElement("span");
    closeBtn.dataset.accordionClose = tab.key;
    closeBtn.textContent = "✕";
    closeBtn.title = "Close section";
    closeBtn.style.cssText = "cursor:pointer;font-size:11px;opacity:0;padding:0 4px;";
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      for (const cb of closeCallbacks) cb(tab.key);
    });
    header.appendChild(closeBtn);

    header.addEventListener("mouseenter", () => { closeBtn.style.opacity = "0.6"; });
    header.addEventListener("mouseleave", () => { closeBtn.style.opacity = "0"; });

    section.appendChild(header);

    const content = document.createElement("div");
    content.dataset.accordionContent = tab.key;
    content.style.cssText = "flex:1;overflow:hidden;position:relative;min-height:0;display:flex;flex-direction:column;";
    section.appendChild(content);

    if (!collapsedSet.has(tab.key)) {
      const result = contentFactory(tab);
      content.appendChild(result.element);
      contentResults.set(tab.key, result);
    } else {
      content.style.display = "none";
    }

    header.addEventListener("click", () => {
      if (collapsedSet.has(tab.key)) {
        collapsedSet.delete(tab.key);
        chevron.textContent = "▼";
        content.style.display = "";
        if (!contentResults.has(tab.key)) {
          const result = contentFactory(tab);
          content.appendChild(result.element);
          contentResults.set(tab.key, result);
        }
        section.style.cssText = "flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden;";
      } else {
        collapsedSet.add(tab.key);
        chevron.textContent = "▶";
        content.style.display = "none";
        const result = contentResults.get(tab.key);
        if (result) {
          result.dispose?.();
          contentResults.delete(tab.key);
          content.innerHTML = "";
        }
        section.style.cssText = "flex:0 0 auto;";
      }
      emitState();
    });

    return section;
  }

  for (const tab of tabs) {
    const section = createSection(tab);
    sectionElements.push(section);
    container.appendChild(section);
  }

  recalcStyles();

  const handle: AccordionHandle = {
    dispose() {
      for (const result of contentResults.values()) result.dispose?.();
      contentResults.clear();
      container.innerHTML = "";
      sectionElements.length = 0;
    },
    getState() {
      return { collapsed: [...collapsedSet], heights: { ...heights } };
    },
    onStateChange(cb) {
      stateCallbacks.push(cb);
    },
    onSectionClose(cb) {
      closeCallbacks.push(cb);
    },
    addSection(tab: FrameTabConfig) {
      if (sectionElements.some(s => s.dataset.accordionSection === tab.key)) return;
      const section = createSection(tab);
      sectionElements.push(section);
      container.appendChild(section);
      recalcStyles();
    },
    removeSection(key: string) {
      const idx = sectionElements.findIndex(s => s.dataset.accordionSection === key);
      if (idx === -1) return;
      const section = sectionElements[idx]!;
      const result = contentResults.get(key);
      if (result) { result.dispose?.(); contentResults.delete(key); }
      collapsedSet.delete(key);
      section.remove();
      sectionElements.splice(idx, 1);
      recalcStyles();
      emitState();
    },
  };

  if (options?.signal) {
    options.signal.addEventListener("abort", () => { handle.dispose(); }, { once: true });
  }

  return handle;
}
