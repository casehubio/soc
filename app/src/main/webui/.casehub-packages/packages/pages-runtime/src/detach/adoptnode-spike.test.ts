import { describe, it, expect } from "vitest";
import { LitElement, html, css } from "lit";

class SpikeBadge extends LitElement {
  static override styles = css`:host { display: block; }`;
  static override properties = { label: { type: String } };
  declare label: string;
  constructor() {
    super();
    this.label = "";
  }
  override render() { return html`<span>${this.label}</span>`; }
}
if (!customElements.get("spike-badge")) {
  customElements.define("spike-badge", SpikeBadge);
}

describe("adoptNode spike — Lit across documents", () => {
  // jsdom limitation: adoptNode + appendChild to a different document does NOT
  // fire connectedCallback. In a real browser it does. These tests verify what
  // jsdom CAN validate: shadow root survival, property setters, and manual
  // lifecycle re-entry.

  it("shadow root survives adoption to another document", async () => {
    const el = document.createElement("spike-badge") as SpikeBadge;
    document.body.appendChild(el);
    el.label = "before";
    await el.updateComplete;
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot!.textContent).toContain("before");

    const newDoc = document.implementation.createHTMLDocument("child");
    const adopted = newDoc.adoptNode(el);
    newDoc.body.appendChild(adopted);

    expect(el.shadowRoot).not.toBeNull();
    expect(el.ownerDocument).toBe(newDoc);
  });

  it("property setter works after adoption and manual connectedCallback re-renders", async () => {
    const el = document.createElement("spike-badge") as SpikeBadge;
    document.body.appendChild(el);
    el.label = "before";
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain("before");

    const newDoc = document.implementation.createHTMLDocument("child");
    newDoc.body.appendChild(newDoc.adoptNode(el));

    // jsdom doesn't fire connectedCallback on cross-doc adopt+append.
    // Simulate what a real browser does:
    el.connectedCallback();

    el.label = "after";
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain("after");
  });

  // happy-dom cannot re-adopt a node back (Cannot redefine property: ownerDocument).
  // Real browsers handle this fine. Verify in Playwright (#94).
  it.skip("survives round-trip adoption back to original document", async () => {
    const el = document.createElement("spike-badge") as SpikeBadge;
    document.body.appendChild(el);
    el.label = "original";
    await el.updateComplete;

    const newDoc = document.implementation.createHTMLDocument("child");
    newDoc.body.appendChild(newDoc.adoptNode(el));
    el.connectedCallback();

    el.label = "detached";
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain("detached");

    document.body.appendChild(document.adoptNode(el));
    el.connectedCallback();

    el.label = "redocked";
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain("redocked");
  });

  it("disconnectedCallback fires when adopted out of source document", async () => {
    let disconnected = false;
    class SpikeDisconnect extends LitElement {
      override disconnectedCallback() { super.disconnectedCallback(); disconnected = true; }
      override render() { return html`<span>dc</span>`; }
    }
    if (!customElements.get("spike-disconnect")) {
      customElements.define("spike-disconnect", SpikeDisconnect);
    }

    const el = document.createElement("spike-disconnect") as SpikeDisconnect;
    document.body.appendChild(el);
    await el.updateComplete;

    const newDoc = document.implementation.createHTMLDocument("child");
    newDoc.adoptNode(el);

    expect(disconnected).toBe(true);
  });
});
