import { describe, it, expect, vi, afterEach } from "vitest";
import "./pages-submit-button.js";

describe("PagesSubmitButton", () => {
  let el: HTMLElement;

  afterEach(() => {
    el?.remove();
  });

  it("registers as custom element", () => {
    expect(customElements.get("pages-submit-button")).toBeDefined();
  });

  it("dispatches pages-form-submit with resolve on click", async () => {
    el = document.createElement("pages-submit-button");
    (el as any).label = "Submit";
    document.body.appendChild(el);
    await (el as any).updateComplete;

    const handler = vi.fn();
    el.addEventListener("pages-form-submit", handler);

    const btn = el.shadowRoot?.querySelector("button");
    btn?.click();

    expect(handler).toHaveBeenCalledTimes(1);
    const detail = handler.mock.calls[0][0].detail;
    expect(typeof detail.resolve).toBe("function");
  });

  it("enters loading state on click and exits on resolve", async () => {
    el = document.createElement("pages-submit-button");
    (el as any).label = "Submit";
    document.body.appendChild(el);
    await (el as any).updateComplete;

    let resolveRef: ((r: any) => void) | undefined;
    el.addEventListener("pages-form-submit", (e: Event) => {
      resolveRef = (e as CustomEvent).detail.resolve;
    });

    el.shadowRoot?.querySelector("button")?.click();
    await (el as any).updateComplete;

    expect(el.shadowRoot?.querySelector("button")?.getAttribute("aria-busy")).toBe("true");

    resolveRef?.({ success: true });
    await (el as any).updateComplete;

    expect(el.shadowRoot?.querySelector("button")?.getAttribute("aria-busy")).toBe("false");
  });

  it("disables click during loading", async () => {
    el = document.createElement("pages-submit-button");
    (el as any).label = "Submit";
    document.body.appendChild(el);
    await (el as any).updateComplete;

    const handler = vi.fn();
    el.addEventListener("pages-form-submit", handler);

    el.shadowRoot?.querySelector("button")?.click();
    el.shadowRoot?.querySelector("button")?.click();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("shows error message on failed resolve", async () => {
    el = document.createElement("pages-submit-button");
    (el as any).label = "Submit";
    document.body.appendChild(el);
    await (el as any).updateComplete;

    let resolveRef: ((r: any) => void) | undefined;
    el.addEventListener("pages-form-submit", (e: Event) => {
      resolveRef = (e as CustomEvent).detail.resolve;
    });

    el.shadowRoot?.querySelector("button")?.click();
    resolveRef?.({ success: false, error: "Validation failed" });
    await (el as any).updateComplete;

    const result = el.shadowRoot?.querySelector(".result-error");
    expect(result?.textContent?.trim()).toBe("Validation failed");
  });
});
