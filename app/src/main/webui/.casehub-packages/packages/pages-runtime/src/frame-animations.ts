const CSS_MARKER = "data-pages-frame-animations";

const ANIMATION_CSS = `
@keyframes frame-enter {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes frame-exit {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.95); }
}
.frame-entering {
  animation: frame-enter var(--pages-frame-transition-duration, 200ms) ease forwards;
}
.frame-exiting {
  animation: frame-exit var(--pages-frame-transition-duration, 200ms) ease forwards;
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .frame-entering, .frame-exiting { animation: none; }
}
`;

let prefersReducedMotion: MediaQueryList | null = null;

function reducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (!prefersReducedMotion) {
    prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  }
  return prefersReducedMotion.matches;
}

export function injectAnimationStyles(): void {
  if (document.querySelector(`[${CSS_MARKER}]`)) return;
  const style = document.createElement("style");
  style.setAttribute(CSS_MARKER, "");
  style.textContent = ANIMATION_CSS;
  document.head.appendChild(style);
}

export function animateFrameEnter(el: HTMLElement): void {
  if (reducedMotion()) return;
  el.classList.add("frame-entering");
  el.addEventListener("animationend", () => { el.classList.remove("frame-entering"); }, { once: true });
}

export function animateFrameExit(el: HTMLElement): Promise<void> {
  if (reducedMotion()) return Promise.resolve();
  el.classList.add("frame-exiting");
  return new Promise(resolve => {
    el.addEventListener("animationend", () => { resolve(); }, { once: true });
  });
}

export function animateFrameMove(
  el: HTMLElement,
  from: { x: number; y: number; w: number; h: number },
  to: { x: number; y: number; w: number; h: number },
): void {
  if (reducedMotion()) return;
  if (typeof el.animate !== "function") return;
  const duration = parseInt(getComputedStyle(el).getPropertyValue("--pages-frame-transition-duration") || "200");
  el.animate(
    [
      { left: `${from.x}px`, top: `${from.y}px`, width: `${from.w}px`, height: `${from.h}px` },
      { left: `${to.x}px`, top: `${to.y}px`, width: `${to.w}px`, height: `${to.h}px` },
    ],
    { duration, easing: "ease" },
  );
}
