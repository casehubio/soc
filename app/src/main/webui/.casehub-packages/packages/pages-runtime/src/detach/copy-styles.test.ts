import { describe, it, expect } from "vitest";
import { copyStyles } from "./copy-styles.js";

describe("copyStyles", () => {
  it("clones style elements from source to target head", () => {
    const source = document.implementation.createHTMLDocument("source");
    const target = document.implementation.createHTMLDocument("target");

    const style = source.createElement("style");
    style.textContent = ":root { --pages-accent-9: #5470c6; }";
    source.head.appendChild(style);

    copyStyles(source, target);

    const cloned = target.head.querySelectorAll("style");
    expect(cloned.length).toBe(1);
    expect(cloned[0]!.textContent).toBe(":root { --pages-accent-9: #5470c6; }");
  });

  it("clones link elements from source to target head", () => {
    const source = document.implementation.createHTMLDocument("source");
    const target = document.implementation.createHTMLDocument("target");

    const link = source.createElement("link");
    link.rel = "stylesheet";
    link.href = "/styles/theme.css";
    source.head.appendChild(link);

    copyStyles(source, target);

    const cloned = target.head.querySelectorAll("link[rel='stylesheet']");
    expect(cloned.length).toBe(1);
    expect(cloned[0]!.getAttribute("href")).toBe("/styles/theme.css");
  });

  it("handles empty head gracefully", () => {
    const source = document.implementation.createHTMLDocument("source");
    const target = document.implementation.createHTMLDocument("target");

    expect(() => { copyStyles(source, target); }).not.toThrow();
  });

  it("replaces existing styles on repeated calls", () => {
    const source = document.implementation.createHTMLDocument("source");
    const target = document.implementation.createHTMLDocument("target");

    const style = source.createElement("style");
    style.textContent = ":root { --x: 1; }";
    source.head.appendChild(style);

    copyStyles(source, target);
    copyStyles(source, target);

    expect(target.head.querySelectorAll("style").length).toBe(1);
  });

  it("copies multiple styles and links together", () => {
    const source = document.implementation.createHTMLDocument("source");
    const target = document.implementation.createHTMLDocument("target");

    const s1 = source.createElement("style");
    s1.textContent = ":root { --a: 1; }";
    source.head.appendChild(s1);

    const s2 = source.createElement("style");
    s2.textContent = ":root { --b: 2; }";
    source.head.appendChild(s2);

    const link = source.createElement("link");
    link.rel = "stylesheet";
    link.href = "/fonts.css";
    source.head.appendChild(link);

    copyStyles(source, target);

    expect(target.head.querySelectorAll("style").length).toBe(2);
    expect(target.head.querySelectorAll("link[rel='stylesheet']").length).toBe(1);
  });
});
