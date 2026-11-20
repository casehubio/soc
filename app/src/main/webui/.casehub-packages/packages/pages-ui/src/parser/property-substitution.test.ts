import { describe, it, expect } from "vitest";
import { substituteProperties } from "./property-substitution.js";

describe("substituteProperties", () => {
  it("replaces ${name} in string values", () => {
    const result = substituteProperties(
      { pages: [{ components: [{ html: "Hello ${name}" }] }] },
      { name: "World" },
    ) as Record<string, unknown>;
    const pages = result.pages as Record<string, unknown>[];
    const components = pages[0]!.components as Record<string, unknown>[];
    expect(components[0]!.html).toBe("Hello World");
  });

  it("replaces in nested objects", () => {
    const result = substituteProperties(
      { url: "https://api.com/${endpoint}" },
      { endpoint: "users" },
    ) as Record<string, unknown>;
    expect(result.url).toBe("https://api.com/users");
  });

  it("skips metric template fields (html.html and html.javascript)", () => {
    const input = {
      displayer: {
        type: "METRIC",
        html: {
          html: "<div>${value}</div>",
          javascript: "${this}.style.color = 'red'",
        },
      },
    };
    const result = substituteProperties(input, { value: "SHOULD_NOT_REPLACE" }) as Record<string, unknown>;
    const displayer = result.displayer as Record<string, unknown>;
    const htmlBlock = displayer.html as Record<string, unknown>;
    expect(htmlBlock.html).toBe("<div>${value}</div>");
    expect(htmlBlock.javascript).toBe(
      "${this}.style.color = 'red'",
    );
  });

  it("leaves non-matching ${...} intact", () => {
    const result = substituteProperties(
      { text: "Hello ${unknown}" },
      { name: "World" },
    ) as Record<string, unknown>;
    expect(result.text).toBe("Hello ${unknown}");
  });

  it("handles multiple substitutions in one string", () => {
    const result = substituteProperties(
      { text: "${greeting} ${name}!" },
      { greeting: "Hello", name: "World" },
    ) as Record<string, unknown>;
    expect(result.text).toBe("Hello World!");
  });

  it("handles primitives (numbers, booleans, null)", () => {
    const result = substituteProperties(
      { num: 42, bool: true, nul: null },
      { x: "y" },
    );
    expect(result).toEqual({ num: 42, bool: true, nul: null });
  });

  it("handles arrays of primitives", () => {
    const result = substituteProperties(
      { items: ["${prefix}_a", "${prefix}_b", 123] },
      { prefix: "test" },
    ) as Record<string, unknown>;
    expect(result.items).toEqual(["test_a", "test_b", 123]);
  });

  it("preserves empty properties map", () => {
    const result = substituteProperties({ text: "${name}" }, {}) as Record<string, unknown>;
    expect(result.text).toBe("${name}");
  });

  it("handles nested arrays", () => {
    const result = substituteProperties(
      { matrix: [["${a}", "${b}"], ["${c}"]] },
      { a: "1", b: "2", c: "3" },
    ) as Record<string, unknown>;
    expect(result.matrix).toEqual([["1", "2"], ["3"]]);
  });

  it("handles deeply nested metric templates", () => {
    const input = {
      pages: [
        {
          components: [
            {
              displayer: {
                html: {
                  html: "<span>${value}</span>",
                  javascript: "console.log(${this})",
                },
              },
            },
          ],
        },
      ],
    };
    const result = substituteProperties(input, { value: "NOPE" }) as Record<string, unknown>;
    const pages = result.pages as Record<string, unknown>[];
    const components = pages[0]!.components as Record<string, unknown>[];
    const displayer = components[0]!.displayer as Record<string, unknown>;
    const htmlBlock = displayer.html as Record<string, unknown>;
    expect(htmlBlock.html).toBe("<span>${value}</span>");
    expect(htmlBlock.javascript).toBe("console.log(${this})");
  });
});
