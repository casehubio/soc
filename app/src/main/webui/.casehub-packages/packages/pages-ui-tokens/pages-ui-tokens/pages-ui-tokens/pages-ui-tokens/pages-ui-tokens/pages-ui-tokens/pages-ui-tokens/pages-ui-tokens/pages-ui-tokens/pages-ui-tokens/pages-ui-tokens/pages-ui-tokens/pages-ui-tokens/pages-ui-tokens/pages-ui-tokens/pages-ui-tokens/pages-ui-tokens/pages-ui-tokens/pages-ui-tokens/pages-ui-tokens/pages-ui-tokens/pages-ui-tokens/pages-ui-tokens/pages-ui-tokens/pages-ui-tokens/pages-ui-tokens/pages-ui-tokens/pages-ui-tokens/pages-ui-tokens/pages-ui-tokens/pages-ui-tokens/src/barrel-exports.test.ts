import { describe, it, expect } from "vitest";
import * as tokens from "./index.js";

describe("pages-ui-tokens barrel exports", () => {
  it("exports theme functions and constants", () => {
    expect(typeof tokens.injectTheme).toBe("function");
    expect(typeof tokens.applyThemeMode).toBe("function");
    expect(typeof tokens.generateThemeCSS).toBe("function");
    expect(tokens.DEFAULT_THEME).toBeDefined();
    expect(tokens.DEFAULT_THEME).toHaveProperty("baseHue");
  });
});
