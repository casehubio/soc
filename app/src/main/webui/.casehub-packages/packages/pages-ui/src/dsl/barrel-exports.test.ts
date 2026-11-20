import { describe, it, expect } from "vitest";
import * as dsl from "./index.js";

describe("dsl barrel exports", () => {
  it("re-exports mutableRestSource from pages-data (#335)", () => {
    expect(typeof dsl.mutableRestSource).toBe("function");
  });

  it("exports schemaForm builder (#334)", () => {
    expect(typeof dsl.schemaForm).toBe("function");
  });

  it("exports actionButton builder (#336)", () => {
    expect(typeof dsl.actionButton).toBe("function");
  });

  it("exports formScope builder (#337)", () => {
    expect(typeof dsl.formScope).toBe("function");
  });

  it("exports all #317 builders", () => {
    expect(typeof dsl.heatmapChart).toBe("function");
    expect(typeof dsl.treemapChart).toBe("function");
    expect(typeof dsl.densityHeatmap).toBe("function");
    expect(typeof dsl.badge).toBe("function");
    expect(typeof dsl.countdown).toBe("function");
    expect(typeof dsl.timeline).toBe("function");
    expect(typeof dsl.graph).toBe("function");
    expect(typeof dsl.eventTimeline).toBe("function");
    expect(typeof dsl.masterDetail).toBe("function");
    expect(typeof dsl.schemaForm).toBe("function");
  });
});
