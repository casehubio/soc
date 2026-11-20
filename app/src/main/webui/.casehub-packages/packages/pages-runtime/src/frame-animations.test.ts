import { describe, it, expect, afterEach } from "vitest";
import { injectAnimationStyles, animateFrameEnter, animateFrameExit } from "./frame-animations.js";

describe("injectAnimationStyles", () => {
  afterEach(() => {
    document.querySelector("[data-pages-frame-animations]")?.remove();
  });

  it("injects style element with marker", () => {
    injectAnimationStyles();
    const style = document.querySelector("[data-pages-frame-animations]");
    expect(style).not.toBeNull();
    expect(style!.textContent).toContain("frame-enter");
    expect(style!.textContent).toContain("frame-exit");
    expect(style!.textContent).toContain("prefers-reduced-motion");
  });

  it("is idempotent", () => {
    injectAnimationStyles();
    injectAnimationStyles();
    expect(document.querySelectorAll("[data-pages-frame-animations]").length).toBe(1);
  });
});

describe("animateFrameEnter", () => {
  it("adds frame-entering class", () => {
    const el = document.createElement("div");
    animateFrameEnter(el);
    expect(el.classList.contains("frame-entering")).toBe(true);
  });

  it("removes class on animationend", () => {
    const el = document.createElement("div");
    animateFrameEnter(el);
    el.dispatchEvent(new Event("animationend"));
    expect(el.classList.contains("frame-entering")).toBe(false);
  });
});

describe("animateFrameExit", () => {
  it("adds frame-exiting class", () => {
    const el = document.createElement("div");
    const _promise = animateFrameExit(el);
    expect(el.classList.contains("frame-exiting")).toBe(true);
  });

  it("resolves after animationend", async () => {
    const el = document.createElement("div");
    const promise = animateFrameExit(el);
    el.dispatchEvent(new Event("animationend"));
    await promise;
  });
});
