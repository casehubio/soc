import { describe, it, expect, beforeEach } from "vitest";
import { EventRelay } from "./event-relay.js";

const RELAYED_EVENTS = [
  "pages-filter", "pages-sort", "pages-data-request", "pages-field-change",
  "pages-page", "pages-text-filter", "pages-record-navigate",
  "pages-record-create", "pages-record-delete", "pages-action-request",
  "pages-refresh-request", "pages-slot-change", "pages-dock-toggle",
  "pages-split-resize", "pages-event",
] as const;

describe("EventRelay", () => {
  let sourceDoc: Document;
  let targetEl: HTMLElement;

  beforeEach(() => {
    sourceDoc = document.implementation.createHTMLDocument("child");
    targetEl = document.createElement("div");
    document.body.appendChild(targetEl);
  });

  it("relays all 15 event types from source document to target element", () => {
    const relay = new EventRelay(sourceDoc, targetEl);
    relay.start();

    const received: string[] = [];
    for (const type of RELAYED_EVENTS) {
      targetEl.addEventListener(type, () => received.push(type));
    }

    for (const type of RELAYED_EVENTS) {
      sourceDoc.dispatchEvent(new CustomEvent(type, {
        bubbles: true, composed: true,
        detail: { test: type },
      }));
    }

    expect(received).toEqual([...RELAYED_EVENTS]);
  });

  it("preserves event detail", () => {
    const relay = new EventRelay(sourceDoc, targetEl);
    relay.start();

    let captured: unknown = null;
    targetEl.addEventListener("pages-filter", ((e: CustomEvent) => {
      captured = e.detail;
    }) as EventListener);

    sourceDoc.dispatchEvent(new CustomEvent("pages-filter", {
      bubbles: true, composed: true,
      detail: { column: "status", value: "active" },
    }));

    expect(captured).toEqual({ column: "status", value: "active" });
  });

  it("stops relaying after stop()", () => {
    const relay = new EventRelay(sourceDoc, targetEl);
    relay.start();

    let count = 0;
    targetEl.addEventListener("pages-filter", () => count++);

    sourceDoc.dispatchEvent(new CustomEvent("pages-filter", { bubbles: true, composed: true }));
    expect(count).toBe(1);

    relay.stop();
    sourceDoc.dispatchEvent(new CustomEvent("pages-filter", { bubbles: true, composed: true }));
    expect(count).toBe(1);
  });

  it("does not relay pages-panel-detach", () => {
    const relay = new EventRelay(sourceDoc, targetEl);
    relay.start();

    let received = false;
    targetEl.addEventListener("pages-panel-detach", () => { received = true; });

    sourceDoc.dispatchEvent(new CustomEvent("pages-panel-detach", { bubbles: true, composed: true }));
    expect(received).toBe(false);
  });

  it("is safe to call stop() multiple times", () => {
    const relay = new EventRelay(sourceDoc, targetEl);
    relay.start();
    relay.stop();
    expect(() => { relay.stop(); }).not.toThrow();
  });
});
