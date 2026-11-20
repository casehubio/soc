import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createAccordionStrategy } from "./accordion-strategy";
import type { Entry, ContentFactory, AccordionState } from "./types.js";

function testFactory(): ContentFactory {
  return (entry) => {
    const el = document.createElement("div");
    el.textContent = `Content: ${entry.key}`;
    el.dataset.testKey = entry.key;
    return { element: el, dispose: () => { el.remove(); } };
  };
}

function makeEntries(...keys: string[]): Entry[] {
  return keys.map((key) => ({ key, label: key.toUpperCase() }));
}

describe("AccordionOrganiser", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("mounts all sections expanded by default", () => {
    const org = createAccordionStrategy();
    org.mount(container, makeEntries("a", "b"), testFactory());

    const headers = container.querySelectorAll("[data-section-key]");
    expect(headers).toHaveLength(2);

    const contentA = container.querySelector("[data-test-key='a']");
    const contentB = container.querySelector("[data-test-key='b']");
    expect(contentA).not.toBeNull();
    expect(contentB).not.toBeNull();
  });

  it("collapses section on header click", () => {
    const org = createAccordionStrategy();
    org.mount(container, makeEntries("a", "b"), testFactory());

    const headerA = container.querySelector(
      "[data-section-key='a']",
    ) as HTMLElement;
    headerA.click();

    const contentA = container.querySelector("[data-test-key='a']");
    expect(contentA).toBeNull();
  });

  it("re-expands section — reattaches same element", () => {
    const org = createAccordionStrategy();
    const entries = makeEntries("a");
    org.mount(container, entries, testFactory());

    const original = container.querySelector("[data-test-key='a']")!;

    const header = container.querySelector(
      "[data-section-key='a']",
    ) as HTMLElement;
    header.click(); // collapse
    header.click(); // expand

    const reattached = container.querySelector("[data-test-key='a']")!;
    expect(reattached).toBe(original);
  });

  it("unmount detaches content, preserves on entries", () => {
    const org = createAccordionStrategy();
    const entries = makeEntries("a", "b");
    org.mount(container, entries, testFactory());

    const contentA = container.querySelector("[data-test-key='a']")!;
    org.unmount();

    expect(container.children).toHaveLength(0);
    expect(entries[0]!.contentElement).toBe(contentA);
  });

  it("returns correct state with collapsed keys", () => {
    const org = createAccordionStrategy();
    org.mount(container, makeEntries("a", "b"), testFactory());

    const header = container.querySelector(
      "[data-section-key='a']",
    ) as HTMLElement;
    header.click();

    const state = org.getState() as AccordionState;
    expect(state.collapsed).toContain("a");
    expect(state.collapsed).not.toContain("b");
  });

  it("addEntry appends a new section", () => {
    const org = createAccordionStrategy();
    org.mount(container, makeEntries("a"), testFactory());

    org.addEntry({ key: "b", label: "B" });

    const headers = container.querySelectorAll("[data-section-key]");
    expect(headers).toHaveLength(2);
  });

  it("removeEntry removes section and disposes content", () => {
    const org = createAccordionStrategy();
    org.mount(container, makeEntries("a", "b"), testFactory());

    org.removeEntry("a");

    const headers = container.querySelectorAll("[data-section-key]");
    expect(headers).toHaveLength(1);
    expect(headers[0]!.getAttribute("data-section-key")).toBe("b");
  });
});
