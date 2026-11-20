export interface FrameChromeCallbacks {
  readonly onClose: () => void;
  readonly onPin: () => void;
  readonly onDetach?: (() => void) | undefined;
  readonly onTitlebarDoubleClick: () => void;
  readonly onAddTab?: (() => void) | undefined;
  readonly onViewModeToggle?: (() => void) | undefined;
}

export interface ChromeExtraButton {
  readonly icon: string;
  readonly title: string;
  readonly className?: string | undefined;
  readonly onClick: () => void;
}

const DC = (...args: unknown[]) => { console.debug("[compositor:chrome]", ...args); };

export function injectFrameChrome(
  groupEl: HTMLElement,
  titlebar: HTMLElement,
  callbacks: FrameChromeCallbacks,
  extraButtons: readonly ChromeExtraButton[],
): void {
  const closeDot = document.createElement("span");
  closeDot.className = "frame-close-dot";
  closeDot.style.cssText = "width:12px;height:12px;border-radius:50%;background:#ff5f57;cursor:pointer;display:inline-block;margin:0 4px;";
  closeDot.addEventListener("pointerdown", (e) => { e.stopPropagation(); });
  closeDot.addEventListener("click", () => { DC("button:close"); callbacks.onClose(); });

  const pinBtn = document.createElement("span");
  pinBtn.className = "frame-pin-btn";
  pinBtn.textContent = "\u{1F4CC}";
  pinBtn.style.cssText = "cursor:pointer;margin:0 4px;font-size:12px;opacity:0.5;";
  pinBtn.setAttribute("aria-pressed", "false");
  pinBtn.addEventListener("pointerdown", (e) => { e.stopPropagation(); });
  pinBtn.addEventListener("click", () => { DC("button:pin"); callbacks.onPin(); });

  titlebar.prepend(pinBtn);
  titlebar.prepend(closeDot);

  if (callbacks.onDetach) {
    const detachDot = document.createElement("span");
    detachDot.className = "frame-detach-dot";
    detachDot.style.cssText = "width:12px;height:12px;border-radius:50%;background:#ff5f57;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;margin:0 4px;font-size:7px;color:#fff;line-height:1;";
    detachDot.textContent = "↗";
    detachDot.title = "Pop out to new window";
    detachDot.addEventListener("pointerdown", (e) => { e.stopPropagation(); });
    detachDot.addEventListener("click", () => { DC("button:detach"); callbacks.onDetach!(); });
    titlebar.insertBefore(detachDot, pinBtn.nextSibling);
  }

  titlebar.addEventListener("dblclick", (e: Event) => {
    if ((e.target as HTMLElement).closest(".frame-close-dot, .frame-detach-dot, .frame-pin-btn, .frame-extra-btn")) return;
    callbacks.onTitlebarDoubleClick();
  });

  const actionBar = document.createElement("div");
  actionBar.className = "frame-action-bar";
  actionBar.style.cssText = "position:absolute;top:0;right:0;z-index:1;display:flex;align-items:center;gap:2px;padding:2px 4px;opacity:0;transition:opacity 0.15s;";

  if (!groupEl.style.position || groupEl.style.position === "static") {
    groupEl.style.position = "relative";
  }
  groupEl.appendChild(actionBar);

  groupEl.addEventListener("mouseenter", () => { actionBar.style.opacity = "1"; });
  groupEl.addEventListener("mouseleave", () => { actionBar.style.opacity = "0"; });

  for (const btnConfig of extraButtons) {
    const btn = document.createElement("span");
    btn.className = `frame-extra-btn${btnConfig.className ? ` ${btnConfig.className}` : ""}`;
    btn.textContent = btnConfig.icon;
    btn.title = btnConfig.title;
    btn.style.cssText = "cursor:pointer;margin:0 4px;font-size:12px;";
    btn.addEventListener("pointerdown", (e) => { e.stopPropagation(); });
    btn.addEventListener("click", btnConfig.onClick);
    titlebar.appendChild(btn);
  }
}

export function updatePinVisual(
  resizeContainer: HTMLElement,
  pinned: boolean,
): void {
  const titlebar = resizeContainer.querySelector(
    "[data-frame-titlebar]",
  ) as HTMLElement | null;
  if (titlebar) {
    const existingHandler = (titlebar as any).__pinDragLock as ((e: PointerEvent) => void) | undefined;
    if (pinned && !existingHandler) {
      const handler = (e: PointerEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest(".frame-close-dot, .frame-pin-btn, .frame-extra-btn")) return;
        e.stopPropagation();
      };
      titlebar.addEventListener("pointerdown", handler, { capture: true });
      (titlebar as any).__pinDragLock = handler;
    } else if (!pinned && existingHandler) {
      titlebar.removeEventListener("pointerdown", existingHandler, { capture: true });
      delete (titlebar as any).__pinDragLock;
    }
  }

  const pinBtn = resizeContainer.querySelector(".frame-pin-btn") as HTMLElement | null;
  if (pinBtn) {
    pinBtn.style.opacity = pinned ? "1" : "0.5";
    pinBtn.setAttribute("aria-pressed", String(pinned));
    pinBtn.classList.toggle("frame-pin-active", pinned);
  }
}
